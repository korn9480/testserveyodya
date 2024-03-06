import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import { Activity } from './entities/activity.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { JoinActivityDto } from './dto/join-activity.dto';
import { JoinActivity } from './entities/joinActivities.entity';
import { ActivityType } from './entities/activity-type.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ActivityService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    @InjectRepository(JoinActivity)
    private readonly joinRepository: Repository<JoinActivity>,
    private connection: Connection,
    @InjectRepository(ActivityType)
    private readonly aTypeRepostiory:Repository<ActivityType>
  ) {

  }
  async onApplicationBootstrap(){
    const listData:string[] = ['user','club']
    const dataNow = await this.aTypeRepostiory.find()
    if (dataNow.length==0){
      for(let i of listData){
        let type = this.aTypeRepostiory.create()
        type.nameType = i
  
        await this.aTypeRepostiory.save(type)
      }
    }
  }
  private activityIsNotPass(dateEndActivity:Date){
    let dateNow =new Date()
    let acttivty =new Date(dateEndActivity)
    return dateNow.getTime() < acttivty.getTime()
  }

  // method of join activity
  async findJoinActivityOne(form: JoinActivityDto) {
    const data = await this.connection
      .createQueryBuilder(JoinActivity, 'jac')
      .andWhere(
        `jac.activity = ${form.activity} AND jac.student = ${form.student} AND jac.isJoin = true`,
      )
      .getOne();
    return data;
  }

  async getPerPloJoin(id: number): Promise<JoinActivity[]> {
    if (id==undefined){
      return []
    }
    const data = await this.joinRepository.find({
      where: { activity: { id: id }, isJoin: true },
      relations: ['student','activity'],
    });
    return data;
  }

  async getListNameJoinAcitivty(idActivity: number): Promise<JoinActivity[]> {
    return await this.joinRepository
      .createQueryBuilder('joinActivity')
      .leftJoinAndSelect('joinActivity.student', 'student')
      .leftJoinAndSelect('joinActivity.activity', 'activity')
      .leftJoinAndSelect('student.allergies', 'allergy')
      .where(`activity.id= ${idActivity}`)
      .getMany();
  }

  async joinActivity(form: JoinActivityDto, idActivity: number) {
    const perplo = await this.getPerPloJoin(idActivity);
    const activity = await this.findOne(idActivity);
    if (perplo.length < activity.participants) {
      for (const p of perplo) {
        if (p.student.code_student == form.student) {
          throw new ForbiddenException('you join activity');
        }
      }
      activity.number_pp = activity.number_pp + 1
      await this.activityRepository.save(activity)
      const newJoin = this.joinRepository.create(form);
      return await this.joinRepository.save(newJoin);
    } else {
      throw new ForbiddenException('perplo join full');
    }
  }

  async cancelActivity(form: JoinActivityDto,idActivity:number) {
    const result = await this.findJoinActivityOne(form);
    if (!result) {
      throw new NotFoundException(
        `not join activity with ID ${form.activity} not found`,
      );
    }
    const activity = await this.findOne(idActivity);
    activity.number_pp -= 1
    await this.activityRepository.save(activity)
    return await this.joinRepository.delete(result.id);
  }
  async deleteJoinActivity(idJoin:number){
    return await this.joinRepository.delete(idJoin)
  }
  async findPerploJoin(idActivity: number, codeStudent: string) {
    const data = await this.findOne(idActivity);
    const perplo = await this.getPerPloJoin(idActivity);
    let isJoin = false;
    for (const d of perplo) {
      if (d.student.code_student == codeStudent) {
        isJoin = true;
      }
    }
    return {
      nameActivity: data.nameActivity,
      dateTimeEnd: data.dateTimeEnd,
      dateTimeStart: data.dateTimeStart,
      location: data.location,
      participants: data.participants,
      numberPP: perplo.length,
      isJoin: isJoin,
    };
  }
  // method of activity
  async create(createActivityDto: CreateActivityDto){
    const newActivity = this.activityRepository.create(createActivityDto);
    newActivity.is_open_join = this.activityIsNotPass(createActivityDto.dateTimeEnd)
    return await this.activityRepository.save(newActivity);
  }

  async findAll(): Promise<Activity[]> {
    return await this.activityRepository.find();
  }

  async findOne(id: number): Promise<Activity> {
    const activity = await this.activityRepository.findOne({
      where: { id: id },
      relations: ['addBy', 'type', 'asset'],
    });
    if (!activity) {
      throw new NotFoundException(`Activity with ID ${id} not found`);
    }
    return activity;
    
  }
  async findOpenJoin(): Promise<Activity[]> {
    const activitys = await this.activityRepository
      .createQueryBuilder('ac')
      .innerJoinAndSelect('ac.addBy', 'user')
      .innerJoinAndSelect('ac.type', 'ActivityType')
      .leftJoinAndSelect('ac.asset', 'asset')
      .where('ac.is_open_join = true')
      .andWhere(`ac.dateTimeStart >= CURRENT_DATE()`)
      .orderBy('ac.type', 'DESC')
      .addOrderBy('ac.dateTimeCreated', 'DESC')
      .getMany();
    for (const activity of activitys) {
      if (activity.type.id == 2) {
        activity.addBy.first_name = 'ชมรม';
        activity.addBy.last_name = 'ยอดหญ้าบนภูสูง';
      }
    }
    return activitys;
  }

  async findClub() {
    const activitys = await this.activityRepository
      .createQueryBuilder('ac')
      .innerJoinAndSelect('ac.addBy', 'user')
      .innerJoinAndSelect('ac.type', 'ActivityType')
      .leftJoinAndSelect('ac.asset', 'asset')
      .where(`ac.is_open_join = true AND ac.type = 2`)
      .orderBy('ac.type', 'DESC')
      .addOrderBy('ac.dateTimeCreated', 'DESC')
      .getMany();
    return activitys;
  }

  async findUserOpenJoin():Promise<Activity[]>{
    return await this.activityRepository
      .createQueryBuilder('ac')
      .innerJoinAndSelect('ac.addBy', 'user')
      .innerJoinAndSelect('ac.type', 'ActivityType')
      .leftJoinAndSelect('ac.asset', 'asset')
      .where(`ac.is_open_join = true AND ac.type = 1`)
      .orderBy('ac.type', 'DESC')
      .addOrderBy('ac.dateTimeStart', 'DESC')
      .getMany();
  }

  async findAcvitiyClubByYear(year: string): Promise<Activity[]> {
    const activity = await this.activityRepository
      .createQueryBuilder('ac')
      .where('ac.type = 2 AND YEAR(ac.dateTimeStart) = :year', { year: year })
      .leftJoinAndSelect('ac.asset','asset')
      .addOrderBy('ac.dateTimeStart', 'DESC')
      .getMany();
    return activity;
  }

  async update(
    id: number,
    updateActivityDto: UpdateActivityDto,
  ): Promise<Activity> {
    const activity = await this.findOne(id);
    if (!activity) {
      throw new NotFoundException(`Entity with ID ${id} not found`);
    }
    activity.is_open_join = this.activityIsNotPass(updateActivityDto.dateTimeEnd)
    this.activityRepository.merge(activity, updateActivityDto);
    return await this.activityRepository.save(activity);
  }

  async remove(id: number): Promise<void> {
    await this.activityRepository.delete(id);
  }

  /** qurey เเค่กิจกรรมในเดือน,ปีในปัจจุบัน */
  async AutoCloseJOin(){
    const dateNow = new Date()
    let activity = await this.activityRepository.createQueryBuilder('ac').where(`MONTH(ac.dateTimeStart) = ${dateNow.getMonth()} AND MONTH(ac.dateTimeEnd)`)
    .getRawMany()
    console.log(activity)
  }
}
