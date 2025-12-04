import { CNodeP } from "~src/processor/c-ast/core";
import { Stack } from "./stack";
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
} from "~src/interpreter/controlItems/instructions";
import { ExpressionStatementP } from "~src/processor/c-ast/statement/expressionStatement";
import { SelectionStatementP, SwitchStatementP } from "~src/processor/c-ast/statement/selectionStatement";
import { DoWhileLoopP, ForLoopP, WhileLoopP } from "~src/processor/c-ast/statement/iterationStatement";
import { BreakStatementP, ContinueStatementP, ReturnStatementP } from "~src/processor/c-ast/statement/jumpStatement";
import { DataSegmentAddress, DynamicAddress, FunctionTableIndex, LocalAddress, MemoryLoad, MemoryStore, ReturnObjectAddress } from "~src/processor/c-ast/memory";
import { Runtime } from "../runtime";
import { FunctionCallP, FunctionDefinitionP } from "~src/processor/c-ast/function";
import { FloatConstantP, IntegerConstantP } from "~src/processor/c-ast/expression/constants";
import { BinaryExpressionP, ConditionalExpressionP, PostStatementExpressionP, PreStatementExpressionP, UnaryExpressionP } from "~src/processor/c-ast/expression/expressions";

export type ControlItem = CNodeP | Instruction;

export class Control extends Stack<ControlItem, Control> {
  protected createNew(items: ReadonlyArray<ControlItem>): Control {
    return new Control(items);
  }

  private numEnvDependentItems: any;

  canAvoidEnvInstr(): boolean {
    return true;
  }

  getTearDowns(): StackFrameTearDownInstruction[] {
    const res = this.storage.filter(
      (item): item is StackFrameTearDownInstruction =>
        isInstruction(item) && item.type === InstructionType.STACKFRAMETEARDOWNINSTRUCTION
    );

    // If there is a call instruction being executed, pop the most recent stack frame
    if (this.storage.filter((item) => item.type === InstructionType.CALLINSTRUCTION).length > 0) {
      res.pop();
    }

    return res;
  }

  getNumEnvDependentItems(): number {
    return this.numEnvDependentItems;
  }

  isInstruction(item: any) {
    return isInstruction(item);
  }

  isNode(item: any) {
    return !isInstruction(item);
  }

  copy(): Control {
    return this;
  }

  toString(): string {
    if (this.isEmpty()) {
      return "  <empty>";
    }

    const controlItems = this.toArray();
    let result = "";

    for (let i = controlItems.length - 1; i >= 0; i--) {
      const item = controlItems[i];
      const itemPosition = controlItems.length - i;

      if (isInstruction(item)) {
        if (item.type === InstructionType.BINARY_OP) {
          result += `  ${itemPosition}. [Instruction] ${item.type}: '${(item as any).operator
            }'\n`;
        } else if (item.type === InstructionType.UNARY_OP) {
          result += `  ${itemPosition}. [Instruction] ${item.type}: '${(item as any).operator
            }'\n`;
        } else if (
          item.type === InstructionType.BRANCH ||
          item.type === InstructionType.POP ||
          item.type === InstructionType.WHILE ||
          item.type === InstructionType.BREAK_MARK ||
          item.type === InstructionType.CONTINUE_MARK
        ) {
          result += `  ${itemPosition}. [Instruction] ${item.type}\n`;
        } else if (
          item.type === InstructionType.CASE_JUMP ||
          item.type === InstructionType.CASE_MARK
        ) {
          result += `  ${itemPosition}. [Instruction] ${item.type}: '${item.caseValue}'\n`;
        } else if (
          item.type === InstructionType.MEMORY_LOAD ||
          item.type === InstructionType.MEMORY_STORE
        ) {
          result += `  ${itemPosition}. [Instruction] ${item.type}: '${item.dataType}'\n`;
        } else {
          result += `  ${itemPosition}. [Instruction] ${item.type}\n`;
        }
      } else {
        const nodeItem = item as any;
        let additionalInfo = "";

        switch (nodeItem.type) {
          case "FunctionDefinition":
            additionalInfo = nodeItem.name ? `: ${nodeItem.name}` : "";
            break;
          case "IntegerConstant":
          case "FloatConstant":
            additionalInfo =
              nodeItem.value !== undefined ? `: ${nodeItem.value}` : "";
            break;
          case "UnaryExpression":
          case "BinaryExpression":
            additionalInfo = nodeItem.operator
              ? `: '${nodeItem.operator}'`
              : "";
            break;
          case "MemoryAddress":
            additionalInfo = `: ${nodeItem.hexValue}`;
            break;
        }

        result += `  ${itemPosition}. [Node] ${nodeItem.type}${additionalInfo}\n`;
      }
    }
    return result.trimEnd();
  }
}

export function extractCodeSegment(controlItem: ControlItem): string {
  // const codePosition = controlItem.position;

  // // extract the code position at a line start and line end
  // const lines = Runtime.sourceCode.split("\n");
  // const extractedCode = lines
  //   .slice(codePosition.start.line - 1, codePosition.end.line)
  //   .filter((line) => line.trim() !== "");

  // if (extractedCode.length > 0) {
  //   extractedCode[0] = extractedCode[0].slice(codePosition.start.column - 1);
  //   extractedCode[extractedCode.length - 1] = extractedCode[
  //     extractedCode.length - 1
  //   ].slice(0, codePosition.end.column - 1);
  // }

  // return extractedCode.join("\n");
  return "";
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
