import { MemoryAddressMap } from "~src/processor/memoryAddressMap";
import { getDataTypeSize } from "~src/processor/dataTypeUtil";
import { SymbolTable } from "~src/processor/symbolTable";
import { ArrayDataType } from "../parser/c-ast/dataTypes";

export class MemoryManager {
  private addressMap: MemoryAddressMap;

  constructor() {
    this.addressMap = new MemoryAddressMap(getDataTypeSize);
  }

  public reload(): void {
    this.addressMap = new MemoryAddressMap(getDataTypeSize);
  }

  public initFromSymbolTable(symbolTable: SymbolTable): void {
    this.addressMap.buildFromSymbolTable(symbolTable);
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

  private getTypeDisplayString(entry: any): string {
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
    console.log("\n=== MEMORY ADDRESS MAP ===");
    console.log("Variable Name         | Scope           | Offset | Size   | Type");
    console.log("-----------------------------------------------------------------------");

    const map = this.addressMap.getAddressMap();

    const globalEntries: Array<[string, any]> = [];
    const localEntriesByFunction: Record<string, Array<[string, any]>> = {};

    map.forEach((entry, name) => {
      const scopeMatch = name.split("::");
      const varName = scopeMatch[1];
      const functionName = scopeMatch[0];

      if (entry.isGlobal && varName) {
        globalEntries.push([varName, entry]);
      } else if (varName && functionName) {
        if (!localEntriesByFunction[functionName]) {
          localEntriesByFunction[functionName] = [];
        }
        localEntriesByFunction[functionName].push([varName, entry]);
      } else if(varName) {
        if (!localEntriesByFunction["unknown"]) {
          localEntriesByFunction["unknown"] = [];
        }
        localEntriesByFunction["unknown"].push([varName, entry]);
      } else {
        throw new Error("Error parsing MemoryAddressKey")
      }
    });

    const allEntries: Array<[string, string, any]> = [];

    globalEntries.forEach(([name, entry]) => {
      allEntries.push([name, "global", entry]);
    });

    Object.entries(localEntriesByFunction).forEach(([functionName, entries]) => {
      entries.forEach(([name, entry]) => {
        allEntries.push([name, functionName, entry]);
      });
    });

    allEntries.sort((a, b) => {
      if (a[1] !== b[1]) {
        if (a[1] === "global") return -1;
        if (b[1] === "global") return 1;
        return a[1].localeCompare(b[1]);
      }
      return a[2].offset - b[2].offset;
    });

    allEntries.forEach(([name, scope, entry]) => {
      const typeStr = this.getTypeDisplayString(entry);
      console.log(
        `${name.padEnd(20)} | ${scope.padEnd(15)} | ` +
          `${entry.offset.toString().padEnd(6)} | ${entry.size.toString().padEnd(6)} | ${typeStr}`
      );
    });

    console.log("=============================================\n");
  }
}
