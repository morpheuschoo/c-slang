import { BinaryOperator, ScalarCDataType } from "~src/common/types";
import { CNodeP, ExpressionP } from "~src/processor/c-ast/core";
import { Control, ControlItem } from "~src/interpreter/utils/control";

/**
 * Types of instructions for the interpreter
 */
export enum InstructionType {
  BINARY_OP = "BINARY_OP",
  UNARY_OP = "UNARY_OP",
  BRANCH = "BRANCH",
  POP = "POP",
  MEMORY_STORE = "MEMORY_STORE",
  MEMORY_LOAD = "MEMORY_LOAD",
  WHILE = "WHILE",
  BREAK_MARK = "BREAK_MARK",
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
  type: InstructionType.MEMORY_STORE;
  dataType: ScalarCDataType;
}

export const memoryStoreInstruction = (dataType: ScalarCDataType): MemoryStoreInstruction => ({
  type: InstructionType.MEMORY_STORE,
  dataType: dataType,
})

export interface MemoryLoadInstruction extends BaseInstruction {
  type: InstructionType.MEMORY_LOAD;
  dataType: ScalarCDataType;
}

export const memoryLoadInstruction = (dataType: ScalarCDataType): MemoryLoadInstruction => ({
  type: InstructionType.MEMORY_LOAD,
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

export interface BreakMarkInstruction extends BaseInstruction {
  type: InstructionType.BREAK_MARK;
}

export const breakMarkInstruction = (): BreakMarkInstruction => ({
  type: InstructionType.BREAK_MARK,
})

export function isBreakMarkInstruction(
  i: ControlItem)
  : i is BreakMarkInstruction {
    return isInstruction(i) && i.type == InstructionType.BREAK_MARK;
}

export type Instruction = 
  | BinaryOpInstruction
  | UnaryOpInstruction
  | branchOpInstruction
  | popInstruction
  | MemoryStoreInstruction
  | MemoryLoadInstruction
  | WhileLoopInstruction
  | BreakMarkInstruction;

export const isInstruction = (item: any): item is Instruction => {
  return item && typeof item === 'object' && 'type' in item && 
    Object.values(InstructionType).includes(item.type as InstructionType);
};