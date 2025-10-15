import { BinaryOperator, ScalarCDataType } from "~src/common/types";
import { CNodeP, ExpressionP } from "~src/processor/c-ast/core";
import { CalledFunction, FunctionDetails } from "~src/processor/c-ast/function";
import { ControlItem } from "~src/interpreter/utils/control";
import { Position } from "~src/parser/c-ast/misc";

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
  FORLOOP = "FORLOOP",
  STACKFRAMETEARDOWNINSTRUCTION = "STACKFRAMETEARDOWNINSTRUCTION",
  CALLINSTRUCTION = "CALLINSTRUCTION",
  FUNCTIONINDEXWRAPPER = "FUNCTIONINDEXWRAPPER",
  BREAK_MARK = "BREAK_MARK",
  CASE_JUMP = "CASE_JUMP",
  CASE_MARK = "CASE_MARK",
  CONTINUE_MARK = "CONTINUE_MARK",
}

export interface BaseInstruction {
  type: InstructionType;
  position: Position;
}

export interface BinaryOpInstruction extends BaseInstruction {
  type: InstructionType.BINARY_OP;
  operator: BinaryOperator;
  dataType: ScalarCDataType;
}

export const binaryOpInstruction = (
  operator: BinaryOperator,
  dataType: ScalarCDataType,
  position: Position,
): BinaryOpInstruction => ({
  type: InstructionType.BINARY_OP,
  operator,
  dataType,
  position,
});

export interface UnaryOpInstruction extends BaseInstruction {
  type: InstructionType.UNARY_OP;
  operator: string;
}

export const unaryOpInstruction = (
  operator: string,
  position: Position,
): UnaryOpInstruction => ({
  type: InstructionType.UNARY_OP,
  operator,
  position,
});

export interface branchOpInstruction extends BaseInstruction {
  type: InstructionType.BRANCH;
  trueExpr: CNodeP[];
  falseExpr: CNodeP[];
}

export const branchOpInstruction = (
  trueExpr: CNodeP[],
  falseExpr: CNodeP[],
  position: Position,
): branchOpInstruction => ({
  type: InstructionType.BRANCH,
  trueExpr,
  falseExpr,
  position,
});

export interface popInstruction extends BaseInstruction {
  type: InstructionType.POP;
}

export const popInstruction = (): popInstruction => ({
  type: InstructionType.POP,
  position: {
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
  },
});

// ===== MEMORY =====

export interface MemoryStoreInstruction extends BaseInstruction {
  type: InstructionType.MEMORY_STORE;
  dataType: ScalarCDataType;
}

export const memoryStoreInstruction = (
  dataType: ScalarCDataType,
  position: Position,
): MemoryStoreInstruction => ({
  type: InstructionType.MEMORY_STORE,
  dataType: dataType,
  position,
});

export interface MemoryLoadInstruction extends BaseInstruction {
  type: InstructionType.MEMORY_LOAD;
  dataType: ScalarCDataType;
}

export const memoryLoadInstruction = (
  dataType: ScalarCDataType,
  position: Position,
): MemoryLoadInstruction => ({
  type: InstructionType.MEMORY_LOAD,
  dataType,
  position,
});

export interface WhileLoopInstruction extends BaseInstruction {
  type: InstructionType.WHILE;
  condition: ExpressionP;
  body: CNodeP[];
  hasContinue: boolean;
}

export const whileLoopInstruction = (
  condition: ExpressionP,
  body: CNodeP[],
  hasContinue: boolean,
  position: Position,
): WhileLoopInstruction => ({
  type: InstructionType.WHILE,
  condition,
  body,
  hasContinue,
  position,
});

export interface ForLoopInstruction extends BaseInstruction {
  type: InstructionType.FORLOOP;
  body: CNodeP[];
  update: CNodeP[];
  condition: ExpressionP;
  hasContinue: boolean;
}

export const forLoopInstruction = (
  body: CNodeP[],
  update: CNodeP[],
  condition: ExpressionP,
  hasContinue: boolean,
  position: Position,
): ForLoopInstruction => ({
  type: InstructionType.FORLOOP,
  body,
  update,
  condition,
  hasContinue,
  position,
});

// ===== FUNCTION CALLS =====

// Tears down the current stack frame and moves base pointer and stack pointer to the previous stack frame
export interface StackFrameTearDownInstruction extends BaseInstruction {
  functionName: string;
  type: InstructionType.STACKFRAMETEARDOWNINSTRUCTION;
  basePointer: number;
  stackPointer: number;
  sizeOfReturn: number;
}

export const stackFrameTearDownInstruction = (
  functionName: string,
  basePointer: number,
  stackPointer: number,
  sizeOfReturn: number,
  position: Position,
): StackFrameTearDownInstruction => ({
  functionName: functionName,
  type: InstructionType.STACKFRAMETEARDOWNINSTRUCTION,
  basePointer: basePointer,
  stackPointer: stackPointer,
  sizeOfReturn: sizeOfReturn,
  position,
});

export interface CallInstruction extends BaseInstruction {
  type: InstructionType.CALLINSTRUCTION;
  calledFunction: CalledFunction;
  functionDetails: FunctionDetails;
}

export const callInstruction = (
  calledFunction: CalledFunction,
  functionDetails: FunctionDetails,
  position: Position,
): CallInstruction => ({
  type: InstructionType.CALLINSTRUCTION,
  calledFunction: calledFunction,
  functionDetails: functionDetails,
  position,
});

export interface FunctionIndexWrapper extends BaseInstruction {
  type: InstructionType.FUNCTIONINDEXWRAPPER;
}

export const functionIndexWrapper = (): FunctionIndexWrapper => ({
  type: InstructionType.FUNCTIONINDEXWRAPPER,
  position: {
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
  },
});

export interface BreakMarkInstruction extends BaseInstruction {
  type: InstructionType.BREAK_MARK;
}

export const breakMarkInstruction = (): BreakMarkInstruction => ({
  type: InstructionType.BREAK_MARK,
  position: {
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
  },
});

export function isBreakMarkInstruction(
  i: ControlItem,
): i is BreakMarkInstruction {
  return isInstruction(i) && i.type == InstructionType.BREAK_MARK;
}

export interface ContinueMarkInstruction extends BaseInstruction {
  type: InstructionType.CONTINUE_MARK;
}

export const continueMarkInstruction = (): ContinueMarkInstruction => ({
  type: InstructionType.CONTINUE_MARK,
  position: {
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
  },
});

export function isContinueMarkInstruction(
  i: ControlItem,
): i is ContinueMarkInstruction {
  return isInstruction(i) && i.type == InstructionType.CONTINUE_MARK;
}

export interface CaseJumpInstruction extends BaseInstruction {
  type: InstructionType.CASE_JUMP;
  caseValue: number;
}

const caseJumpInstruction = (
  caseValue: number,
  position: Position,
): CaseJumpInstruction => ({
  type: InstructionType.CASE_JUMP,
  caseValue,
  position,
});

export interface CaseMarkInstruction extends BaseInstruction {
  type: InstructionType.CASE_MARK;
  caseValue: number;
}

const caseMarkInstruction = (
  caseValue: number,
  position: Position,
): CaseMarkInstruction => ({
  type: InstructionType.CASE_MARK,
  caseValue,
  position,
});

const DEFAULT_CASE_VALUE = -1;

export const createDefaultCaseInstructionPair = () => {
  return createCaseInstructionPair(DEFAULT_CASE_VALUE);
};

// creates a caseJumpInstruction and caseMarkInstruction with the same caseValue
export const createCaseInstructionPair = (caseValue: number) => {
  return {
    jumpInstruction: {
      type: InstructionType.CASE_JUMP,
      caseValue,
    } as CaseJumpInstruction,

    markInstruction: {
      type: InstructionType.CASE_MARK,
      caseValue,
    } as CaseMarkInstruction,
  };
};

export function isCaseMarkInstruction(
  i: ControlItem,
): i is CaseMarkInstruction {
  return isInstruction(i) && i.type == InstructionType.CASE_MARK;
}

export function isDefaultCaseInstruction(
  instruction: CaseJumpInstruction | CaseMarkInstruction,
): boolean {
  return instruction.caseValue === DEFAULT_CASE_VALUE;
}

export function doCaseInstructionsMatch(
  jumpInstruction: CaseJumpInstruction,
  markInstruction: CaseMarkInstruction,
): boolean {
  return jumpInstruction.caseValue === markInstruction.caseValue;
}

export type Instruction =
  | BinaryOpInstruction
  | UnaryOpInstruction
  | branchOpInstruction
  | popInstruction
  | MemoryStoreInstruction
  | MemoryLoadInstruction
  | StackFrameTearDownInstruction
  | CallInstruction
  | FunctionIndexWrapper
  | WhileLoopInstruction
  | ForLoopInstruction
  | BreakMarkInstruction
  | CaseJumpInstruction
  | CaseMarkInstruction
  | ContinueMarkInstruction;

export const isInstruction = (item: any): item is Instruction => {
  return (
    item &&
    typeof item === "object" &&
    "type" in item &&
    Object.values(InstructionType).includes(item.type as InstructionType)
  );
};
