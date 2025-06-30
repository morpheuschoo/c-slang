import { BinaryOperator, ScalarCDataType } from "~src/common/types";
import { CNodeP, ExpressionP } from "~src/processor/c-ast/core";
import { BinaryExpressionP } from "~src/processor/c-ast/expression/expressions";
import { CalledFunction, FunctionDetails } from "~src/processor/c-ast/function";
import { Address } from "~src/processor/c-ast/memory";

/**
 * Types of instructions for the interpreter
 */
export enum InstructionType {
  BINARY_OP = "BINARY_OP",
  UNARY_OP = "UNARY_OP",
  BRANCH = "BRANCH",
  POP = "POP",
  MEMORYSTORE = "MEMORYSTORE",
  MEMORYLOAD = "MEMORYLOAD",
  WHILE = "WHILE",
  STACKFRAMETEARDOWNINSTRUCTION = "STACKFRAMETEARDOWNINSTRUCTION",
  CALLINSTRUCTION = "CALLINSTRUCTION"
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
}

export const unaryOpInstruction = (operator: string): UnaryOpInstruction => ({
  type: InstructionType.UNARY_OP,
  operator,
});

export interface branchOpInstruction extends BaseInstruction {
  type: InstructionType.BRANCH;
  trueExpr: CNodeP[];
  falseExpr: CNodeP[];
}

export const branchOpInstruction = (trueExpr: CNodeP[], falseExpr: CNodeP[]): branchOpInstruction => ({
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

// ===== MEMORY =====

export interface MemoryStoreInstruction extends BaseInstruction {
  type: InstructionType.MEMORYSTORE;
  dataType: ScalarCDataType;
}

export const memoryStoreInstruction = (dataType: ScalarCDataType): MemoryStoreInstruction => ({
  type: InstructionType.MEMORYSTORE,
  dataType: dataType,
})

export interface MemoryLoadInstruction extends BaseInstruction {
  type: InstructionType.MEMORYLOAD;
  dataType: ScalarCDataType;
}

export const memoryLoadInstruction = (dataType: ScalarCDataType): MemoryLoadInstruction => ({
  type: InstructionType.MEMORYLOAD,
  dataType,
})

export interface WhileLoopInstruction extends BaseInstruction {
  type: InstructionType.WHILE;
  condition: ExpressionP;
  body: CNodeP[];
}

export const whileLoopInstruction = (condition: ExpressionP, body: CNodeP[]): WhileLoopInstruction => ({
  type: InstructionType.WHILE,
  condition,
  body,
})

// ===== FUNCTION CALLS =====

// Tears down the current stack frame and 
// moves base pointer and stack pointer to the previous stack frame
export interface StackFrameTearDownInstruction {
  type: InstructionType.STACKFRAMETEARDOWNINSTRUCTION,
  basePointer: number,
  stackPointer: number,
}

export const stackFrameTearDownInstruction = (basePointer : number, stackPointer: number): StackFrameTearDownInstruction => ({
  type: InstructionType.STACKFRAMETEARDOWNINSTRUCTION,
  basePointer: basePointer,
  stackPointer: stackPointer,
})

export interface CallInstruction {
  type: InstructionType.CALLINSTRUCTION,
  calledFunction: CalledFunction,
  functionDetails: FunctionDetails
}

export const callInstruction = (calledFunction: CalledFunction, functionDetails: FunctionDetails): CallInstruction => ({
  type: InstructionType.CALLINSTRUCTION,
  calledFunction: calledFunction,
  functionDetails: functionDetails
})

export type Instruction = 
  | BinaryOpInstruction
  | UnaryOpInstruction
  | branchOpInstruction
  | popInstruction
  | MemoryStoreInstruction
  | MemoryLoadInstruction
  | StackFrameTearDownInstruction
  | CallInstruction
  | WhileLoopInstruction;

export const isInstruction = (item: any): item is Instruction => {
  return item && typeof item === 'object' && 'type' in item && 
    Object.values(InstructionType).includes(item.type as InstructionType);
};