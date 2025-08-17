import { IQueryHandler } from '@nestjs/cqrs';
import { GetTaskQuery } from './get-task.query';
import { TaskDomain } from '@modules/tasks/domain/task';
import { QueryHandlerStrict } from 'src/cqrs';
import { Inject } from '@nestjs/common';
import { ITaskRepo, TASK_REPO } from '@modules/tasks/repository';

@QueryHandlerStrict(GetTaskQuery)
export class GetTaskQueryHandler implements IQueryHandler<GetTaskQuery, TaskDomain> {
  constructor(
    @Inject(TASK_REPO) private readonly taskRepo: ITaskRepo
  ) {}

  public async execute(query: GetTaskQuery): Promise<TaskDomain> {
    return await this.taskRepo.getTaskById(query.id);
  }
}
