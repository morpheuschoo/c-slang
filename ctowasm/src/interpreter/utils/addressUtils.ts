import { ScalarCDataType } from "~src/common/types";
import { ConstantP } from "~src/processor/c-ast/expression/constants";
import { defaultPosition } from "./constantsUtils";

export interface RuntimeMemoryPair {
  type: "RuntimeMemoryPair";
  address: MemoryAddress;
  value: MemoryAddress | ConstantP;
  dataType: ScalarCDataType;
}

export interface MemoryAddress {
  type: "MemoryAddress";
  value: bigint;
  hexValue: string;
}

export function createMemoryAddress(value: bigint): MemoryAddress {
  return {
    type: "MemoryAddress",
    value,
    hexValue: `0x${value.toString(16).padStart(8, "0")}`,
  };
}

export function resolveValueToConstantP(
  value: MemoryAddress | ConstantP,
): ConstantP {
  // if ConstantP return itself
  if (value.type === "IntegerConstant" || value.type === "FloatConstant") {
    return value;
  }

  // if MemoryAddress convert it to an unsigned int (equivalent)
  return {
    type: "IntegerConstant",
    value: value.value,
    dataType: "unsigned int",
    position: defaultPosition,
  };
}
