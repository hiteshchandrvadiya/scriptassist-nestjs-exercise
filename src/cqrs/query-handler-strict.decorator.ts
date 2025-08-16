import 'reflect-metadata';
import { QUERY_HANDLER_METADATA, QUERY_METADATA } from './constants';
import { QueryBase } from './query-base';

export const QueryHandlerStrict = (query: QueryBase): ClassDecorator => {
  return (target: object) => {
    if (!Reflect.hasOwnMetadata(QUERY_METADATA, query)) {
      Reflect.defineMetadata(QUERY_METADATA, { id: crypto.randomUUID() }, query);
    }
    Reflect.defineMetadata(QUERY_HANDLER_METADATA, query, target);
  }
}