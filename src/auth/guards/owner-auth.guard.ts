import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { REQUEST_USER_KEY } from 'src/common/constants';
import { ActiveUserData } from 'src/common/interfaces/active-user-data.interface';
import { ActivityService } from 'src/activity/activity.service';
import { Reflector } from '@nestjs/core';
import { UserService } from '../../users/users.service';

export enum Owner {
  activity = 'activity',
  asset = 'asset',
  allergy = 'allergy',
  user = 'usre',
}

const tableName = 'tableName';

export const OwnerTable = (table: Owner) => SetMetadata(tableName, table);

@Injectable()
export class OwnerAuthGuard implements CanActivate {
  constructor(
    private readonly activityService: ActivityService,
    private readonly reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const table: Owner = this.reflector.get<Owner>(
      tableName,
      context.getHandler(),
    );
    const user: ActiveUserData = request[REQUEST_USER_KEY];
    let data: string = '';
    if (table == Owner.asset || table == Owner.activity) {
      const id = request.params.id_activity;
      data = (await this.activityService.findOne(id)).addBy.code_student;
    }
    console.log(user.code_student,data)
    if (user.code_student != data) {
      throw new ForbiddenException(
        'You do not have permission to remove this entity',
      );
    }
    return true;
  }
}
