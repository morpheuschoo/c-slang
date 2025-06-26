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
  CASE_JUMP = "CASE_JUMP",
  CASE_MARK = "CASE_MARK",
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

export interface CaseJumpInstruction extends BaseInstruction {
  type: InstructionType.CASE_JUMP;
  caseValue: bigint;
}

const caseJumpInstruction = (caseValue: bigint): CaseJumpInstruction => ({
  type: InstructionType.CASE_JUMP,
  caseValue,
})

export interface CaseMarkInstruction extends BaseInstruction {
  type: InstructionType.CASE_MARK;
  caseValue : bigint;
}

const caseMarkInstruction = (caseValue: bigint): CaseMarkInstruction => ({
  type: InstructionType.CASE_MARK,
  caseValue,
})

// creates a caseJumpInstruction and caseMarkInstruction with the same caseValue
export const createCaseInstructionPair = (caseValue: bigint) => {
  return {
    jumpInstruction: {
      type: InstructionType.CASE_JUMP,
      caseValue,
    } as CaseJumpInstruction,

    markInstruction: {
      type: InstructionType.CASE_MARK,
      caseValue,
    } as CaseMarkInstruction,
  }
}

export type Instruction = 
  | BinaryOpInstruction
  | UnaryOpInstruction
  | branchOpInstruction
  | popInstruction
  | MemoryStoreInstruction
  | MemoryLoadInstruction
  | WhileLoopInstruction
  | BreakMarkInstruction
  | CaseJumpInstruction
  | CaseMarkInstruction;

export const isInstruction = (item: any): item is Instruction => {
  return item && typeof item === 'object' && 'type' in item && 
    Object.values(InstructionType).includes(item.type as InstructionType);
};