import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Request,
  Put,
  NotFoundException,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ActivityService } from './activity.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { REQUEST_USER_KEY } from 'src/common/constants';
import { AssetService } from 'src/asset/asset.service';
import {
  Owner,
  OwnerAuthGuard,
  OwnerTable,
} from 'src/auth/guards/owner-auth.guard';
import { JoinActivityDto } from './dto/join-activity.dto';
import { ActiveUserData } from 'src/common/interfaces/active-user-data.interface';
import { Public } from 'src/common/decorators/public.decorator';
import { DeepPartial } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Activity } from './entities/activity.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Controller('activity')
export class ActivityController {
  constructor(
    private readonly activityService: ActivityService,
    private readonly assetService: AssetService,
  ) {}
  private readonly logger = new Logger(ActivityController.name);
  
  @Post()
  async create(@Body() createActivityDto: CreateActivityDto) {
    return await this.activityService.create(createActivityDto);
  }

  @Post('join/:idActivity')
  async joinActivity(
    @Body() form: JoinActivityDto,
    @Param('idActivity') idActivity: number,
  ) {
    return await this.activityService.joinActivity(form, idActivity);
  }
  @Post('cancel/:idActivity')
  async cancelActivity(@Body() form: JoinActivityDto,@Param('idActivity') idActivity:number) {
    await this.activityService.cancelActivity(form,idActivity);
  }

  @Get('perplo_join/:idActivity')
  async perplo_join(
    @Param('idActivity') idActivity: number,
    @Request() request,
  ) {
    const user: ActiveUserData = request[REQUEST_USER_KEY];
    return await this.activityService.findPerploJoin(
      idActivity,
      user.code_student,
    );
  }

  @Get()
  findAll() {
    return this.activityService.findAll();
  }
  @Get('open_join')
  async findOpenJoin() {
    return await this.activityService.findOpenJoin();
  }
  @Get('user_open_join')
  async findUserOpenJoin(){
    return await this.activityService.findUserOpenJoin()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {

    return this.activityService.findOne(+id);
  }

  @Get('club/:year')
  async findActivityClubByYear(@Param('year') year: string) {
    return await this.activityService.findAcvitiyClubByYear(year);
  }

  @Public()
  @Get('perple_join/:idActivity')
  async getPerprojoin(@Param('idActivity') id:number){
    return await this.activityService.getListNameJoinAcitivty(id)
  }



  @OwnerTable(Owner.activity)
  @UseGuards(OwnerAuthGuard)
  @Put(':id_activity')
  async update(
    @Param('id_activity') id: string,
    @Body() updateActivityDto: UpdateActivityDto,
  ) {
    return await this.activityService.update(+id, updateActivityDto);
  }

  @OwnerTable(Owner.activity)
  @UseGuards(OwnerAuthGuard)
  @Delete(':id_activity')
  async remove(@Param('id_activity') id: string) {
    const activity = await this.activityService.findOne(+id);
    if (!activity) {
      throw new NotFoundException(`Entity with ID ${id} not found`);
    }
    const assetAll = await this.assetService.findAllByActivityId(+id);
    for (const asset of assetAll) {
      await this.assetService.remove(asset.id);
    }
    const perplos = await this.activityService.getPerPloJoin(+id)
    for(const p of perplos){
      await this.activityService.deleteJoinActivity(p.id)
    }
    return await this.activityService.remove(+id);
  }

}
