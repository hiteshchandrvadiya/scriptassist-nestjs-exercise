import { Type } from "@nestjs/common";
import { IQuery } from "@nestjs/cqrs";
import { CQBase } from "./cq-base";

export abstract class QueryBase extends CQBase implements IQuery {}

export type QueryType = Type<QueryBase>;
