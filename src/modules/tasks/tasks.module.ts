import { DynamicModule, Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from './entities/task.entity';
import { MapperProfile, QueryHandlers } from '.';
import { TASK_REPO, TaskRepo } from './repository';
import { CqrsMediator } from 'src/cqrs';
import { AppModule } from 'src/app.module';
import { CqrsModule } from '@nestjs/cqrs';
import { TaskEntityMapperProfile } from './helpers';

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
      ],
      providers: [
        ...QueryHandlers,
        ...MapperProfile,
        TasksService,
        TaskEntityMapperProfile,
        {
          provide: TASK_REPO,
          useClass: TaskRepo,
        },
        Logger,
      ],
      exports: [
        ...QueryHandlers,
        ...MapperProfile,
        TaskEntityMapperProfile,
        TasksService,
        TASK_REPO,
        TypeOrmModule
      ],
    };
  }
}
