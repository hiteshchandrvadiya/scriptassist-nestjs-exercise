import { AutoMap } from '@automapper/classes';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsEnum, IsNotEmptyObject } from 'class-validator';
import { EAction } from '../domain';

export class BatchProcessTasksDto {
  @ApiProperty({ description: 'List of task IDs to process', type: [String], required: true })
  @IsArray()
  @ArrayNotEmpty()
  @AutoMap(() => [String])
  ids: string[];

  @ApiProperty({ enum: EAction, description: 'Action to perform on the tasks', required: true })
  @IsEnum(EAction)
  @AutoMap(() => String)
  action: EAction;
}
