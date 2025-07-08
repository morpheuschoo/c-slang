import { SharedWasmGlobalVariables } from "~dist";
import { ScalarCDataType } from "~src/common/types";
import { CNodePBase } from "~src/processor/c-ast/core";
import { ConstantP } from "~src/processor/c-ast/expression/constants";
import { Address } from "~src/processor/c-ast/memory";
import { typeConversionInstruction } from "~src/interpreter/controlItems/instructions";
import { ControlItem } from "~src/interpreter/utils/control";

export interface RuntimeMemoryPair {
  type: "RuntimeMemoryPair";
  address: MemoryAddress;
  value: MemoryAddress | ConstantP;
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

export function resolveValueToConstantP(value: MemoryAddress | ConstantP): ConstantP {
    // if ConstantP return itself
    if (value.type === "IntegerConstant" || value.type === "FloatConstant") {
      return value;
    }

    // if MemoryAddress convert it to an unsigned int (equivalent)
    return {
      type: "IntegerConstant",
      value: value.value,
      dataType: "unsigned int"
    }
  }

export function convertAddressNodes(
  address: Address,
  dataType: ScalarCDataType, 
  isLoad: boolean, 
  memoryPointers: SharedWasmGlobalVariables
): ControlItem[] {
  switch(address.type) {
    case "LocalAddress":
      return [createMemoryAddress(
        BigInt(memoryPointers.basePointer.value) + address.offset.value,
        dataType
      )];
    case "DataSegmentAddress":
      return [createMemoryAddress(
        address.offset.value,
        dataType
      )];
    case "DynamicAddress":
      return [
        address.address,
        typeConversionInstruction(dataType),
      ]
    case "FunctionTableIndex":
      throw new Error("Memory for FunctionTableIndex not implemented")
    case "ReturnObjectAddress":
      if (isLoad) {
        if (address.subtype !== "load") {
          throw new Error("Expected 'load' in ReturnObjectAddress");
        }

        return [createMemoryAddress(
          BigInt(memoryPointers.stackPointer.value) + address.offset.value,
          dataType
        )];
      }

      if(address.subtype !== "store") {
        throw new Error("Expected 'store' in ReturnObjectAddress");
      }

      return [createMemoryAddress(
        BigInt(memoryPointers.basePointer.value) + address.offset.value,
        dataType
      )];
  }
}