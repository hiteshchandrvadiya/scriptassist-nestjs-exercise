import { IQueryHandler } from '@nestjs/cqrs';
import { GetOverdueTasksQuery } from './get-overdue-tasks.query';
import { TaskDomain } from '@modules/tasks/domain';
import { Inject } from '@nestjs/common';
import { ITaskRepo, TASK_REPO } from '@modules/tasks/repository';
import { QueryHandlerStrict } from 'src/cqrs';

@QueryHandlerStrict(GetOverdueTasksQuery)
export class GetOverdueTasksQueryHandler
  implements IQueryHandler<GetOverdueTasksQuery, TaskDomain[]>
{
  constructor(@Inject(TASK_REPO) private readonly taskRepo: ITaskRepo) {}

  public async execute(query: GetOverdueTasksQuery): Promise<TaskDomain[]> {
    return await this.taskRepo.getOverdueTasks(query);
  }
}
