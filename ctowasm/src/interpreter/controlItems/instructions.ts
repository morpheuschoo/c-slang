import { BinaryOperator, ScalarCDataType } from "~src/common/types";
import { CNodeP, ExpressionP } from "~src/processor/c-ast/core";
import { BinaryExpressionP } from "~src/processor/c-ast/expression/expressions";
import { CalledFunction, FunctionDetails } from "~src/processor/c-ast/function";
import { Address, DynamicAddress } from "~src/processor/c-ast/memory";
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
  STACKFRAMETEARDOWNINSTRUCTION = "STACKFRAMETEARDOWNINSTRUCTION",
  CALLINSTRUCTION = "CALLINSTRUCTION",
  FUNCTIONINDEXWRAPPER = "FUNCTIONINDEXWRAPPER",
  BREAK_MARK = "BREAK_MARK",
  CASE_JUMP = "CASE_JUMP",
  CASE_MARK = "CASE_MARK",
  CONTINUE_MARK = "CONTINUE_MARK",
  TYPE_CONVERSION = "TYPE_CONVERSION",
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
  hasContinue: boolean;
}

export const whileLoopInstruction = (
  condition: ExpressionP, 
  body: CNodeP[], 
  hasContinue: boolean
): WhileLoopInstruction => ({
  type: InstructionType.WHILE,
  condition,
  body,
  hasContinue,
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

export interface FunctionIndexWrapper {
  type: InstructionType.FUNCTIONINDEXWRAPPER,
}

export const functionIndexWrapper = (): FunctionIndexWrapper => ({
  type: InstructionType.FUNCTIONINDEXWRAPPER
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

export interface ContinueMarkInstruction extends BaseInstruction {
  type: InstructionType.CONTINUE_MARK;
}

export const continueMarkInstruction = (): ContinueMarkInstruction => ({
  type: InstructionType.CONTINUE_MARK,
})

export function isContinueMarkInstruction(
  i: ControlItem)
  : i is ContinueMarkInstruction {
    return isInstruction(i) && i.type == InstructionType.CONTINUE_MARK;
}


export interface CaseJumpInstruction extends BaseInstruction {
  type: InstructionType.CASE_JUMP;
  caseValue: number;
}

const caseJumpInstruction = (caseValue: number): CaseJumpInstruction => ({
  type: InstructionType.CASE_JUMP,
  caseValue,
})

export interface CaseMarkInstruction extends BaseInstruction {
  type: InstructionType.CASE_MARK;
  caseValue : number;
}

const caseMarkInstruction = (caseValue: number): CaseMarkInstruction => ({
  type: InstructionType.CASE_MARK,
  caseValue,
})

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
  }
}

export function isCaseMarkInstruction(
  i: ControlItem)
  : i is CaseMarkInstruction {
    return isInstruction(i) && i.type == InstructionType.CASE_MARK;
}

export function isDefaultCaseInstruction(
  instruction: CaseJumpInstruction | CaseMarkInstruction
): boolean {
  return instruction.caseValue === DEFAULT_CASE_VALUE;
}

export function doCaseInstructionsMatch(
  jumpInstruction: CaseJumpInstruction,
  markInstruction: CaseMarkInstruction
): boolean {
  return jumpInstruction.caseValue === markInstruction.caseValue;
}

export interface TypeConversionInstruction extends BaseInstruction {
  type: InstructionType.TYPE_CONVERSION;
  targetType: ScalarCDataType;
}

export const typeConversionInstruction = (targetType: ScalarCDataType): TypeConversionInstruction => ({
  type: InstructionType.TYPE_CONVERSION,
  targetType,
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
  | FunctionIndexWrapper
  | WhileLoopInstruction
  | WhileLoopInstruction
  | BreakMarkInstruction
  | CaseJumpInstruction
  | CaseMarkInstruction
  | ContinueMarkInstruction
  | TypeConversionInstruction;

export const isInstruction = (item: any): item is Instruction => {
  return item && typeof item === 'object' && 'type' in item && 
    Object.values(InstructionType).includes(item.type as InstructionType);
};