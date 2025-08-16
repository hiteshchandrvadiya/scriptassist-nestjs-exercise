import { IQueryHandler } from "@nestjs/cqrs";
import { TaskFilterQuery } from "./task-filter.query";
import { QueryHandlerStrict } from "src/cqrs";
import { Inject } from "@nestjs/common";
import { ITaskRepo, TASK_REPO } from "@modules/tasks/repository";
import { Task } from "@modules/tasks/entities/task.entity";
import { TaskDomain } from "@modules/tasks/domain/task";

@QueryHandlerStrict(TaskFilterQuery)
export class TaskFilterQueryHandler implements IQueryHandler<TaskFilterQuery, TaskDomain[]> {
    constructor(
        @Inject(TASK_REPO) private readonly taskRepo: ITaskRepo
    ){}

    public async execute(query: TaskFilterQuery): Promise<TaskDomain[]> {
        try {
            return await this.taskRepo.listAndSearchTask(query);
        } catch (error) {
            throw error;
        }
    }

}