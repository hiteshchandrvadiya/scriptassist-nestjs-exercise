import { ICommandHandler } from '@nestjs/cqrs';
import { UpdateTaskCommand } from './update-task.command';
import { TaskDomain } from '@modules/tasks/domain/task';
import { CommandHandlerStrict, CqrsMediator } from 'src/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { ITaskRepo, TASK_REPO } from '@modules/tasks/repository';
import { GetTaskQuery } from '@modules/tasks/queries';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@CommandHandlerStrict(UpdateTaskCommand)
export class UpdateTaskCommandHandler implements ICommandHandler<UpdateTaskCommand, boolean> {
  constructor(
    @Inject(TASK_REPO) private readonly taskRepo: ITaskRepo,
    @InjectQueue('task-processing') private readonly taskQueue: Queue,
  ) {}

  public async execute(command: UpdateTaskCommand): Promise<boolean> {
    const task = await this.taskRepo.getTaskById(command.id);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const result = await this.taskRepo.updateTask(command);

    this.taskQueue.add(
      'task-status-update',
      {
        taskId: task.id,
        status: command.status,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 500,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return result;
  }
}
