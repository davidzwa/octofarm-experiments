const PrinterFloorModel = require("../models/PrinterFloor");
const _ = require("lodash");
const { validateInput } = require("../handlers/validators");
const { NotFoundException } = require("../exceptions/runtime.exceptions");
const {
  createPrinterFloorRules,
  updatePrinterFloorNameRules,
  printerGroupInFloorRules,
  updatePrinterFloorNumberRules,
} = require("./validators/printer-floor-service.validation");

class PrinterFloorService {
  #printerGroupService;
  #logger;

  constructor({ printerGroupService, loggerFactory }) {
    this.#printerGroupService = printerGroupService;
    this.#logger = loggerFactory("PrinterFloorService");
  }

  /**
   * Lists the printer groups present in the database.
   */
  async list() {
    return PrinterFloorModel.find({});
  }

  async get(floorId, throwError = true) {
    const printerFloor = await PrinterFloorModel.findOne({ _id: floorId });
    if (!printerFloor && throwError) {
      throw new NotFoundException(`Printer floor with id ${floorId} does not exist.`);
    }

    return printerFloor;
  }

  /**
   * Stores a new printer group into the database.
   * @param {Object} floor object to create.
   * @throws {Error} If the printer group is not correctly provided.
   */
  async create(floor) {
    if (!floor) throw new Error("Missing printer-floor input to create");

    const validatedInput = await validateInput(floor, createPrinterFloorRules);
    return PrinterFloorModel.create(validatedInput);
  }

  async updateName(floorId, input) {
    const printerFloor = await this.get(floorId);

    const { name } = await validateInput(input, updatePrinterFloorNameRules);
    printerFloor.name = name;
    return await printerFloor.save();
  }

  async updateFloorNumber(floorId, input) {
    const printerFloor = await this.get(floorId);

    const { floor } = await validateInput(input, updatePrinterFloorNumberRules);
    printerFloor.floor = floor;
    return await printerFloor.save();
  }

  /**
   * Updates the printerGroup present in the database.
   * @param {Object} printerFloor object to create.
   */
  async update(printerFloor) {
    return PrinterFloorModel.updateOne(printerFloor.id, printerFloor);
  }

  async addOrUpdatePrinterGroup(floorId, printerGroupInFloor) {
    const floor = await this.get(floorId);
    if (!floor) throw new NotFoundException("This floor does not exist", "floorId");

    const validInput = await validateInput(printerGroupInFloor, printerGroupInFloorRules);

    const foundPrinterGroupInFloorIndex = floor.printerGroups.findIndex(
      (pgif) => pgif.printerGroupId.toString() === validInput.printerGroupId
    );
    if (foundPrinterGroupInFloorIndex !== -1) {
      floor.printerGroups[foundPrinterGroupInFloorIndex] = validInput;
      return floor;
    } else {
      floor.printerGroups.push(validInput);
    }

    await floor.save();

    return floor;
  }

  async removePrinterGroup(floorId, input) {
    const validInput = await validateInput(input, printerGroupInFloorRules);
    const floor = await this.get(floorId);
    if (!floor) throw new NotFoundException("This floor does not exist", "printerFloorId");

    const foundPrinterGroupInFloorIndex = floor.printerGroups.findIndex(
      (pgif) => pgif.printerGroupId.toString() === validInput.printerGroupId
    );
    if (foundPrinterGroupInFloorIndex === -1) return floor;
    floor.printerGroups.splice(foundPrinterGroupInFloorIndex, 1);
    return await floor.save();
  }

  async delete(floorId) {
    return PrinterFloorModel.deleteOne({ _id: floorId });
  }
}

module.exports = PrinterFloorService;
