import { createMap, Mapper, MappingProfile } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { TaskFilterDto } from '../dto/task-filter.dto';
import { GetTaskQuery, TaskFilterQuery } from '../queries';
import { TaskDomain } from '../domain/task';
import { TaskResponseDto } from '../dto/task-response.dto';
import { CreateTaskDto } from '../dto/create-task.dto';
import {
  BatchProcessTasksCommand,
  CreateTaskCommand,
  DeleteTaskCommand,
  UpdateTaskCommand,
} from '../commands';
import { GetTaskDto } from '../dto/get-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { DeleteTaskDto } from '../dto/delete-task.dto';
import { BatchProcessTasksDto } from '../dto/batch-process-tasks.dto';

export class TaskMapperProfile extends AutomapperProfile {
  constructor(@InjectMapper() protected readonly mapper: Mapper) {
    super(mapper);
  }

  public override get profile(): MappingProfile {
    return mapper => {
      this.create(mapper);
      this.update(mapper);
      this.get(mapper);
      this.delete(mapper);
      this.bulkProcess(mapper);
      this.listAndSearch(mapper);
      this.response(mapper);
    };
  }

  private create(mapper: Mapper): void {
    createMap(mapper, CreateTaskDto, CreateTaskCommand);
  }

  private update(mapper: Mapper): void {
    createMap(mapper, UpdateTaskDto, UpdateTaskCommand);
  }

  private get(mapper: Mapper): void {
    createMap(mapper, GetTaskDto, GetTaskQuery);
  }

  private delete(mapper: Mapper): void {
    createMap(mapper, DeleteTaskDto, DeleteTaskCommand);
  }

  private bulkProcess(mapper: Mapper): void {
    createMap(mapper, BatchProcessTasksDto, BatchProcessTasksCommand);
  }

  private listAndSearch(mapper: Mapper): void {
    createMap(mapper, TaskFilterDto, TaskFilterQuery);
  }

  private response(mapper: Mapper): void {
    createMap(mapper, TaskDomain, TaskResponseDto);
  }
}
