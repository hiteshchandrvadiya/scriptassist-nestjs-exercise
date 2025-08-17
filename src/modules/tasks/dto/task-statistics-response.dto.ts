import { AutoMap } from '@automapper/classes';

export class TaskStatsResponseDto {
  @AutoMap()
  total: number;

  @AutoMap()
  completed: number;

  @AutoMap()
  inProgress: number;

  @AutoMap()
  pending: number;

  @AutoMap()
  highPriority: number;
}
