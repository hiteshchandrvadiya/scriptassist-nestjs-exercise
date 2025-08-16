import { createMap, Mapper, MappingProfile } from "@automapper/core";
import { AutomapperProfile, InjectMapper } from "@automapper/nestjs";
import { Task } from "../entities/task.entity";
import { TaskDomain } from "../domain/task";

export class TaskEntityMapperProfile extends AutomapperProfile {
    
  constructor(@InjectMapper() protected readonly mapper: Mapper) {
    super(mapper);
  }

  public override get profile(): MappingProfile {
    return (mapper) => {
      this.entity(mapper);
    };
  }

  private entity(mapper: Mapper): void {
    createMap(mapper, Task, TaskDomain);
  }
}