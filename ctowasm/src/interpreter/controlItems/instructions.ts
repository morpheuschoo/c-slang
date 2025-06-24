import { ScalarCDataType } from "~src/common/types";
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
  operator: string;
}

export const binaryOpInstruction = (operator: string): BinaryOpInstruction => ({
  type: InstructionType.BINARY_OP,
  operator,
});

export interface UnaryOpInstruction extends BaseInstruction {
  type: InstructionType.UNARY_OP;
  operator: string;
}

export const unaryOpInstruction = (operator: string): UnaryOpInstruction => ({
  type: InstructionType.UNARY_OP,
  operator,
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
  dataType: ScalarCDataType;
}

export const assignmentInstruction = (dataType: ScalarCDataType): AssignmentInstruction => ({
  type: InstructionType.ASSIGNMENT,
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