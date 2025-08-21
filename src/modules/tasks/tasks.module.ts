import { DynamicModule, Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from './entities/task.entity';
import { CommandHandlers, MapperProfile, QueryHandlers } from '.';
import { TASK_REPO, TaskRepo } from './repository';
import { CqrsModule } from '@nestjs/cqrs';
import { TaskEntityMapperProfile } from './helpers';
import { UsersModule } from '@modules/users/users.module';
import { CacheService } from '@common/services/cache.service';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  // imports: [
  //   TypeOrmModule.forFeature([Task]),
  //   BullModule.registerQueue({
  //     name: 'task-processing',
  //   }),
  // ],
  // controllers: [TasksController],
  // providers: [...QueryHandlers, TasksService],
  // exports: [...QueryHandlers, TasksService, TypeOrmModule],
})
export class TasksModule {
  static forRoot(): DynamicModule {
    return {
      global: true,
      module: TasksModule,
      controllers: [TasksController],
      imports: [
        TypeOrmModule.forFeature([Task]),
        BullModule.registerQueue({
          name: 'task-processing',
        }),
        CqrsModule,
        UsersModule,
        AuthModule,
      ],
      providers: [
        ...QueryHandlers,
        ...MapperProfile,
        ...CommandHandlers,
        TasksService,
        TaskEntityMapperProfile,
        {
          provide: TASK_REPO,
          useClass: TaskRepo,
        },
        Logger,
        CacheService,
      ],
      exports: [
        ...QueryHandlers,
        ...MapperProfile,
        ...CommandHandlers,
        TaskEntityMapperProfile,
        TasksService,
        TASK_REPO,
        TypeOrmModule,
      ],
    };
  }
}
