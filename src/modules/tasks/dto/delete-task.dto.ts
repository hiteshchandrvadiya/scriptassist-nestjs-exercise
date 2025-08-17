import { AutoMap } from '@automapper/classes';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class DeleteTaskDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', required: true })
  @IsUUID()
  @IsNotEmpty()
  @AutoMap()
  id: string;
}
