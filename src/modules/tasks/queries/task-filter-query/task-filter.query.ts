import { AutoMap } from "@automapper/classes";
import { TaskPriority } from "../../enums/task-priority.enum";
import { TaskStatus } from "../../enums/task-status.enum";
import { QueryBase } from "src/cqrs";

export class TaskFilterQuery extends QueryBase {
    @AutoMap()
    userId?: string;

    @AutoMap()
    searchQuery?: string;

    @AutoMap(() => String)
    status?: TaskStatus;

    @AutoMap(() => String)
    priority?: TaskPriority;

    @AutoMap()
    startDate?: Date;

    @AutoMap()
    endDate?: Date;

    @AutoMap()
    page?: number;

    @AutoMap()
    limit?: number;

    @AutoMap()
    sortBy?: string;

    @AutoMap()
    sortOrder?: "ASC" | "DESC";
}