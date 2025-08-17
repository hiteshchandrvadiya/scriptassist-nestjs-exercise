import { AutoMap } from '@automapper/classes';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class GetTaskDto {
  @ApiProperty({ description: 'Task Id', required: true })
  @IsUUID()
  @IsNotEmpty()
  @AutoMap()
  public id: string;
}
