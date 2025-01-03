import { IdType } from "@/shared.constants";
import { LoginDto } from "@/services/interfaces/login.dto";

export class Adapter {
  /**
   * Setup live connection with different strategies. Method guarantees a connection or failure within a specific time.
   * @param id
   * @param loginDto
   */
  async connect(id: IdType, loginDto: LoginDto): Promise<void> {}

  async reconnect(): Promise<void> {}

  async disconnect(): Promise<void> {}
}
