import { Type } from "@nestjs/common";

export abstract class CQBase {}

export type CQType = Type<CQBase>;