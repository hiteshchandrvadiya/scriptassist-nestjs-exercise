import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpException,
  HttpStatus,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TaskStatus } from './enums/task-status.enum';
import { TaskPriority } from './enums/task-priority.enum';
import { RateLimitGuard } from '../../common/guards/rate-limit.guard';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { TaskFilterDto } from './dto/task-filter.dto';
import { InjectMapper } from '@automapper/nestjs';
import { Mapper } from '@automapper/core';
import { GetTaskQuery, GetTaskStatisticsQuery, TaskFilterQuery } from './queries';
import { CqrsMediator } from 'src/cqrs';
import { TaskDomain } from './domain/task';
import { PaginatedResponse } from 'src/types/pagination.interface';
import { TaskResponseDto } from './dto/task-response.dto';
import { BatchProcessTasksCommand, CreateTaskCommand, UpdateTaskCommand } from './commands';
import { Task } from './entities/task.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { GetTaskDto } from './dto/get-task.dto';
import { isNil } from 'lodash';
import { HttpResponse } from 'src/types/http-response.interface';
import { TaskStatsResponseDto } from './dto/task-statistics-response.dto';
import { DeleteTaskCommand } from './commands/delete/delete-task.command';
import { DeleteTaskDto } from './dto/delete-task.dto';
import { BatchProcessTasksDto } from './dto/batch-process-tasks.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@modules/auth/decorators/current-user.decorator';
import { RequestUser } from '@modules/auth/types/request-user.types';
// This guard needs to be implemented or imported from the correct location
// We're intentionally leaving it as a non-working placeholder

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard, RateLimitGuard)
@RateLimit({ windowMs: 10000, maxRequests: 2 })
@ApiBearerAuth('access-token')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    // Anti-pattern: Controller directly accessing repository
    // @InjectRepository(Task)
    // private taskRepository: Repository<Task>,
    @InjectMapper() private readonly mapper: Mapper,
    private readonly mediator: CqrsMediator,
    private readonly logger: Logger,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  public async create(
    @Body() model: CreateTaskDto,
    @CurrentUser() user: RequestUser,
  ): Promise<HttpResponse<TaskResponseDto>> {
    const command = this.mapper.map(model, CreateTaskDto, CreateTaskCommand);
    command.userId = user.userId;

    const task = await this.mediator.execute<CreateTaskCommand, TaskDomain>(command);

    const taskResponse = this.mapper.map(task, TaskDomain, TaskResponseDto);

    return {
      data: taskResponse,
      message: 'Task created successfully',
      success: true,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Find all tasks with optional filtering' })
  public async findAll(
    @Query() model: TaskFilterDto,
  ): Promise<HttpResponse<PaginatedResponse<TaskDomain>>> {
    const query = this.mapper.map(model, TaskFilterDto, TaskFilterQuery);

    const result = await this.mediator.execute<TaskFilterQuery, PaginatedResponse<TaskDomain>>(
      query,
    );

    if (!result) {
      throw new HttpException('No tasks found', HttpStatus.NOT_FOUND);
    }

    return {
      data: result,
      message: 'Tasks retrieved successfully',
      success: true,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get task statistics' })
  public async getStats(): Promise<HttpResponse<TaskStatsResponseDto>> {
    // Inefficient approach: N+1 query problem
    // const tasks = await this.taskRepository.find();

    // const tasks = await this.tasksService.findAll();

    // Inefficient computation: Should be done with SQL aggregation
    // const statistics = {
    //   total: tasks.length,
    //   completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
    //   inProgress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
    //   pending: tasks.filter(t => t.status === TaskStatus.PENDING).length,
    //   highPriority: tasks.filter(t => t.priority === TaskPriority.HIGH).length,
    // };

    // return statistics;
    const statistics = await this.mediator.execute<GetTaskStatisticsQuery, TaskStatsResponseDto>(
      new GetTaskStatisticsQuery(),
    );

    return {
      data: statistics,
      message: 'Task statistics retrieved successfully',
      success: true,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Find a task by ID' })
  public async findOne(@Param() model: GetTaskDto): Promise<HttpResponse<TaskResponseDto>> {
    // const task = await this.tasksService.findOne(id);

    // if (!task) {
    //   // Inefficient error handling: Revealing internal details
    //   throw new HttpException(`Task with ID ${id} not found in the database`, HttpStatus.NOT_FOUND);
    // }

    // return task;

    const query = this.mapper.map(model, GetTaskDto, GetTaskQuery);

    const task = await this.mediator.execute<GetTaskQuery, TaskDomain>(query);

    if (!task) {
      throw new HttpException('Task not found', HttpStatus.NOT_FOUND);
    }

    const result = this.mapper.map(task, TaskDomain, TaskResponseDto);

    return {
      data: result,
      message: 'Task retrieved successfully',
      success: true,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  public async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser() user: RequestUser,
  ): Promise<HttpResponse<boolean>> {
    // No validation if task exists before update
    // return this.tasksService.update(id, updateTaskDto);

    const command = this.mapper.map(updateTaskDto, UpdateTaskDto, UpdateTaskCommand);

    command.id = id;
    command.userId = user.userId;

    // task exists check added inside the command handler
    const result = await this.mediator.execute<UpdateTaskCommand, boolean>(command);

    return {
      message: 'Task updated successfully',
      success: result,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  public async remove(@Param() model: DeleteTaskDto): Promise<HttpResponse<boolean>> {
    // No validation if task exists before removal
    // No status code returned for success
    // return this.tasksService.remove(id);

    // no existence check added for task before deletion
    // as through delete query it will return false if task is not found
    // and it will throw an error if any issue occurs during deletion
    // issue with existence check is that it will fire additional query to database
    // which is not needed as delete query will handle it
    const command = this.mapper.map(model, DeleteTaskDto, DeleteTaskCommand);
    const result = await this.mediator.execute<DeleteTaskCommand, boolean>(command);

    return {
      message: result ? 'Task deleted successfully' : 'Task not found or deletion failed',
      success: result,
    };
  }

  @Post('batch')
  @ApiOperation({ summary: 'Batch process multiple tasks' })
  async batchProcess(@Body() model: BatchProcessTasksDto): Promise<HttpResponse<boolean>> {
    // Inefficient batch processing: Sequential processing instead of bulk operations
    // const { tasks: taskIds, action } = operations;
    // const results = [];

    // N+1 query problem: Processing tasks one by one
    // for (const taskId of taskIds) {
    //   try {
    //     let result;

    //     switch (action) {
    //       case 'complete':
    //         result = await this.tasksService.update(taskId, { status: TaskStatus.COMPLETED });
    //         break;
    //       case 'delete':
    //         result = await this.tasksService.remove(taskId);
    //         break;
    //       default:
    //         throw new HttpException(`Unknown action: ${action}`, HttpStatus.BAD_REQUEST);
    //     }

    //     results.push({ taskId, success: true, result });
    //   } catch (error) {
    //     // Inconsistent error handling
    //     results.push({
    //       taskId,
    //       success: false,
    //       error: error instanceof Error ? error.message : 'Unknown error',
    //     });
    //   }
    // }

    // return results;

    const command = this.mapper.map(model, BatchProcessTasksDto, BatchProcessTasksCommand);

    const result = await this.mediator.execute<BatchProcessTasksCommand, boolean>(command);

    return {
      data: result,
      message: 'Batch processing completed successfully',
      success: true,
    };
  }
}
