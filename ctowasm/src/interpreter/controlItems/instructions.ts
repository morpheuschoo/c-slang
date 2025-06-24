import { BinaryOperator, ScalarCDataType } from "~src/common/types";
import { CNodeP } from "~src/processor/c-ast/core";
import { Address } from "~src/processor/c-ast/memory";

/**
 * Types of instructions for the interpreter
 */
export enum InstructionType {
  BINARY_OP = "BINARY_OP",
  UNARY_OP = "UNARY_OP",
  BRANCH = "BRANCH",
  POP = "POP",
  ASSIGNMENT = "ASSIGNMENT"
}

export interface BaseInstruction {
  type: InstructionType;
}

export interface BinaryOpInstruction extends BaseInstruction {
  type: InstructionType.BINARY_OP;
  operator: BinaryOperator;
  dataType: ScalarCDataType;
}

export const binaryOpInstruction = (operator: BinaryOperator, dataType: ScalarCDataType): BinaryOpInstruction => ({
  type: InstructionType.BINARY_OP,
  operator,
  dataType,
});

export interface UnaryOpInstruction extends BaseInstruction {
  type: InstructionType.UNARY_OP;
  operator: string;
  dataType: ScalarCDataType;
}

export const unaryOpInstruction = (operator: string, dataType: ScalarCDataType): UnaryOpInstruction => ({
  type: InstructionType.UNARY_OP,
  operator,
  dataType,
});

export interface branchOpInstruction extends BaseInstruction {
  type: InstructionType.BRANCH;
  trueExpr: CNodeP;
  falseExpr: CNodeP;
}

export const branchOpInstruction = (trueExpr: CNodeP, falseExpr: CNodeP): branchOpInstruction => ({
  type: InstructionType.BRANCH,
  trueExpr,
  falseExpr,
});

export interface popInstruction extends BaseInstruction {
  type: InstructionType.POP;
}

export const popInstruction = (): popInstruction => ({
  type: InstructionType.POP,
})

// MEMORY
export interface AssignmentInstruction extends BaseInstruction {
  type: InstructionType.ASSIGNMENT;
  address: Address;
  dataType: ScalarCDataType;
}

export const assignmentInstruction = (address: Address, dataType: ScalarCDataType): AssignmentInstruction => ({
  type: InstructionType.ASSIGNMENT,
  address: address,
  dataType: dataType,
})

export type Instruction = 
  | BinaryOpInstruction
  | UnaryOpInstruction
  | branchOpInstruction
  | popInstruction
  | AssignmentInstruction;

export const isInstruction = (item: any): item is Instruction => {
  return item && typeof item === 'object' && 'type' in item && 
    Object.values(InstructionType).includes(item.type as InstructionType);
};