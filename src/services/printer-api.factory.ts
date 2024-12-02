import { BambuType, IPrinterApi, MoonrakerType, OctoprintType } from "@/services/printer-api.interface";
import { DITokens } from "@/container.tokens";
import { LoginDto } from "@/services/interfaces/login.dto";
import { PrinterCache } from "@/state/printer.cache";
import { IdType } from "@/shared.constants";

export class PrinterApiFactory {
  cradle: any;

  constructor(cradle: {}) {
    this.cradle = cradle;
  }

  getById(id: IdType): IPrinterApi {
    const login = (this.cradle[DITokens.printerCache] as PrinterCache).getLoginDto(id);
    return this.getScopedPrinter(login);
  }

  getScopedPrinter(login: LoginDto): IPrinterApi {
    let printerApi;
    if (login.printerType === OctoprintType) {
      printerApi = this.cradle[DITokens.octoprintApi] as IPrinterApi;
    } else if (login.printerType === MoonrakerType) {
      printerApi = this.cradle[DITokens.moonrakerApi] as IPrinterApi;
    } else if (login.printerType === BambuType) {
      printerApi = this.cradle[DITokens.bambuApi] as IPrinterApi;
    } else {
      throw new Error("PrinterType is unknown, cant pick the right socket adapter");
    }

    printerApi.login = login;
    return printerApi;
  }
}
