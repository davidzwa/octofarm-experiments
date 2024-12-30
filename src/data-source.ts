import "reflect-metadata";
import { DataSource } from "typeorm";
import dotenv from "dotenv";
import { join } from "path";
import { AppConstants } from "@/server.constants";
import { superRootPath } from "./utils/fs.utils";
import { Floor } from "@/entities/floor.entity";
import { FloorPosition } from "@/entities/floor-position.entity";
import { Printer } from "@/entities/printer.entity";
import { Settings } from "@/entities/settings.entity";
import { Permission, PrintCompletion, RefreshToken, User } from "@/entities";
import { CameraStream } from "@/entities/camera-stream.entity";
import { CustomGcode } from "@/entities/custom-gcode.entity";
import { Role } from "@/entities/role.entity";
import { UserRole } from "@/entities/user-role.entity";
import { InitSqlite1706829146617 } from "@/migrations/1706829146617-InitSqlite";
import { PrinterGroup } from "@/entities/printer-group.entity";
import { Group } from "@/entities/group.entity";
import { PrinterGroup1707494762198 } from "@/migrations/1707494762198-PrinterGroup";
import { ChangePrintCompletionDeletePrinterCascade1708465930665 } from "@/migrations/1708465930665-ChangePrintCompletionDeletePrinterCascade";
import { ChangeRoleNameUnique1713300747465 } from "@/migrations/1713300747465-ChangeRoleNameUnique";
import { RemovePrinterFile1720338804844 } from "@/migrations/1720338804844-RemovePrinterFile";
import { AddPrinterType1713897879622 } from "@/migrations/1713897879622-AddPrinterType";

dotenv.config({
  path: join(superRootPath(), ".env"),
});

const dbFolder = process.env[AppConstants.DATABASE_PATH] || "./database";
const dbFile = process.env[AppConstants.DATABASE_FILE] || "./fdm-monster.sqlite";
const dbName = dbFile === ":memory:" ? dbFile : join(superRootPath(), dbFolder, dbFile);

// This is verbose
// console.log("Executing config", __filename, "\nDir", __dirname, "\nUsing database:", dbName, "\n");

export const AppDataSource = new DataSource({
  type: "better-sqlite3",
  database: dbName,
  synchronize: false,
  logging: false,
  entities: [
    Floor,
    FloorPosition,
    Printer,
    Settings,
    User,
    CameraStream,
    CustomGcode,
    Role,
    Permission,
    RefreshToken,
    PrintCompletion,
    UserRole,
    Group,
    PrinterGroup,
  ],
  migrations: [
    InitSqlite1706829146617,
    PrinterGroup1707494762198,
    ChangePrintCompletionDeletePrinterCascade1708465930665,
    ChangeRoleNameUnique1713300747465,
    RemovePrinterFile1720338804844,
    AddPrinterType1713897879622,
  ],
  subscribers: [],
});
