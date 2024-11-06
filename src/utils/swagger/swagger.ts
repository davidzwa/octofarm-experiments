// src/swagger/setup.ts
import { SwaggerGenerator } from "./generator";
import { setup, serve } from "swagger-ui-express";
import * as fs from "fs/promises";
import { Express } from "express";
import { AwilixContainer } from "awilix";

export async function setupSwagger(app: Express) {
  const generator = new SwaggerGenerator();
  const specification = await generator.generate("**/*.controller.ts");

  // Save specification to file
  await fs.writeFile("./swagger.json", JSON.stringify(specification, null, 2));

  // Setup Swagger UI
  app.use("/api-docs", serve, setup(specification));

  return specification;
}
