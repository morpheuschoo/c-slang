import { CAstRootP, CNodeP } from "~src/processor/c-ast/core";
import { CContext, Interpreter } from "~src/interpreter/interpret";
import { ModuleName, ModulesGlobalConfig } from "~src/modules";
import { ControlItem } from "./utils/control";
import {
  BinaryOpInstruction,
  branchOpInstruction,
  BreakMarkInstruction,
  CallInstruction,
  CaseJumpInstruction,
  CaseMarkInstruction,
  ContinueMarkInstruction,
  ForLoopInstruction,
  FunctionIndexWrapper,
  Instruction,
  InstructionType,
  isInstruction,
  MemoryLoadInstruction,
  MemoryStoreInstruction,
  popInstruction,
  StackFrameTearDownInstruction,
  UnaryOpInstruction,
  WhileLoopInstruction,
} from "./controlItems";
import { Runtime } from "./runtime";
import { ExpressionStatementP } from "~src/processor/c-ast/statement/expressionStatement";
import {
  SelectionStatementP,
  SwitchStatementP,
} from "~src/processor/c-ast/statement/selectionStatement";
import {
  DoWhileLoopP,
  ForLoopP,
  WhileLoopP,
} from "~src/processor/c-ast/statement/iterationStatement";
import {
  BreakStatementP,
  ContinueStatementP,
  ReturnStatementP,
} from "~src/processor/c-ast/statement/jumpStatement";
import {
  DataSegmentAddress,
  DynamicAddress,
  FunctionTableIndex,
  LocalAddress,
  MemoryLoad,
  MemoryStore,
  ReturnObjectAddress,
} from "~src/processor/c-ast/memory";
import {
  FunctionCallP,
  FunctionDefinitionP,
} from "~src/processor/c-ast/function";
import {
  FloatConstantP,
  IntegerConstantP,
} from "~src/processor/c-ast/expression/constants";
import {
  BinaryExpressionP,
  ConditionalExpressionP,
  PostStatementExpressionP,
  PreStatementExpressionP,
  UnaryExpressionP,
} from "~src/processor/c-ast/expression/expressions";
import { MemoryManager } from "../processor/memoryManager";

// export function interpret(
//   astRootNode: CAstRootP,
//   includedModules: ModuleName[],
//   moduleConfig: ModulesGlobalConfig,
//   sourceCode: string
// ): void {
//   const interpreter = new Interpreter(
//     astRootNode,
//     includedModules,
//     moduleConfig,
//     sourceCode
//   );
//   interpreter.interpret();
// }

export async function evaluateTillStep(
  astRootNode: CAstRootP,
  includedModules: ModuleName[],
  moduleConfig: ModulesGlobalConfig,
  targetStep: number,
  sourceCode: string,
  memoryManager: MemoryManager
): Promise<CContext> {
  const interpreter = new Interpreter(
    astRootNode,
    includedModules,
    moduleConfig,
    sourceCode,
    memoryManager
  );
  return await interpreter.interpretTillStep(targetStep);
}

export function extractCodeSegment(controlItem: ControlItem): string {
  const codePosition = controlItem.position;

  // extract the code position at a line start and line end
  const lines = Runtime.sourceCode.split("\n");
  const extractedCode = lines
    .slice(codePosition.start.line - 1, codePosition.end.line)
    .filter((line) => line.trim() !== "");

  if (extractedCode.length > 0) {
    extractedCode[0] = extractedCode[0].slice(codePosition.start.column - 1);
    extractedCode[extractedCode.length - 1] = extractedCode[
      extractedCode.length - 1
    ].slice(0, codePosition.end.column - 1);
  }

  return extractedCode.join("\n");
}

export function controlItemToString(controlItem: ControlItem): string {
  if (isInstruction(controlItem)) {
    const type = controlItem.type;
    const fn = instructionToString[type] as
      | ((instruction: Instruction) => string)
      | undefined;
    if (fn) {
      return fn(controlItem as Instruction);
    }
  } else {
    const type = controlItem.type;
    const fn = nodeToString[type] as ((node: CNodeP) => string) | undefined;
    if (fn) {
      return fn(controlItem as CNodeP);
    }
  }
  throw new Error("Unknown instruction type");
}

export const instructionToString: {
  [InstrType in Instruction["type"]]: (
    instruction: Extract<Instruction, { type: InstrType }>
  ) => string;
} = {
  [InstructionType.BINARY_OP]: (controlItem: BinaryOpInstruction): string => {
    return "Binary operator: " + controlItem.operator;
  },

  [InstructionType.BRANCH]: (controlItem: branchOpInstruction): string => {
    const extractedCode = extractCodeSegment(controlItem);
    return "Branch instruction: " + extractedCode;
  },

  [InstructionType.BREAK_MARK]: (controlItem: BreakMarkInstruction): string => {
    return "Break Mark";
  },

  [InstructionType.CALLINSTRUCTION]: (controlItem: CallInstruction): string => {
    return "Call Function";
  },

  [InstructionType.CASE_JUMP]: (controlItem: CaseJumpInstruction): string => {
    return "Case Jump";
  },

  [InstructionType.CASE_MARK]: (controlItem: CaseMarkInstruction): string => {
    return "Case Mark";
  },

  [InstructionType.CONTINUE_MARK]: (
    controlItem: ContinueMarkInstruction
  ): string => {
    return "Continue Mark";
  },

  [InstructionType.FORLOOP]: (controlItem: ForLoopInstruction): string => {
    return "Loop: " + extractCodeSegment(controlItem);
  },

  [InstructionType.FUNCTIONINDEXWRAPPER]: (
    controlItem: FunctionIndexWrapper
  ): string => {
    return "Function Index Wrapper";
  },

  [InstructionType.MEMORY_LOAD]: (
    controlItem: MemoryLoadInstruction
  ): string => {
    return "Memory Load: " + extractCodeSegment(controlItem);
  },

  [InstructionType.MEMORY_STORE]: (
    controlItem: MemoryStoreInstruction
  ): string => {
    return "Memory Store: " + extractCodeSegment(controlItem);
  },

  [InstructionType.POP]: (controlItem: popInstruction): string => {
    return "Pop";
  },

  [InstructionType.STACKFRAMETEARDOWNINSTRUCTION]: (
    controlItem: StackFrameTearDownInstruction
  ): string => {
    return "Stack tear down";
  },

  [InstructionType.UNARY_OP]: (controlItem: UnaryOpInstruction): string => {
    return "Unary operation: " + controlItem.operator;
  },

  [InstructionType.WHILE]: (controlItem: WhileLoopInstruction): string => {
    return "While loop: " + extractCodeSegment(controlItem);
  },
};

export const nodeToString: {
  [ContrlType in CNodeP["type"]]: (
    controlItem: Extract<ControlItem, { type: ContrlType }>
  ) => string;
} = {
  ExpressionStatement: (controlItem: ExpressionStatementP): string => {
    return "Expression: " + extractCodeSegment(controlItem);
  },

  SelectionStatement: (controlItem: SelectionStatementP): string => {
    return "Selection: " + extractCodeSegment(controlItem);
  },

  DoWhileLoop: (controlItem: DoWhileLoopP): string => {
    return "DoWhile: " + extractCodeSegment(controlItem);
  },

  WhileLoop: (controlItem: WhileLoopP): string => {
    return "WhileLoop: " + extractCodeSegment(controlItem);
  },

  ForLoop: (controlItem: ForLoopP): string => {
    return "ForLoop: " + extractCodeSegment(controlItem);
  },

  ReturnStatement: (controlItem: ReturnStatementP): string => {
    return "Return Statement: " + extractCodeSegment(controlItem);
  },

  BreakStatement: (controlItem: BreakStatementP): string => {
    return "Break: " + extractCodeSegment(controlItem);
  },

  ContinueStatement: (controlItem: ContinueStatementP): string => {
    return "Continue Statement";
  },

  SwitchStatement: (controlItem: SwitchStatementP): string => {
    return "Switch: " + extractCodeSegment(controlItem);
  },

  MemoryLoad: (controlItem: MemoryLoad): string => {
    return "Memory Load Node: " + extractCodeSegment(controlItem);
  },

  FunctionTableIndex: (controlItem: FunctionTableIndex): string => {
    const funcIndex = controlItem.index.value;
    if (funcIndex < 0 || funcIndex > Runtime.astRootP.functionTable.length) {
      throw new Error("Index of desired function out of bounds");
    }

    const funcName =
      Runtime.astRootP.functionTable[Number(funcIndex)].functionName;
    return funcName;
  },

  MemoryStore: (controlItem: MemoryStore): string => {
    return "Memory Store Node: " + extractCodeSegment(controlItem);
  },

  LocalAddress: (controlItem: LocalAddress): string => {
    return "Local Address: " + controlItem.offset.value.toString();
  },

  DataSegmentAddress: (controlItem: DataSegmentAddress): string => {
    return "Data Segment Address: " + controlItem.offset.value.toString();
  },

  ReturnObjectAddress: (controlItem: ReturnObjectAddress): string => {
    return "Return Object Address: " + controlItem.offset.value.toString();
  },

  DynamicAddress: (controlItem: DynamicAddress): string => {
    return "Dynamic Address: " + extractCodeSegment(controlItem.address);
  },

  FunctionCall: (controlItem: FunctionCallP): string => {
    return "Function call: " + extractCodeSegment(controlItem);
  },

  IntegerConstant: (controlItem: IntegerConstantP): string => {
    return controlItem.value.toString();
  },

  FloatConstant: (controlItem: FloatConstantP): string => {
    return controlItem.value.toString();
  },

  BinaryExpression: (controlItem: BinaryExpressionP): string => {
    return "Binary ExpressionP: " + extractCodeSegment(controlItem);
  },

  UnaryExpression: (controlItem: UnaryExpressionP): string => {
    return "UnaryExpressionP: " + extractCodeSegment(controlItem);
  },

  PreStatementExpression: (controlItem: PreStatementExpressionP): string => {
    return "PreStatemetn: " + extractCodeSegment(controlItem);
  },

  PostStatementExpression: (controlItem: PostStatementExpressionP): string => {
    return "PostStatement: " + extractCodeSegment(controlItem);
  },

  ConditionalExpression: (controlItem: ConditionalExpressionP): string => {
    return "Conditional: " + extractCodeSegment(controlItem);
  },

  FunctionDefinition: (controlItem: FunctionDefinitionP): string => {
    return "Function: " + extractCodeSegment(controlItem);
  },
};
