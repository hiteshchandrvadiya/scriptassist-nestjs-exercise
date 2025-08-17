import {
  BatchProcessTasksCommandHandler,
  CreateTaskCommandHandler,
  DeleteTaskCommandHandler,
  UpdateTaskCommandHandler,
} from './commands';
import { TaskMapperProfile } from './helpers';
import {
  GetTaskQueryHandler,
  GetTaskStatisticsQueryHandler,
  TaskFilterQueryHandler,
} from './queries';

export const CommandHandlers = [
  CreateTaskCommandHandler,
  UpdateTaskCommandHandler,
  DeleteTaskCommandHandler,
  BatchProcessTasksCommandHandler,
];

export const QueryHandlers = [
  TaskFilterQueryHandler,
  GetTaskStatisticsQueryHandler,
  GetTaskQueryHandler,
];

export const MapperProfile = [TaskMapperProfile];
