import { MemoryAddressMap } from "~src/processor/memoryAddressMap";
import { getDataTypeSize } from "~src/processor/dataTypeUtil";
import { SymbolTable } from "~src/processor/symbolTable";

export class MemoryManager {
  private addressMap: MemoryAddressMap;

  constructor() {
    this.addressMap = new MemoryAddressMap(getDataTypeSize);
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

  public debugPrint(): void {
    console.log("\n=== MEMORY ADDRESS MAP ===");
    console.log("Variable Name         | Scope           | Offset | Size");
    console.log("----------------------------------------------------");

    const map = this.addressMap.getAddressMap();

    // Group entries by scope for better organization
    const globalEntries: Array<[string, any]> = [];
    const localEntriesByFunction: Record<string, Array<[string, any]>> = {};

    map.forEach((entry, name) => {
      // Check if this is a scoped name (contains a dot)
      // const scopeMatch = name.name.match(/^(.+)\.(.+)$/);
      const scopeMatch = name.split("::");
      const varName = scopeMatch[1];
      const functionName = scopeMatch[0];

      if (entry.isGlobal && varName) {
        globalEntries.push([varName, entry]);
      } else if (varName && functionName) {
        if (!localEntriesByFunction[functionName]) {
          localEntriesByFunction[functionName] = [];
        }

        // Store with the real variable name (without scope prefix)
        localEntriesByFunction[functionName].push([varName, entry]);
      } else if(varName) {
        // Local variable without proper scope - fallback
        if (!localEntriesByFunction["unknown"]) {
          localEntriesByFunction["unknown"] = [];
        }
        localEntriesByFunction["unknown"].push([varName, entry]);
      } else {
        throw new Error("Error parsing MemoryAddressKey")
      }
    });

    // Print all variables in a flat list but with their scope displayed
    const allEntries: Array<[string, string, any]> = [];

    // Add global variables
    globalEntries.forEach(([name, entry]) => {
      allEntries.push([name, "global", entry]);
    });

    // Add local variables with their function name as scope
    Object.entries(localEntriesByFunction).forEach(([functionName, entries]) => {
      entries.forEach(([name, entry]) => {
        allEntries.push([name, functionName, entry]);
      });
    });

    // Sort by scope and then by offset
    allEntries.sort((a, b) => {
      if (a[1] !== b[1]) {
        // Sort global scope first
        if (a[1] === "global") return -1;
        if (b[1] === "global") return 1;
        // Then alphabetically by function name
        return a[1].localeCompare(b[1]);
      }
      // Within same scope, sort by offset
      return a[2].offset - b[2].offset;
    });

    // Print the sorted entries
    allEntries.forEach(([name, scope, entry]) => {
      console.log(
        `${name.padEnd(20)} | ${scope.padEnd(15)} | ` +
          `${entry.offset.toString().padEnd(6)} | ${entry.size} bytes`
      );
    });

    console.log("=============================================\n");
  }

}
