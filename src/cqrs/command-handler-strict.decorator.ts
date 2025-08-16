import 'reflect-metadata';
import { COMMAND_HANDLER_METADATA, COMMAND_METADATA } from './constants';
import { CommandBase } from './command-base';

export const CommandHandlerStrict = (command: CommandBase): ClassDecorator => {
  return (target: object) => {
    if (!Reflect.hasOwnMetadata(COMMAND_METADATA, command)) {
      Reflect.defineMetadata(COMMAND_METADATA, { id: crypto.randomUUID() }, command);
    }
    Reflect.defineMetadata(COMMAND_HANDLER_METADATA, command, target);
  };
};