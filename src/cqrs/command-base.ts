import { Type } from "@nestjs/common";
import { ICommand } from "@nestjs/cqrs";
import { CQBase } from "./cq-base";

export abstract class CommandBase extends CQBase implements ICommand {}

export type CommandType = Type<CommandBase>;
