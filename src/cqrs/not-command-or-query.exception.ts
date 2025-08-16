import { BadRequestException } from "@nestjs/common";

export class NotCommandOrQueryException extends BadRequestException {
  constructor(objectOrError?: string | object, description = "Not a Command or Query") {
    super(objectOrError, description);
  }
}