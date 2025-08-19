import { ICommandHandler } from '@nestjs/cqrs';
import { BatchProcessTasksCommand } from './batch-process-tasks.command';
import { Inject } from '@nestjs/common';
import { ITaskRepo, TASK_REPO } from '@modules/tasks/repository';
import { CommandHandlerStrict } from 'src/cqrs';
import { EAction } from '@modules/tasks/domain';
import { TaskStatus } from '@modules/tasks/enums/task-status.enum';

@CommandHandlerStrict(BatchProcessTasksCommand)
export class BatchProcessTasksCommandHandler
  implements ICommandHandler<BatchProcessTasksCommand, boolean>
{
  constructor(@Inject(TASK_REPO) private readonly taskRepo: ITaskRepo) {}

  public async execute(command: BatchProcessTasksCommand): Promise<boolean> {
    const { ids, action } = command;

    switch (action) {
      case EAction.COMPLETE:
        return this.taskRepo.bulkUpdateStatus(ids, TaskStatus.COMPLETED);
      case EAction.DELETE:
        return this.taskRepo.bulkDelete(ids);
      case EAction.OVERDUE:
        return this.taskRepo.bulkUpdateStatus(ids, TaskStatus.OVERDUE);
      default:
        throw new Error(`Unsupported action: ${action}`);
    }
  }
}
