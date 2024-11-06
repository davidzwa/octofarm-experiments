// src/types/dto.example.ts
import { ApiOperation, ApiProperty } from "@/utils/swagger/decorators";

export class CreateUserDTO {
  @ApiProperty({
    description: "The user's email address",
    type: String,
    example: "user@example.com",
  })
  email: string;

  @ApiProperty({
    description: "The user's full name",
    type: String,
    example: "John Doe",
  })
  name: string;
}

// src/controllers/user.controller.ts
// import { CreateUserDTO } from "../types/dto.example";

export class UserController {
  @ApiOperation({
    summary: "Create a new user",
    description: "Creates a new user with the provided information",
    responses: {
      "201": {
        description: "User created successfully",
      },
    },
  })
  async createUser(dto: CreateUserDTO) {
    // Implementation
  }
}
