// src/decorators/api.decorator.ts
import "reflect-metadata";

export const API_METADATA_KEY = "Router Config";

export interface ApiPropertyOptions {
  description?: string;
  required?: boolean;
  type?: any;
  isArray?: boolean;
  example?: any;
}

export interface ApiOperationOptions {
  summary?: string;
  description?: string;
  responses?: Record<string, any>;
}

export function ApiProperty(options: ApiPropertyOptions = {}) {
  return function (target: any, propertyKey: string) {
    const metadata = Reflect.getMetadata(API_METADATA_KEY, target.constructor) || {};
    metadata[propertyKey] = options;
    Reflect.defineMetadata(API_METADATA_KEY, metadata, target.constructor);
  };
}

export function ApiOperation(options: ApiOperationOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const metadata = Reflect.getMetadata(API_METADATA_KEY, target.constructor) || {};
    metadata[`${propertyKey}:operation`] = options;
    Reflect.defineMetadata(API_METADATA_KEY, metadata, target.constructor);
  };
}
