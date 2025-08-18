import { AutoMap } from "@automapper/classes";
import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsUUID } from "class-validator";
import { TaskStatus } from "../enums/task-status.enum";

export class UpdateTaskStatusDto {
    @ApiProperty({ description: 'Task Id', required: true })
    @IsNotEmpty()
    @IsUUID()
    @AutoMap()
    id: string;

    @ApiProperty({ enum: TaskStatus, description: 'Task Status', required: true })
    @IsNotEmpty()
    @IsEnum(TaskStatus)
    @AutoMap(() => String)
    status: TaskStatus;
}