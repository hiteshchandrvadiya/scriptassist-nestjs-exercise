import { AutoMap } from "@automapper/classes";
import { IsDate, IsNotEmpty } from "class-validator";
import { QueryBase } from "src/cqrs";

export class GetOverdueTasksQuery extends QueryBase {
    @AutoMap(() => Date)
    now: Date;

    constructor(now: Date) {
        super()
        this.now = now;
    }
}