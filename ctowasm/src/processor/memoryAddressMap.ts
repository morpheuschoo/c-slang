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
      return name;
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
        this.addVariable(name, {
          name,
          offset: varEntry.offset,
          isGlobal: entry.type === "dataSegmentVariable",
          size: this.getDataTypeSize(varEntry.dataType),
          dataType: varEntry.dataType,
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
        this.processSymbolTable(symbolTable, false);
      }
    }
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
