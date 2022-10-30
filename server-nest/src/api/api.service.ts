import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import { InjectDataSource } from "@nestjs/typeorm";

@Injectable()
export class ApiService {
  constructor(@InjectDataSource() private readonly connection: DataSource) {}

  isDatabaseConnected(): boolean {
    return this.connection.isInitialized;
  }
}
