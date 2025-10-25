import { SymbolTable, VariableSymbolEntry } from "~src/processor/symbolTable";
import { DataType, ArrayDataType } from "../parser/c-ast/dataTypes";

export interface MemoryAddressEntry {
  name: string;
  offset: number;
  isGlobal: boolean;
  size: number;
  dataType: DataType;
  value?: number | number[];
  absoluteAddress?: number;
  isArray?: boolean;
  arraySize?: number;
  elementSize?: number;
}

export class MemoryAddressKey {
  name: string;
  scope: string;
  offset: number;

  constructor(name: string, scope: string, offset: number) {
    this.name = name;
    this.scope = scope;
    this.offset = offset;
  }

  public toString(): string {
    return `${this.scope}::${this.name}::${this.offset.toString()}`;
  }
}

export class MemoryAddressMap {
  private addressMap: Map<string, MemoryAddressEntry>;
  private scopeChain: string[];
  private getDataTypeSize: (dataType: any) => number;

  constructor(getDataTypeSize: (dataType: any) => number) {
    this.addressMap = new Map();
    this.scopeChain = [];
    this.getDataTypeSize = getDataTypeSize;
  }

  addVariable(name: string, entry: MemoryAddressEntry): void {
    const scopedName = this.getScopedName(name);

    if (entry.dataType.type === "array") {
      const arrayType = entry.dataType as ArrayDataType;
      entry.isArray = true;
      entry.elementSize = this.getDataTypeSize(arrayType.elementDataType);
    }

    this.addressMap.set(
      new MemoryAddressKey(name, scopedName, entry.offset).toString(),
      entry
    );
  }

  pushScope(scopeName: string): void {
    this.scopeChain.push(scopeName);
  }

  popScope(): string | undefined {
    return this.scopeChain.pop();
  }

  private getScopedName(name: string): string {
    if (this.scopeChain.length === 0) {
      return "global";
    }
    return this.scopeChain[this.scopeChain.length - 1];
  }

  buildFromSymbolTable(symbolTable: SymbolTable): void {
    this.processSymbolTable(this.getRootSymbolTable(symbolTable), true);
    this.processFunctionScopes(symbolTable);
  }

  private processSymbolTable(table: SymbolTable, isGlobal: boolean): void {
    if (!isGlobal) {
      this.pushScope(this.getFunctionNameFromSymbolTable(table));
    }

    for (const [name, entry] of Object.entries(table.symbols)) {
      if (entry.type === "localVariable" || entry.type === "dataSegmentVariable") {
        const varEntry = entry as VariableSymbolEntry;
        const isArray = varEntry.dataType.type === "array";

        let arraySize: number | undefined;
        let elementSize: number | undefined;

        if (isArray) {
          const arrayType = varEntry.dataType as ArrayDataType;
          elementSize = this.getDataTypeSize(arrayType.elementDataType);
          // arraySize needs to be computed from numElements expression
          // This should be done during processing, not here
        }

        this.addVariable(name, {
          name,
          offset: varEntry.offset,
          isGlobal: entry.type === "dataSegmentVariable",
          size: this.getDataTypeSize(varEntry.dataType),
          dataType: varEntry.dataType,
          isArray,
          arraySize,
          elementSize,
        });
      }
    }

    if (!isGlobal) {
      this.popScope();
    }
  }

  private getFunctionNameFromSymbolTable(table: SymbolTable): string {
    return "function_" + Math.random().toString(36).substring(2, 9);
  }

  private getRootSymbolTable(symbolTable: SymbolTable): SymbolTable {
    let current = symbolTable;
    while (current.parentTable !== null) {
      current = current.parentTable;
    }
    return current;
  }

  private processFunctionScopes(symbolTable: SymbolTable): void {
    for (const entry of symbolTable.functionTable) {
      if (entry.isDefined) {
        this.processSymbolTable(symbolTable, false);
      }
    }
  }

  private getTypeDisplayString(entry: MemoryAddressEntry): string {
    if (entry.isArray && entry.dataType.type === "array") {
      const arrayType = entry.dataType as ArrayDataType;
      const elementType = arrayType.elementDataType.type === "primary"
        ? arrayType.elementDataType.primaryDataType
        : arrayType.elementDataType.type;
      return `array[${entry.arraySize || "?"}] of ${elementType}`;
    }

    if (entry.dataType.type === "primary") {
      return entry.dataType.primaryDataType;
    }

    return entry.dataType.type;
  }

  public debugPrint(): void {
    console.log("=== Memory Address Map ===");

    const entries: Array<[string, any]> = [];
    this.addressMap.forEach((entry, name) => {
      const parts = name.split("::");
      if(!parts[1]) {
        throw new Error("Cannot parse MemoryAddressKey");
      }

      entries.push([parts[1], entry]);
    });

    entries.sort((a, b) => a[1].offset - b[1].offset);

    entries.forEach(([name, entry]) => {
      const typeStr = this.getTypeDisplayString(entry);
      console.log(
        `${name.padEnd(20)} | ${entry.isGlobal ? "Global" : "Local"} | ` +
          `Offset: ${entry.offset} | Size: ${entry.size} bytes | Type: ${typeStr}`
      );
    });

    console.log("========================");
  }

  getAddressMap(): Map<string, MemoryAddressEntry> {
    return this.addressMap;
  }
}
