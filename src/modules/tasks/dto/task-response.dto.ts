import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';
import { AutoMap } from '@automapper/classes';

export class TaskResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @AutoMap()
  id: string;

  @ApiProperty({ example: 'Complete project documentation' })
  @AutoMap()
  title: string;

  @ApiProperty({ example: 'Add details about API endpoints and data models' })
  @AutoMap()
  description: string;

  @ApiProperty({ enum: TaskStatus, example: TaskStatus.PENDING })
  @AutoMap(() => String)
  status: TaskStatus;

  @ApiProperty({ enum: TaskPriority, example: TaskPriority.MEDIUM })
  @AutoMap(() => String)
  priority: TaskPriority;

  @ApiProperty({ example: '2023-12-31T23:59:59Z' })
  @AutoMap()
  dueDate: Date;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @AutoMap()
  userId: string;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  @AutoMap()
  createdAt: Date;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  @AutoMap()
  updatedAt: Date;
}
