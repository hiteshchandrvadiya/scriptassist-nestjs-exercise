import {
  BatchProcessTasksCommandHandler,
  CreateTaskCommandHandler,
  DeleteTaskCommandHandler,
  UpdateTaskCommandHandler,
  UpdateTaskStatusCommandHandler,
} from './commands';
import { TaskMapperProfile } from './helpers';
import {
  GetOverdueTasksQueryHandler,
  GetTaskQueryHandler,
  GetTaskStatisticsQueryHandler,
  TaskFilterQueryHandler,
} from './queries';

export const CommandHandlers = [
  CreateTaskCommandHandler,
  UpdateTaskCommandHandler,
  DeleteTaskCommandHandler,
  BatchProcessTasksCommandHandler,
  UpdateTaskStatusCommandHandler,
];

export const QueryHandlers = [
  TaskFilterQueryHandler,
  GetTaskStatisticsQueryHandler,
  GetTaskQueryHandler,
  GetOverdueTasksQueryHandler,
];

export const MapperProfile = [TaskMapperProfile];
