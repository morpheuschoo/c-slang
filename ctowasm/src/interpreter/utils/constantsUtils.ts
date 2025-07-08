import { BinaryOperator, FloatDataType, IntegerDataType, ScalarCDataType } from "~src/common/types";
import { isIntegerType } from "~src/common/utils";
import { ConstantP } from "~src/processor/c-ast/expression/constants";
import { performBinaryOperation } from "~src/processor/evaluateCompileTimeExpression";
import { determineResultDataTypeOfBinaryExpression } from "~src/processor/expressionUtil";
import { getAdjustedIntValueAccordingToDataType } from "~src/processor/processConstant";
import { createMemoryAddress, MemoryAddress } from "~src/interpreter/utils/addressUtils";
import { Stash } from "~src/interpreter/utils/stash";

/**
 * Bottom evaluation is same as in ~src\processor\evaluateCompileTimeExpression.ts.
 * However, it has been fixed.
 * Adapted for the addition of MemoryAddress
 * 
 * TODO: I think for bitwise operators we need to test it
 */
export function performConstantAndAddressBinaryOperation(
  left: ConstantP | MemoryAddress,
  operator: BinaryOperator,
  right: ConstantP | MemoryAddress,
): ConstantP | MemoryAddress {
  let cLeft = left;
  let cRight = right;
  let addressReturn: boolean = false;
  let addressDataType: ScalarCDataType | undefined;

  if (Stash.isMemoryAddress(cLeft)) {
    addressDataType = cLeft.dataType;
    cLeft = convertMemoryAddressToConstant(cLeft);
    addressReturn = true;
  }
  if (Stash.isMemoryAddress(cRight)) {
    addressDataType = cRight.dataType;
    cRight = convertMemoryAddressToConstant(cRight);
    addressReturn = true;
  }
  
  let value = performBinaryOperation(
    Number(cLeft.value),
    operator,
    Number(cRight.value),
  );

  const dataType = determineResultDataTypeOfBinaryExpression(
    { type: "primary", primaryDataType: cLeft.dataType },
    { type: "primary", primaryDataType: cRight.dataType },
    operator,
  );

  if (dataType.type !== "primary") {
    throw new Error("invalid expression")
  };

  if (isIntegerType(dataType.primaryDataType)) {
    const valueInt = getAdjustedIntValueAccordingToDataType(
      BigInt(Math.floor(value)),
      dataType.primaryDataType,
    );

    if (addressReturn && addressDataType) {
      return createMemoryAddress(valueInt, addressDataType)
    }

    return {
      type: "IntegerConstant",
      dataType: dataType.primaryDataType as IntegerDataType,
      value: valueInt as bigint,
    };
  }

  return {
    type: "FloatConstant",
    dataType: dataType.primaryDataType as FloatDataType,
    value: value as number,
  }
}

function convertMemoryAddressToConstant(address: MemoryAddress): ConstantP {
  return {
    type: "IntegerConstant",
    value: address.value,
    dataType: "unsigned int"
  }
}
/**
 * Checks whether the ConstantP is true or false
 */
export function isConstantTrue(
  item: ConstantP
): item is ConstantP {
  return item.value !== 0n;
}