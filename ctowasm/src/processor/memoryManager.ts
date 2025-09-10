import { MemoryAddressMap } from "~src/processor/memoryAddressMap";
import { getDataTypeSize } from "~src/processor/dataTypeUtil";
import { SymbolTable } from "~src/processor/symbolTable";

class MemoryManager {
  private static instance: MemoryManager;
  private addressMap: MemoryAddressMap;

  private constructor() {
    this.addressMap = new MemoryAddressMap();
  }

  public reload() {
    if (MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
  }

  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  public initFromSymbolTable(symbolTable: SymbolTable): void {
    this.addressMap = MemoryAddressMap.buildFromSymbolTable(
      symbolTable,
      getDataTypeSize
    );
  }

  public getVariableAddress(name: string): number | undefined {
    const entry = this.addressMap.getVariableAddress(name);
    return entry?.offset;
  }

  public getAddressMap(): MemoryAddressMap {
    return this.addressMap;
  }

  public enterScope(scopeName: string): void {
    this.addressMap.pushScope(scopeName);
  }

  public exitScope(): void {
    this.addressMap.popScope();
  }
}

export const memoryManager = MemoryManager.getInstance();
