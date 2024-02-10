import { BaseService } from "@/services/orm/base.service";
import { SqliteIdType } from "@/shared.constants";
import { PrinterGroup } from "@/entities/printer-group.entity";
import { CreateGroupDto, PrinterGroupDto } from "@/services/interfaces/printer-group.dto";
import { IPrinterGroupService } from "@/services/interfaces/printer-group.service.interface";
import { Repository } from "typeorm";
import { Group } from "@/entities/group.entity";
import { TypeormService } from "@/services/typeorm/typeorm.service";
import { validate } from "class-validator";
import { NotFoundException } from "@/exceptions/runtime.exceptions";

export type GroupWithPrinters<KeyType extends string | number = number> = {
  id: KeyType;
  name: string;
  printers: PrinterGroup[];
};

export class PrinterGroupService
  extends BaseService(PrinterGroup, PrinterGroupDto)
  implements IPrinterGroupService<SqliteIdType>
{
  groupRepository: Repository<Group>;

  constructor({ typeormService }: { typeormService: TypeormService }) {
    super({ typeormService });

    this.groupRepository = typeormService.getDataSource().getRepository(Group);
  }

  async listGroups(): Promise<GroupWithPrinters[]> {
    const groups = await this.groupRepository.find();
    const groupListing: Record<number, GroupWithPrinters> = {};
    for (const group of groups) {
      groupListing[group.id] = {
        id: group.id,
        name: group.name,
        printers: [] as PrinterGroup[],
      };
    }

    for (const group of groups) {
      groupListing[group.id].printers = await this.repository.findBy({ groupId: group.id });
    }

    return Object.values(groupListing);
  }

  async getGroup(groupId: number) {
    const group = await this.groupRepository.findOneBy({ id: groupId });
    if (!group) {
      throw new NotFoundException("Group does not exist");
    }
    return group;
  }

  async getGroupWithPrinters(groupId: number): Promise<GroupWithPrinters> {
    const group = await this.getGroup(groupId);
    const printerGroups = await this.repository.findBy({ groupId: group.id });
    return {
      id: group.id,
      name: group.name,
      printers: printerGroups,
    };
  }

  async createGroup(dto: CreateGroupDto): Promise<GroupWithPrinters> {
    // Safety mechanism against upserts
    if (dto.id) {
      delete dto.id;
    }
    await validate(dto);
    const entity = this.groupRepository.create(dto);
    await validate(entity);
    const group = await this.groupRepository.save(entity);

    return await this.getGroupWithPrinters(group.id);
  }

  async addPrinterToGroup(groupId: number, printerId: number): Promise<PrinterGroup> {
    const group = await this.getGroup(groupId);
    const alreadyExisting = await this.repository.findOneBy({
      groupId: group.id,
      printerId,
    });
    if (alreadyExisting) return alreadyExisting;

    return await this.create({
      groupId: group.id,
      printerId,
    });
  }

  async removePrinterFromGroup(groupId: number, printerId: number): Promise<void> {
    await this.getGroup(groupId);
    await this.repository.delete({ groupId, printerId });
  }

  async deleteGroup(groupId: number): Promise<void> {
    const group = await this.getGroup(groupId);
    await this.groupRepository.delete({ id: group.id });
  }

  toDto(entity: PrinterGroup): PrinterGroupDto {
    return {
      printerId: entity.printerId,
      groupId: entity.groupId,
    };
  }
}