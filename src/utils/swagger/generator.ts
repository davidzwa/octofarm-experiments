import { OpenAPIObject, PathItemObject, SchemaObject } from "openapi3-ts/oas31";
import { API_METADATA_KEY } from "@/utils/swagger/decorators";
import { findControllers } from "awilix-express";
import { IRouteConfig, MethodName } from "awilix-router-core/lib/state-util";

export class SwaggerGenerator {
  private readonly openApiDoc: OpenAPIObject = {
    openapi: "3.0.0",
    info: {
      title: "API Documentation",
      version: "1.0.0",
    },
    paths: {},
    components: {
      schemas: {},
    },
  };

  constructor() {}

  public async generate(): Promise<OpenAPIObject> {
    try {
      const routePath = "../../controllers";
      const discoveredControllers = findControllers(`${routePath}/*.controller.*`, {
        cwd: __dirname,
        ignore: "**/*.map",
        absolute: true,
      });
      for (const registration of discoveredControllers) {
        await this.processController(registration);
      }
    } catch (error) {
      console.error("Generate swagger error: ", error);
    }

    return this.openApiDoc;
  }

  private async processController(prototype: ReturnType<typeof findControllers>[number]) {
    for (const [methodName, methodConfig] of prototype.state.methods) {
      if (methodConfig.paths.length > 0) {
        await this.processMethod(prototype, prototype.state.root, methodName, methodConfig);
      }
    }
  }

  private async processMethod(
    controller: ReturnType<typeof findControllers>[number],
    root: IRouteConfig,
    methodName: MethodName,
    methodConfig: IRouteConfig
  ) {
    const method = methodName.toString();
    const name = method.toLowerCase();
    for (let path of methodConfig.paths) {
      path = root.paths[0] + path;

      const metadata = Reflect.getMetadata(API_METADATA_KEY, controller.target);
      for (const verb of methodConfig.verbs) {
        const key = `${name}:operation`;
        const description = metadata?.hasOwnProperty(key) ? metadata[key] : null;

        const operation: PathItemObject = {
          [verb.toLowerCase()]: {
            tags: [controller.target.name],
            summary: description?.summary ?? method,
            description: description?.description ?? "",
            responses: description?.responses ?? {
              "200": {
                description: "Successful response",
              },
            },
          },
        };

        // Process method parameters and response type
        const paramTypes = Reflect.getMetadata("design:paramtypes", controller, name);
        const returnType = Reflect.getMetadata("design:returntype", controller, name);

        const httpMethod = methodConfig.verbs[0].toLowerCase();
        if (paramTypes) {
          operation[httpMethod].parameters = this.processParameterTypes(paramTypes);
        }

        if (returnType) {
          operation[httpMethod].responses["200"].content = {
            "application/json": {
              schema: this.processReturnType(returnType),
            },
          };
        }

        this.openApiDoc.paths[path] = {
          ...this.openApiDoc.paths[path],
          ...operation,
        };
      }
    }
  }

  private processParameterTypes(types: any[]): any[] {
    return types.map((type) => this.createParameterDefinition(type));
  }

  private processReturnType(type: any): SchemaObject {
    return this.createSchemaDefinition(type);
  }

  private createSchemaDefinition(type: any): SchemaObject {
    // Implementation for creating OpenAPI schema from TypeScript type
    // This is a simplified version - you'll want to expand this
    return {
      type: "object",
      properties: this.getTypeProperties(type),
    };
  }

  private createParameterDefinition(type: any): any {
    // Implementation for creating parameter definitions
    return {
      in: "body",
      schema: this.createSchemaDefinition(type),
    };
  }

  private getTypeProperties(type: any): Record<string, any> {
    const properties: Record<string, any> = {};
    const metadata = Reflect.getMetadata(API_METADATA_KEY, type) || {};

    Object.keys(metadata).forEach((key) => {
      properties[key] = {
        type: this.getPropertyType(metadata[key].type),
        description: metadata[key].description,
        example: metadata[key].example,
      };
    });

    return properties;
  }

  private getPropertyType(type: any): string {
    const typeMap: Record<string, string> = {
      String: "string",
      Number: "number",
      Boolean: "boolean",
      Object: "object",
      Array: "array",
    };

    return typeMap[type?.name] || "string";
  }
}
