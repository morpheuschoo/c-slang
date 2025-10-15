import {
  BinaryOperator,
  FloatDataType,
  IntegerDataType,
} from "~src/common/types";
import { isIntegerType } from "~src/common/utils";
import { ConstantP } from "~src/processor/c-ast/expression/constants";
import { performBinaryOperation } from "~src/processor/evaluateCompileTimeExpression";
import { determineResultDataTypeOfBinaryExpression } from "~src/processor/expressionUtil";
import { getAdjustedIntValueAccordingToDataType } from "~src/processor/processConstant";
import {
  createMemoryAddress,
  MemoryAddress,
} from "~src/interpreter/utils/addressUtils";
import { Stash } from "~src/interpreter/utils/stash";
import { Position } from "~src/parser/c-ast/misc";

export const defaultPosition: Position = {
  start: {
    line: 0,
    column: 0,
    offset: 0,
  },
  end: {
    line: 0,
    column: 0,
    offset: 0,
  },
};

/**
 * Bottom evaluation is same as in ~src\processor\evaluateCompileTimeExpression.ts.
 * However, it has been fixed.
 * Adapted for the addition of MemoryAddress
 */
export function performConstantAndAddressBinaryOperation(
  left: ConstantP | MemoryAddress,
  operator: BinaryOperator,
  right: ConstantP | MemoryAddress,
): ConstantP | MemoryAddress {
  let cLeft = left;
  let cRight = right;
  let addressReturn: boolean = false;

  if (Stash.isMemoryAddress(cLeft)) {
    cLeft = convertMemoryAddressToConstant(cLeft);
    addressReturn = true;
  }
  if (Stash.isMemoryAddress(cRight)) {
    cRight = convertMemoryAddressToConstant(cRight);
    addressReturn = true;
  }

  const dataType = determineResultDataTypeOfBinaryExpression(
    { type: "primary", primaryDataType: cLeft.dataType },
    { type: "primary", primaryDataType: cRight.dataType },
    operator,
  );

  if (dataType.type !== "primary") {
    throw new Error("invalid expression");
  }

  let leftVal: bigint | number;
  let rightVal: bigint | number;

  /**
   * there is a need to ensure that both leftVal and rightVal are same types (both bigint or number)
   * so that performBinaryOperation will give a result as intended
   *
   * only for unsigned long and signed long we convert them into BigInt so that we get the full 64-bit range
   * this ensures that the calculations with longs produce the correct value and do not overflow
   *
   * for int, float and double we convert them to number so it adheres to the 32-bit range
   * this ensures that for bitwise operators, they give the correct wrong value
   */
  if (
    dataType.primaryDataType === "unsigned long" ||
    dataType.primaryDataType === "signed long"
  ) {
    leftVal = BigInt(cLeft.value);
    rightVal = BigInt(cRight.value);
  } else {
    leftVal = Number(cLeft.value);
    rightVal = Number(cRight.value);
  }

  const value = performBinaryOperation(leftVal, operator, rightVal);

  if (isIntegerType(dataType.primaryDataType)) {
    const valueInt = getAdjustedIntValueAccordingToDataType(
      typeof value === "bigint" ? value : BigInt(Math.floor(value)),
      dataType.primaryDataType,
    );

    if (addressReturn) {
      return createMemoryAddress(valueInt);
    }

    return {
      type: "IntegerConstant",
      dataType: dataType.primaryDataType as IntegerDataType,
      value: valueInt as bigint,
      position: defaultPosition,
    };
  }

  return {
    type: "FloatConstant",
    dataType: dataType.primaryDataType as FloatDataType,
    value: value as number,
    position: defaultPosition,
  };
}

function convertMemoryAddressToConstant(address: MemoryAddress): ConstantP {
  return {
    type: "IntegerConstant",
    value: address.value,
    dataType: "unsigned int",
    position: defaultPosition,
  };
}
/**
 * Checks whether the ConstantP is true or false
 */
export function isConstantTrue(item: ConstantP): item is ConstantP {
  return item.value !== 0n;
}
