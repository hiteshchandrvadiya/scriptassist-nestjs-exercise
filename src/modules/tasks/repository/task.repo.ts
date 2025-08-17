import { Inject, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { ITaskRepo } from './i-task.repo';
import { TaskFilterQuery } from '../queries/task-filter-query';
import { InjectRepository } from '@nestjs/typeorm';
import { Task } from '../entities/task.entity';
import { ILike, In, Repository } from 'typeorm';
import { InjectMapper } from '@automapper/nestjs';
import { Mapper } from '@automapper/core';
import { TaskDomain } from '../domain/task';
import { filter, isNil } from 'lodash';
import { PaginatedResponse } from 'src/types/pagination.interface';
import { BatchProcessTasksCommand, CreateTaskCommand, UpdateTaskCommand } from '../commands';
import { TaskStatus } from '../enums/task-status.enum';
import { TaskPriority } from '../enums/task-priority.enum';
import { UsersService } from '@modules/users/users.service';
import { GetTaskQuery } from '../queries';

export class TaskRepo implements ITaskRepo {
  constructor(
    @InjectRepository(Task) private readonly taskRepository: Repository<Task>,
    private readonly usersService: UsersService,
    @InjectMapper() private readonly mapper: Mapper,
    private readonly logger: Logger,
  ) {}

  public async createTask(command: CreateTaskCommand): Promise<TaskDomain> {
    try {
      const { userId } = command;
      const user = await this.usersService.findOne(userId);

      if (isNil(user) || !user) {
        throw new NotFoundException();
      }
      const task = this.taskRepository.create(command);
      const savedTask = await this.taskRepository.save(task);

      return this.mapper.map(savedTask, Task, TaskDomain);
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException();
    }
  }

  public async updateTask(command: UpdateTaskCommand): Promise<boolean> {
    try {
      const updatedResult = await this.taskRepository.update(command.id, command);

      return updatedResult?.affected ? true : false;
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException();
    }
  }

  public async listAndSearchTask(query: TaskFilterQuery): Promise<PaginatedResponse<TaskDomain>> {
    this.logger.log(`Executing listAndSearchTask with query: ${JSON.stringify(query)}`);
    try {
      const {
        userId,
        searchQuery,
        priority,
        status,
        startDate,
        endDate,
        page,
        limit,
        sortBy,
        sortOrder,
      } = query;

      const conditions = filter([
        userId && 'userId = :userId',
        searchQuery && 'title ILIKE :searchQuery',
        priority && 'priority = :priority',
        status && 'status = :status',
        startDate && endDate && 'dueDate BETWEEN :startDate AND :endDate',
        startDate && !endDate && 'dueDate >= :startDate',
        !startDate && endDate && 'dueDate <= :endDate',
      ]);

      const builder = this.taskRepository.createQueryBuilder('task');

      if (conditions.length) {
        builder.where(conditions.join(' AND '), {
          userId,
          searchQuery: `%${searchQuery}%`,
          priority,
          status,
          startDate,
          endDate,
        });
      }

      if (!isNil(page) && !isNil(limit)) {
        builder.skip((page - 1) * limit).take(limit);
      }

      if (!isNil(sortBy) && !isNil(sortOrder)) {
        builder.orderBy(`task.${sortBy}`, sortOrder);
      } else {
        builder.orderBy('task.createdAt', 'DESC');
      }

      // inefficient fires two queries
      // 1) for getting paginated data
      // 2) for getting total count
      // const [tasks, totalTasks] = await builder.getManyAndCount();

      const tasksWithCount = await builder
        .addSelect('COUNT(*) OVER() as total_count')
        .getRawAndEntities();

      const totalTasks = tasksWithCount.raw.length
        ? parseInt(tasksWithCount.raw[0].total_count, 10)
        : 0;

      return {
        data: this.mapper.mapArray(tasksWithCount.entities, Task, TaskDomain),
        meta: {
          total: totalTasks,
          page: page || 1,
          limit: limit || 10,
          totalPages: Math.ceil(totalTasks / (limit || 10)),
        },
      };
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException();
    }
  }

  public async getTaskStatistics(): Promise<any> {
    try {
      const stats = await this.taskRepository
        .createQueryBuilder('task')
        .select('COUNT(*)', 'total')
        .addSelect(`COUNT(*) FILTER (WHERE task.status = :completed)`, 'completed')
        .addSelect(`COUNT(*) FILTER (WHERE task.status = :inProgress)`, 'inProgress')
        .addSelect(`COUNT(*) FILTER (WHERE task.status = :pending)`, 'pending')
        .addSelect(`COUNT(*) FILTER (WHERE task.priority = :high)`, 'highPriority')
        .setParameters({
          completed: TaskStatus.COMPLETED,
          inProgress: TaskStatus.IN_PROGRESS,
          pending: TaskStatus.PENDING,
          high: TaskPriority.HIGH,
        })
        .getRawOne();

      return {
        total: parseInt(stats.total, 10),
        completed: parseInt(stats.completed, 10),
        inProgress: parseInt(stats.inProgress, 10),
        pending: parseInt(stats.pending, 10),
        highPriority: parseInt(stats.highPriority, 10),
      };
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException();
    }
  }

  public async getTaskById(id: string): Promise<TaskDomain> {
    try {
      const task = await this.taskRepository.findOne({
        where: {
          id: id,
        },
      });

      return this.mapper.map(task, Task, TaskDomain);
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException();
    }
  }

  public async deleteTask(id: string): Promise<boolean> {
    try {
      const result = await this.taskRepository.delete(id);
      return result?.affected ? true : false;
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException();
    }
  }

  public async bulkUpdateStatus(ids: string[], status: TaskStatus): Promise<boolean> {
    try {
      const updateResult = await this.taskRepository.update(ids, { status });

      return updateResult?.affected ? true : false;
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException();
    }
  }

  public async bulkDelete(ids: string[]): Promise<boolean> {
    try {
      const deleteResult = await this.taskRepository.delete(ids);

      return deleteResult?.affected ? true : false;
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException();
    }
  }
}
