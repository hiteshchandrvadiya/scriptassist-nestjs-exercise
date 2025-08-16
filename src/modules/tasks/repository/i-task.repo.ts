import { TaskDomain } from "../domain/task";
import { TaskFilterQuery } from "../queries/task-filter-query";

export const TASK_REPO = "ITaskRepo";

export interface ITaskRepo {
    listAndSearchTask(query: TaskFilterQuery): Promise<TaskDomain[]>;
}