import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';
import { IsDate, IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

// TODO: Implement task filtering DTO
// This DTO should be used to filter tasks by status, priority, etc.
export class TaskFilterDto {
  // TODO: Add properties for filtering tasks
  // Example: status, priority, userId, search query, date ranges, etc.
  // Add appropriate decorators for validation and Swagger documentation

  @ApiProperty({ description: "User Id", required: false })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: "search query to search task by task name", required: false })
  @IsOptional()
  @IsString()
  searchQuery?: string;

  @ApiProperty({ enum: TaskStatus, example: TaskStatus.COMPLETED, required: false })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({ enum: TaskPriority, example: TaskPriority.HIGH, required: false })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiProperty({ description: "search query to search task by task name", required: false })
  @IsOptional()
  @IsDate()
  startDate?: Date;

  @ApiProperty({ description: "search query to search task by task name", required: false })
  @IsOptional()
  @IsDate()
  endDate?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  limit?: number;
} 