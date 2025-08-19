import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { TasksService } from '../../modules/tasks/tasks.service';
import { CqrsMediator } from 'src/cqrs';
import { TaskStatus } from '@modules/tasks/enums/task-status.enum';
import { BatchProcessTasksCommand, UpdateTaskStatusCommand } from '@modules/tasks/commands';
import { JobResult } from '@queues/domain/job-result';
import { now } from 'lodash';
import { GetOverdueTasksQuery } from '@modules/tasks/queries';
import { EAction, TaskDomain } from '@modules/tasks/domain';
import { DataSource } from 'typeorm';
import { Task } from '@modules/tasks/entities/task.entity';

@Injectable()
@Processor('task-processing')
export class TaskProcessorService extends WorkerHost {
  private readonly logger = new Logger(TaskProcessorService.name);

  constructor(
    private readonly tasksService: TasksService,
    private readonly mediator: CqrsMediator,
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  // Inefficient implementation:
  // - No proper job batching
  // - No error handling strategy
  // - No retries for failed jobs
  // - No concurrency control
  async process(job: Job): Promise<any> {
    this.logger.debug(`Processing job ${job.id} of type ${job.name}`);

    try {
      switch (job.name) {
        case 'task-status-update':
          return await this.handleStatusUpdate(job);
        case 'overdue-tasks-notification':
          return await this.handleOverdueTasks(job);
        default:
          this.logger.warn(`Unknown job type: ${job.name}`);
          return { success: false, error: 'Unknown job type' };
      }
    } catch (error) {
      // Basic error logging without proper handling or retries
      this.logger.error(
        `Error processing job ${job.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error; // Simply rethrows the error without any retry strategy
    }
  }

  private async handleStatusUpdate(job: Job): Promise<JobResult> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();

    await queryRunner.startTransaction();
    try {
      const { taskId, status } = job.data;

      if (!taskId || !status) {
        return { success: false, error: 'Missing required data', retryable: false };
      }

      // Inefficient: No validation of status values
      // No transaction handling
      // No retry mechanism

      if (!this.isValidStatus(status)) {
        return { success: false, error: 'Invalid status', retryable: false };
      }

      const result = await queryRunner.manager.update(Task, { id: taskId }, { status: status });

      const isRecordUpdated = (result?.affected ?? 0) > 0;

      if (isRecordUpdated) {
        return {
          success: isRecordUpdated,
          data: {
            taskId,
            newStatus: status,
            updatedAt: new Date().toISOString(),
          },
        };
      } else {
        return {
          success: false,
          error: 'Task not found',
          retryable: false,
        };
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();

      this.logger.error(error);

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async handleOverdueTasks(job: Job) {
    // Inefficient implementation with no batching or chunking for large datasets
    this.logger.debug(`Processing overdue tasks notification job ${job.id}`);

    try {
      const tasks = job.data.tasks;

      if (!tasks.length) {
        this.logger.warn(`No tasks provided in job ${job.id}`);
        return { success: true, message: 'No tasks to process' };
      }

      const taskIds = tasks.map((task: TaskDomain) => task.id);

      const updatedTasks = await this.mediator.execute<BatchProcessTasksCommand, boolean>(
        new BatchProcessTasksCommand(taskIds, EAction.OVERDUE),
      );

      if (!updatedTasks) {
        this.logger.warn(
          `Bulk update returned false for job ${job.id} (possibly already processed)`,
        );
        return {
          success: true,
          message: 'No rows affected (possibly already processed)',
          data: { jobId: job.id, attempted: taskIds.length, updatedCount: 0 },
        };
      }

      this.logger.log(`Processed ${taskIds.length} overdue tasks for job ${job.id}`);
      return {
        success: true,
        message: `Processed ${taskIds.length} overdue tasks`,
        data: { jobId: job.id, updatedCount: taskIds.length },
      };
    } catch (error: any) {
      if (this.isRetryableError(error)) {
        // Throw => BullMQ will retry according to attempts/backoff
        this.logger.error(`Retryable error in job ${job.id}: ${error?.message || error}`);
        throw error;
      } else {
        // Non-retryable failure: prevent further attempts
        this.logger.error(`Non-retryable error in job ${job.id}: ${error?.message || error}`);
        job.discard(); // crucial: stops future retries
        throw error; // marks the job failed (once) with no more retries
      }
    }

    // The implementation is deliberately basic and inefficient
    // It should be improved with proper batching and error handling
  }

  private isValidStatus(status: TaskStatus): boolean {
    return Object.values(TaskStatus).includes(status);
  }

  private isRetryableError(err: any): boolean {
    const msg = (err?.message || String(err || '')).toLowerCase();

    // Common transient signals
    const transientHints = [
      'timeout', // query/connection timeouts
      'deadlock', // DB deadlock
      'lock wait timeout', // MySQL/Inno lock wait
      'too many connections',
      'connection refused',
      'connection reset',
      'econnreset',
      'etimedout',
      'socket hang up',
      'rate limit',
      'temporarily unavailable',
      'try again',
      'enotfound', // DNS hiccup
      'service unavailable',
      'overloaded',
    ];

    return transientHints.some(hint => msg.includes(hint));
  }
}
