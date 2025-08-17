import { ITaskRepo, TASK_REPO } from '@modules/tasks/repository';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler } from '@nestjs/cqrs';
import { QueryHandlerStrict } from 'src/cqrs';
import { GetTaskStatisticsQuery } from './task-statistics.query';
import { TaskStatsResponseDto } from '@modules/tasks/dto/task-statistics-response.dto';

@QueryHandlerStrict(GetTaskStatisticsQuery)
export class GetTaskStatisticsQueryHandler
  implements IQueryHandler<GetTaskStatisticsQuery, TaskStatsResponseDto>
{
  constructor(
    @Inject(TASK_REPO) private readonly taskRepo: ITaskRepo,
    private readonly logger: Logger,
  ) {}

  public async execute(__: GetTaskStatisticsQuery): Promise<TaskStatsResponseDto> {
    try {
      const stats = await this.taskRepo.getTaskStatistics();
      return stats;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
