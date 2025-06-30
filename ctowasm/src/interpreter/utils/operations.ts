import { BinaryOperator, FloatDataType, IntegerDataType } from "~src/common/types";
import { isIntegerType } from "~src/common/utils";
import { ConstantP } from "~src/processor/c-ast/expression/constants";
import { performBinaryOperation } from "~src/processor/evaluateCompileTimeExpression";
import { determineResultDataTypeOfBinaryExpression } from "~src/processor/expressionUtil";
import { getAdjustedIntValueAccordingToDataType } from "~src/processor/processConstant";

/**
 * Bottom evaluation is same as in ~src\processor\evaluateCompileTimeExpression.ts.
 * However, it has been fixed.
 * 
 * NOTE: I think for bitwise operators we need to test it
 */
export function performConstantBinaryOperation(
  left: ConstantP,
  operator: BinaryOperator,
  right: ConstantP,
): ConstantP {
  let value = performBinaryOperation(
    Number(left.value),
    operator,
    Number(right.value),
  );

  const dataType = determineResultDataTypeOfBinaryExpression(
    { type: "primary", primaryDataType: left.dataType },
    { type: "primary", primaryDataType: right.dataType },
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

/**
 * Checks whether the ConstantP is true or false
 */
export function isConstantTrue(
  item: ConstantP
): item is ConstantP {
  return item.value !== 0n;
}