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
}

export function createMemoryAddress(value: bigint, dataType: ScalarCDataType): MemoryAddress {
  return {
    type: "MemoryAddress",
    value,
    hexValue: `0x${value.toString(16).padStart(8, '0')}`,
    dataType,
  };
}

export function isMemoryAddress(value: any): value is MemoryAddress {
  return value && typeof value === 'object' && value.type === 'MemoryAddress';
}