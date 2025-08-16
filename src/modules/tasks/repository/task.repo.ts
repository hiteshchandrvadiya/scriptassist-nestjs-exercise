import { Inject, InternalServerErrorException, Logger } from "@nestjs/common";
import { ITaskRepo } from "./i-task.repo";
import { TaskFilterQuery } from "../queries/task-filter-query";
import { InjectRepository } from "@nestjs/typeorm";
import { Task } from "../entities/task.entity";
import { ILike, Repository } from "typeorm";
import { InjectMapper } from "@automapper/nestjs";
import { Mapper } from "@automapper/core";
import { TaskDomain } from "../domain/task";
import { filter, isNil } from "lodash";

export class TaskRepo implements ITaskRepo {
    constructor(
        @InjectRepository(Task) private readonly taskRepository: Repository<Task>,
        @InjectMapper() private readonly mapper: Mapper,
        private readonly logger: Logger,
    ) {}

    public async listAndSearchTask(query: TaskFilterQuery): Promise<TaskDomain[]> {
        this.logger.log(`Executing listAndSearchTask with query: ${JSON.stringify(query)}`);
        try {
            const { userId, searchQuery, priority, status, startDate, endDate, page, limit } = query;

            const conditions = filter([
                userId && "userId = :userId",
                searchQuery && "title ILIKE :searchQuery",
                priority && "priority = :priority",
                status && "status = :status",
                startDate && endDate && "dueDate BETWEEN :startDate AND :endDate",
                startDate && !endDate && "dueDate >= :startDate",
                !startDate && endDate && "dueDate <= :endDate",
            ])

            const builder = this.taskRepository.createQueryBuilder("task");

            if (conditions.length) {
                builder.where(conditions.join(" AND "), {
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

            const tasks = await builder.getMany();

            this.logger.log(`Found ${tasks.length} tasks matching the query`);

            this.logger.log(JSON.stringify(tasks, null, 2));

            return this.mapper.mapArray(tasks, Task, TaskDomain);
        } catch (error) {
            this.logger.error(error);
            throw new InternalServerErrorException();
        }
    }
}