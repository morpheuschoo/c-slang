import { SymbolTable, VariableSymbolEntry } from "~src/processor/symbolTable";
import { DataType } from "../parser/c-ast/dataTypes";

export interface MemoryAddressEntry {
  name: string;
  offset: number;
  isGlobal: boolean;
  size: number;
  dataType: DataType;
  value?: number;
  absoluteAddress?: number;
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
  private addressMap: Map<string, MemoryAddressEntry> = new Map();
  private scopeChain: string[] = [];

  addVariable(name: string, entry: MemoryAddressEntry): void {
    const scopedName = this.getScopedName(name);
    this.addressMap.set(
      new MemoryAddressKey(name, scopedName, entry.offset).toString(),
      entry
    );
  }

  // getVariableAddress(name: string): MemoryAddressEntry | undefined {
  //   const scopedName = this.getScopedName(name);
  //   if (this.addressMap.has(scopedName)) {
  //     return this.addressMap.get(scopedName);
  //   }

  //   if (this.addressMap.has(name)) {
  //     return this.addressMap.get(name);
  //   }

  //   return undefined;
  // }

  // getEffectiveAddress(name: string): number | undefined {
  //   const entry = this.getVariableAddress(name);
  //   if (!entry) return undefined;

  //   return entry.absoluteAddress !== undefined
  //     ? entry.absoluteAddress
  //     : entry.offset;
  // }

  pushScope(scopeName: string): void {
    this.scopeChain.push(scopeName);
  }

  popScope(): string | undefined {
    return this.scopeChain.pop();
  }

  private getScopedName(name: string): string {
    if (this.scopeChain.length === 0) {
      return name;
    }
    return this.scopeChain[this.scopeChain.length - 1];
    // return `${this.scopeChain.join(".")}.${name}`;
  }

  static buildFromSymbolTable(
    symbolTable: SymbolTable,
    getDataTypeSize: (dataType: any) => number
  ): MemoryAddressMap {
    const map = new MemoryAddressMap();

    function processSymbolTable(table: SymbolTable, isGlobal: boolean): void {
      if (!isGlobal) {
        map.pushScope(getFunctionNameFromSymbolTable(table));
      }

      for (const [name, entry] of Object.entries(table.symbols)) {
        if (
          entry.type === "localVariable" ||
          entry.type === "dataSegmentVariable"
        ) {
          const varEntry = entry as VariableSymbolEntry;
          map.addVariable(name, {
            name,
            offset: varEntry.offset,
            isGlobal: entry.type === "dataSegmentVariable",
            size: getDataTypeSize(varEntry.dataType),
            dataType: varEntry.dataType,
          });
        }
      }

      if (!isGlobal) {
        map.popScope();
      }
    }

    function getFunctionNameFromSymbolTable(table: SymbolTable): string {
      return "function_" + Math.random().toString(36).substring(2, 9);
    }

    processSymbolTable(getRootSymbolTable(symbolTable), true);
    processFunctionScopes(symbolTable, processSymbolTable);

    return map;
  }

  public debugPrint(): void {
    console.log("=== Memory Address Map ===");

    // Convert the Map to an array for easier logging
    const entries: Array<[string, any]> = [];
    this.addressMap.forEach((entry, name) => {
      const parts = name.split("::");
      if(!parts[1]) {
        throw new Error("Cannot parse MemoryAddressKey");
      }
      
      entries.push([parts[1], entry]);
    });

    // Sort by address for cleaner output
    entries.sort((a, b) => a[1].offset - b[1].offset);

    entries.forEach(([name, entry]) => {
      console.log(
        `${name.padEnd(20)} | ${entry.isGlobal ? "Global" : "Local"} | ` +
          `Offset: ${entry.offset} | Size: ${entry.size} bytes`
      );
    });

    console.log("========================");
  }

  getAddressMap(): Map<string, MemoryAddressEntry> {
    return this.addressMap;
  }
}

function getRootSymbolTable(symbolTable: SymbolTable): SymbolTable {
  let current = symbolTable;
  while (current.parentTable !== null) {
    current = current.parentTable;
  }
  return current;
}

function processFunctionScopes(
  symbolTable: SymbolTable,
  processFn: (table: SymbolTable, isGlobal: boolean) => void
): void {
  const functionNames: string[] = [];
  for (const [name, entry] of Object.entries(symbolTable.symbols)) {
    if (entry.type === "function") {
      functionNames.push(name);
    }
  }

  console.log(`Found ${functionNames.length} functions to process`);

  for (const entry of symbolTable.functionTable) {
    if (entry.isDefined) {
      const functionName = entry.functionName;
      console.log(`Processing local variables for function: ${functionName}`);

      processFn(symbolTable, false);
    }
  }
}
