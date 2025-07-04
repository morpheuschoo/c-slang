import { ScalarCDataType } from "~src/common/types";
import { CNodePBase } from "~src/processor/c-ast/core";
import { StashItem } from "~src/interpreter/utils/stash";

export interface RuntimeMemoryPair {
  type: "RuntimeMemoryPair";
  address: MemoryAddress;
  value: StashItem;
}

export interface MemoryAddress extends CNodePBase{
  type: "MemoryAddress";
  value: bigint;
  hexValue: string;
  dataType: ScalarCDataType;
  targetType?: ScalarCDataType; // if dataType is "pointer", this field refers to the type that it is pointing to
}

export function createMemoryAddress(
  value: bigint,
  dataType: ScalarCDataType,
  targetType?: ScalarCDataType
): MemoryAddress {
  const hexValue = `0x${value.toString(16).padStart(8, '0')}`;
  if (targetType !== undefined) {
    return {
      type: "MemoryAddress",
      value,
      hexValue,
      dataType,
      targetType
    }
  }

  return {
    type: "MemoryAddress",
    value,
    hexValue,
    dataType,
  };
}

export function isMemoryAddress(value: any): value is MemoryAddress {
  return value && typeof value === 'object' && value.type === 'MemoryAddress';
}