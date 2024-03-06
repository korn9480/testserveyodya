import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';

import jwtConfig from '../common/config/jwt.config';
import { MysqlErrorCode } from '../common/enums/error-codes.enum';
import { ActiveUserData } from '../common/interfaces/active-user-data.interface';
import { RedisService } from '../redis/redis.service';
import { User } from '../users/entities/user.entity';
import { BcryptService } from './bcrypt.service';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { Role } from 'src/users/entities/role.entity';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { env } from 'process';

@Injectable()
export class AuthService {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly bcryptService: BcryptService,
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly redisService: RedisService,
  ) {}

  async signUp(signUpDto: SignUpDto): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { code_student: signUpDto.code_student },
    });
    if (user) {
      throw new ConflictException(
        `User [${signUpDto.code_student}] already exist`,
      );
    }
    if (signUpDto.first_name.includes('นาย')) {
      signUpDto.prefix = 'นาย';
      signUpDto.first_name = signUpDto.first_name
        .replace('นาย', '')
        .replace(' ', '');
    } else if (signUpDto.first_name.includes('นางสาว')) {
      signUpDto.prefix = 'นางสาว';
      signUpDto.first_name = signUpDto.first_name
        .replace('นางสาว', '')
        .replace(' ', '');
    }
    signUpDto.password = await this.bcryptService.hash(signUpDto.password);
    await this.userRepository.save(signUpDto);
  }

  async update(signUpDto: UpdateAuthDto) {
    const user = await this.userRepository.findOne({
      where: { code_student: signUpDto.code_student },relations:['allergies']
    });
    if (!user) {
      throw new ConflictException(
        `User [${signUpDto.code_student}] not have in system`,
      );
    }
    try {
      if (signUpDto.first_name.includes('นาย')) {
        signUpDto.prefix = 'นาย';
        signUpDto.first_name = signUpDto.first_name
          .replace('นาย', '')
          .replace(' ', '');
      } else if (signUpDto.first_name.includes('นางสาว')) {
        signUpDto.prefix = 'นางสาว';
        signUpDto.first_name = signUpDto.first_name
          .replace('นางสาว', '')
          .replace(' ', '');
      }
      
      await this.userRepository.save(signUpDto);
    } catch (error) {
      if (error.code === MysqlErrorCode.UniqueViolation) {
        throw new ConflictException(
          `User [${signUpDto.code_student}] already exist`,
        );
      }
      throw error;
    }
  }

  async signIn(signInDto: SignInDto) {
    const { code_student: codeStudent, password } = signInDto;
    const user = await this.userRepository.findOne({
      where: {
        code_student: codeStudent,
      },
    });
    if (!user) {
      throw new BadRequestException('Invalid email');
    }
    if (!await this.checkPassword(password,user.password)) {
      throw new BadRequestException('Invalid password');
    }

    const accessToken = await this.generateAccessToken(user);
    return {
      code_student: user.code_student,
      profile: user.profile,
      prefix: user.prefix,
      accessToken,
      role: user.roleId.nameRole
    };
  }

  async signOut(userId: string): Promise<void> {
    await this.redisService.delete(`user-${userId}`);
  }

  async refreshToken(payload: ActiveUserData) {
    const accessToken = await this.generateAccessToken(payload);
    return {
      code_student: payload.code_student,
      profile: payload.profile,
      accessToken,
    };
  }

  async forgotPassword(form: ForgotPasswordDto): Promise<void> {
    const newUser = this.userRepository.create();
    newUser.code_student = form.code_student;
    newUser.password = await this.bcryptService.hash(form.password);
    await this.userRepository.save(newUser);
  }

  private async checkPassword(newPassword:string,passwordOld:string){
    return await this.bcryptService.compare(
      newPassword,
      passwordOld,
    );
  }

  private async generateAccessToken(user: Partial<User>): Promise<string> {
    const tokenId = process.env.TOKEN_ID
    await this.redisService.insert(`user-${user.code_student}`, tokenId);
    const accessToken = await this.jwtService.signAsync(
      {
        code_student: user.code_student,
        role: user.roleId,
        profile: user.profile,
        tokenId: tokenId,
      } as ActiveUserData,
      {
        secret: this.jwtConfiguration.secret,
        expiresIn: this.jwtConfiguration.accessTokenTtl,
      },
    );
    return accessToken;
  }
}
