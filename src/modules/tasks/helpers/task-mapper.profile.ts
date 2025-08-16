import { createMap, Mapper, MappingProfile } from '@automapper/core';
import { AutomapperProfile, InjectMapper } from '@automapper/nestjs';
import { TaskFilterDto } from '../dto/task-filter.dto';
import { TaskFilterQuery } from '../queries';

export class TaskMapperProfile extends AutomapperProfile {
  constructor(@InjectMapper() protected readonly mapper: Mapper) {
    super(mapper);
  }

  public override get profile(): MappingProfile {
    return mapper => {
      this.listAndSearch(mapper);
    };
  }

  private listAndSearch(mapper: Mapper): void {
    createMap(mapper, TaskFilterDto, TaskFilterQuery);
  }
}
