import { ICommandHandler } from '@nestjs/cqrs';
import { DeleteTaskCommand } from './delete-task.command';
import { CommandHandlerStrict } from 'src/cqrs';
import { HttpException, HttpStatus, Inject } from '@nestjs/common';
import { ITaskRepo, TASK_REPO } from '@modules/tasks/repository';

@CommandHandlerStrict(DeleteTaskCommand)
export class DeleteTaskCommandHandler implements ICommandHandler<DeleteTaskCommand, boolean> {
  constructor(@Inject(TASK_REPO) private readonly taskRepo: ITaskRepo) {}

  public async execute(command: DeleteTaskCommand): Promise<boolean> {
    const result = await this.taskRepo.deleteTask(command.id);

    if (!result) {
      throw new HttpException('Task not found', HttpStatus.NOT_FOUND);
    }

    return result;
  }
}
