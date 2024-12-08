import { IsAlphanumeric } from "class-validator";
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, Relation } from "typeorm";
import { PrintLog } from "@/entities/print-log.entity";
import { BaseEntity } from "@/entities/base.entity";
import { PrinterGroup } from "@/entities/printer-group.entity";
import { OctoprintType } from "@/services/printer-api.interface";

@Entity()
export class Printer extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  printerURL!: string;

  @Column({ default: OctoprintType, nullable: false })
  printerType!: number;

  @Column({ default: "" })
  @IsAlphanumeric()
  apiKey!: string;

  @Column({
    nullable: false,
    default: true,
  })
  enabled: boolean = true;

  @Column({
    nullable: true,
  })
  disabledReason?: string;

  @Column({
    nullable: true,
  })
  assignee?: string;

  @OneToMany(() => PrintLog, (pc) => pc.printer)
  printCompletions!: Relation<PrintLog>[];

  @OneToMany(() => PrinterGroup, (pc) => pc.printer)
  printerGroups!: Relation<PrinterGroup>[];

  @CreateDateColumn({ type: "int" })
  dateAdded!: number;

  @Column({ nullable: true })
  feedRate?: number;

  @Column({ nullable: true })
  flowRate?: number;
}
