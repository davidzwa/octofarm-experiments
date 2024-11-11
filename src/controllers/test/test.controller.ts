import { Request, Response, RequestHandler } from "express";
import { createContainer, asClass } from "awilix";
import { buildCreateController } from "awilix-express";
import { AuthService } from "@/services/authentication/auth.service";

// Type for route handler that returns data instead of using res.send()
type TypedHandler<TResponse> = (req: Request) => Promise<TResponse>;

// Wrapper to convert our typed handlers to Express middleware
function createTypedHandler<TResponse>(handler: TypedHandler<TResponse>): RequestHandler {
  return async (req: Request, res: Response) => {
    try {
      const result = await handler(req);
      res.send(result);
    } catch (error) {
      // Handle errors appropriately
      res.status(500).send({ error: error.message });
    }
  };
}

// Decorator factory for typed routes
function TypedRoute<TResponse>(method: "get" | "post" | "put" | "delete", path: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    // Replace the method with our wrapped version
    descriptor.value = createTypedHandler(originalMethod);

    // Add route metadata
    Reflect.defineMetadata("method", method, target, propertyKey);
    Reflect.defineMetadata("path", path, target, propertyKey);

    return descriptor;
  };
}

// Shorthand decorators for different HTTP methods
export const Get = <TResponse>(path: string) => TypedRoute<TResponse>("get", path);
export const Post = <TResponse>(path: string) => TypedRoute<TResponse>("post", path);
export const Put = <TResponse>(path: string) => TypedRoute<TResponse>("put", path);
export const Delete = <TResponse>(path: string) => TypedRoute<TResponse>("delete", path);

// Keys for storing metadata
const API_TYPE_KEY = Symbol("API_TYPE");
const API_PARAM_KEY = Symbol("API_PARAM");
const API_RESPONSE_KEY = Symbol("API_RESPONSE");

// Type definitions
type HttpMethod = "get" | "post" | "put" | "delete" | "patch";
type ParamType = "body" | "query" | "path" | "header";

interface ApiParamMetadata {
  name: string;
  type: any;
  paramType: ParamType;
  required?: boolean;
  description?: string;
}

interface ApiResponseMetadata {
  type: any;
  description?: string;
  statusCode?: number;
}

export function ApiResponse(type: any, description?: string, statusCode: number = 200) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const metadata: ApiResponseMetadata = {
      type,
      description,
      statusCode,
    };
    Reflect.defineMetadata(API_RESPONSE_KEY, metadata, target, propertyKey);
  };
}

// Example usage in a controller:
class TokenResponse {
  accessToken: string;
  refreshToken: string;
}

interface LoginRequest {
  username: string;
  password: string;
}

// Optional: Base controller class to reduce boilerplate
abstract class TypedController {
  protected ok<T>(data: T) {
    return data;
  }

  protected created<T>(data: T) {
    // You could add metadata to tell the wrapper to set status 201
    Reflect.defineMetadata("status", 201, this);
    return data;
  }

  protected noContent() {
    Reflect.defineMetadata("status", 204, this);
    return null;
  }
}

class AuthController {
  constructor(private authService: AuthService) {}

  @Post<TokenResponse>("/login")
  @ApiResponse(TokenResponse)
  async login(req: Request) {
    const { username, password } = req.body as LoginRequest;

    // Now we just return the data!
    return await this.authService.loginUser(username, password);
  }

  // @Get<UserProfile>("/profile")
  // @ApiResponse(UserProfile)
  // async getProfile(req: Request): Promise<UserProfile> {
  //   const userId = req.user.id; // Assuming auth middleware sets this
  //   return await this.userService.getProfile(userId);
  // }
}
