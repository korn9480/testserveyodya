import { Injectable, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
// import { CreateUserDto } from './ /dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from './entities/role.entity';

@Injectable()
export class UserService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role) 
    private readonly roleReposiory: Repository<Role>
  ) {}
  async onApplicationBootstrap() {
    const listData:string[] = ['user','admin']
    const dataNow = await this.roleReposiory.find()
    if (dataNow.length==0){
      for(let i of listData){
        let type = this.roleReposiory.create()
        type.nameRole = i
        await this.roleReposiory.save(type)
      }
    }
  }
  async uploadFile(path: string, codeStudent: string): Promise<void> {
    const user = new User();
    user.code_student = codeStudent;
    user.profile = path;
    await this.userRepository.save(user);
  }

  /**
   * Update an existing user
   * @param codeStudent The code of the user to update
   * @param updateUserDto The data to update the user
   * @returns The updated user
   */
  async update(
    codeStudent: string,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.findOne(codeStudent);
    this.userRepository.merge(user, updateUserDto);
    return await this.userRepository.save(user);
  }

  /**
   * Delete a user
   * @param codeStudent The code of the user to delete
   */
  async delete(codeStudent: string): Promise<void> {
    const user = await this.findOne(codeStudent);
    await this.userRepository.remove(user);
  }

  /**
   * Find all users
   * @returns A list of users
   */
  async find(): Promise<User[]> {
    return await this.userRepository.find();
  }

  /**
   * Find a user by codeStudent
   * @param codeStudent The code of the user to find
   * @returns The found user
   */
  async findOne(codeStudent: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: {
        code_student: codeStudent,
      },
      relations:['allergies']
    });
    if (!user) {
      throw new NotFoundException(
        `User with codeStudent ${codeStudent} not found`,
      );
    }
    return user;
  }
}
