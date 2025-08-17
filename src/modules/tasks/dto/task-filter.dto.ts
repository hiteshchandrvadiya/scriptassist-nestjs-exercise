import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';
import { IsDate, IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { AutoMap } from '@automapper/classes';
import { ESortOrder, PaginationOptions } from 'src/types/pagination.interface';

// TODO: Implement task filtering DTO
// This DTO should be used to filter tasks by status, priority, etc.
export class TaskFilterDto {
  // TODO: Add properties for filtering tasks
  // Example: status, priority, userId, search query, date ranges, etc.
  // Add appropriate decorators for validation and Swagger documentation

  @ApiProperty({ description: 'User Id', required: false })
  @IsOptional()
  @IsUUID()
  @AutoMap()
  userId?: string;

  @ApiProperty({ description: 'search query to search task by task name', required: false })
  @IsOptional()
  @IsString()
  @AutoMap()
  searchQuery?: string;

  @ApiProperty({ enum: TaskStatus, example: TaskStatus.COMPLETED, required: false })
  @IsOptional()
  @IsEnum(TaskStatus)
  @AutoMap(() => String)
  status?: TaskStatus;

  @ApiProperty({ enum: TaskPriority, example: TaskPriority.HIGH, required: false })
  @IsOptional()
  @IsEnum(TaskPriority)
  @AutoMap(() => String)
  priority?: TaskPriority;

  @ApiProperty({ description: 'search query to search task by task name', required: false })
  @IsOptional()
  @IsDate()
  @AutoMap()
  startDate?: Date;

  @ApiProperty({ description: 'search query to search task by task name', required: false })
  @IsOptional()
  @IsDate()
  @AutoMap()
  endDate?: Date;

  @ApiProperty({ description: 'page', required: false })
  @IsOptional()
  @IsNumber()
  @AutoMap()
  page?: number;

  @ApiProperty({ description: 'limit', required: false })
  @IsOptional()
  @IsNumber()
  @AutoMap()
  limit?: number;

  @ApiProperty({ description: 'sortBy field', required: false })
  @IsOptional()
  @AutoMap()
  sortBy?: string;

  @ApiProperty({
    enum: ESortOrder,
    example: ESortOrder.DESC,
    description: 'sortOrder',
    required: false,
  })
  @IsOptional()
  @AutoMap()
  @IsEnum(ESortOrder)
  sortOrder?: ESortOrder;
}
