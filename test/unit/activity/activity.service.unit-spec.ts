// activity.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ActivityController } from '../../../src/activity/activity.controller';
import { ActivityService } from '../../../src/activity/activity.service';
import { Activity } from 'src/activity/entities/activity.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Connection } from 'typeorm';
import { JoinActivity } from 'src/activity/entities/joinActivities.entity';

describe('ActivityController', () => {
  let controller: ActivityController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivityController],
      providers: [ActivityService,
        {
          provide:getRepositoryToken(Activity),
          useClass:Repository
        },
        {
          provide:getRepositoryToken(JoinActivity),
          useClass:Repository
        },
        Connection
      ],
    }).compile();

    controller = module.get<ActivityController>(ActivityController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findOpenJoin should return an array of activities', async () => {
    const result = await controller.findOpenJoin();
    expect(Array.isArray(result)).toBe(true);
  });
});
