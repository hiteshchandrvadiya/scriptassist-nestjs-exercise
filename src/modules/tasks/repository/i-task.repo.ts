import { PaginatedResponse } from 'src/types/pagination.interface';
import { TaskDomain } from '../domain/task';
import { BatchProcessTasksCommand, CreateTaskCommand, UpdateTaskCommand, UpdateTaskStatusCommand } from '../commands';
import { GetOverdueTasksQuery, GetTaskQuery, TaskFilterQuery } from '../queries';
import { TaskStatsResponseDto } from '../dto/task-statistics-response.dto';
import { TaskStatus } from '../enums/task-status.enum';

export const TASK_REPO = 'ITaskRepo';

export interface ITaskRepo {
  createTask(command: CreateTaskCommand): Promise<TaskDomain>;
  updateTask(command: UpdateTaskCommand): Promise<boolean>;
  listAndSearchTask(query: TaskFilterQuery): Promise<PaginatedResponse<TaskDomain>>;
  getTaskStatistics(): Promise<TaskStatsResponseDto>;
  getTaskById(id: string): Promise<TaskDomain>;
  deleteTask(id: string): Promise<boolean>;
  bulkUpdateStatus(ids: string[], status: TaskStatus): Promise<boolean>;
  bulkDelete(ids: string[]): Promise<boolean>;
  updateStatus(command: UpdateTaskStatusCommand): Promise<boolean>;
  getOverdueTasks(query: GetOverdueTasksQuery): Promise<TaskDomain[]>;
}
