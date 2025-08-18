import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { Task } from '../../modules/tasks/entities/task.entity';
import { TaskStatus } from '../../modules/tasks/enums/task-status.enum';
import { CqrsMediator } from 'src/cqrs';
import { GetOverdueTasksQuery } from '@modules/tasks/queries';
import { TaskDomain } from '@modules/tasks/domain';

@Injectable()
export class OverdueTasksService {
  private readonly logger = new Logger(OverdueTasksService.name);

  private readonly BATCH_SIZE = 200;

  constructor(
    @InjectQueue('task-processing')
    private taskQueue: Queue,
    // @InjectRepository(Task)
    // private tasksRepository: Repository<Task>,
    private readonly mediator: CqrsMediator,
  ) {}

  // TODO: Implement the overdue tasks checker
  // This method should run every hour and check for overdue tasks
  @Cron(CronExpression.EVERY_HOUR)
  async checkOverdueTasks() {
    this.logger.debug('Checking for overdue tasks...');

    // TODO: Implement overdue tasks checking logic
    // 1. Find all tasks that are overdue (due date is in the past)
    // 2. Add them to the task processing queue
    // 3. Log the number of overdue tasks found

    // Example implementation (incomplete - to be implemented by candidates)
    const now = new Date();

    // const overdueTasks = await this.tasksRepository.find({
    //   where: {
    //     dueDate: LessThan(now),
    //     status: TaskStatus.PENDING,
    //   },
    // });
    try {
      const query = new GetOverdueTasksQuery(now);
      // written same query as above inside the query-handler
      const overdueTasks = await this.mediator.execute<GetOverdueTasksQuery, TaskDomain[]>(query);

      this.logger.log(`Found ${overdueTasks.length} overdue tasks`);

      // Add tasks to the queue to be processed
      // TODO: Implement adding tasks to the queue

      const jobs = [];
      for (let i = 0; i < overdueTasks.length; i += this.BATCH_SIZE) {
        const chunk = overdueTasks.slice(i, i + this.BATCH_SIZE);

        jobs.push(
          this.taskQueue.add(
            'overdue-tasks-notification',
            {
              tasks: chunk.map(task => ({ ...task, now })),
            },
            {
              attempts: 5,
              backoff: {
                type: 'exponential',
                delay: 1000,
              },
              removeOnComplete: true,
              removeOnFail: false,
            },
          ),
        );
      }

      await Promise.race([
        Promise.all(jobs),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Queue operations timeout')), 30000),
        ),
      ]);
    } catch (error) {
      this.logger.error(`Error in overdue tasks check: ${error}`);
    } finally {
      this.logger.debug('Overdue tasks check completed');
    }
  }
}
