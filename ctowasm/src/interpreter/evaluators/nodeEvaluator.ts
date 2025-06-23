import { Runtime } from "~src/interpreter/runtime";
import { InstructionType } from "~src/interpreter/controlItems/instructions";
import { CNodeType } from "~src/interpreter/controlItems/types";
import { CNodeP } from "~src/processor/c-ast/core";
import { 
  FloatConstantP, 
  IntegerConstantP 
} from "~src/processor/c-ast/expression/constants";
import { 
  BinaryExpressionP, 
  UnaryExpressionP,
  PreStatementExpressionP,
  PostStatementExpressionP,
  ConditionalExpressionP,
} from "~src/processor/c-ast/expression/expressions";
import { MemoryStore } from "~src/processor/c-ast/memory";
import { FunctionCallP, FunctionDefinitionP } from "~src/processor/c-ast/function";
import { 
  BreakStatementP, 
  ContinueStatementP, 
  ReturnStatementP 
} from "~src/processor/c-ast/statement/jumpStatement";
import { SelectionStatementP, SwitchStatementP } from "~src/processor/c-ast/statement/selectionStatement";
import { 
  DoWhileLoopP,  
  WhileLoopP,
  ForLoopP,
} from "~src/processor/c-ast/statement/iterationStatement";

export const NodeEvaluator: { 
  [Type in CNodeType]?: (
    runtime: Runtime, 
    node: Extract<CNodeP, { type: Type }>) => Runtime 
} = {

  // ========== STATEMENTS ==========

  // TODO
  SelectionStatement: (runtime: Runtime, node: SelectionStatementP): Runtime => {
    return new Runtime([]);
  },

  // === ITERATION STATEMENTS ===

  // TODO
  DoWhileLoop: (runtime: Runtime, node: DoWhileLoopP): Runtime => {
    return new Runtime([]);
  },

  // TODO
  WhileLoop: (runtime: Runtime, node: WhileLoopP): Runtime => {
    return new Runtime([]);
  },

  // TODO
  ForLoop: (runtime: Runtime, node: ForLoopP): Runtime => {
    return new Runtime([]);
  },

  // === JUMP STATEMENTS ===

  // TODO
  ReturnStatement: (runtime: Runtime, node: ReturnStatementP): Runtime => {
    return runtime;
  },

  // TODO
  BreakStatement: (runtime: Runtime, node: BreakStatementP): Runtime => {
    return new Runtime([]);
  },

  // TODO
  ContinueStatement: (runtime: Runtime, node: ContinueStatementP): Runtime => {
    return new Runtime([]);
  },

  // TODO
  SwitchStatement: (runtime: Runtime, node: SwitchStatementP): Runtime => {
    return new Runtime([]);
  },

  // TODO
  MemoryStore: (runtime: Runtime, node: MemoryStore): Runtime => {
    const newRuntime = runtime.pushNode(node.value);
    return newRuntime;
  },

  FunctionDefinition: (runtime: Runtime, node: FunctionDefinitionP): Runtime => {
    let newRuntime = runtime.addFunction(node.name, node);

    if (node.name === "main") {
      if (node.body && node.body.length > 0) {
        for (let i = node.body.length - 1; i >= 0; i--) {
          newRuntime = newRuntime.pushNode(node.body[i]);
        }
      }
    }
    
    return newRuntime;
  },

  FunctionCall: (runtime: Runtime, node: FunctionCallP): Runtime => {
    return new Runtime([]);
  },

 // ========== EXPRESSIONS ==========

  IntegerConstant: (runtime: Runtime, node: IntegerConstantP): Runtime => {
    return runtime.pushValue(node.value);
  },

  FloatConstant: (runtime: Runtime, node: FloatConstantP): Runtime => {
    return runtime.pushValue(node.value);
  },

  BinaryExpression: (runtime: Runtime, node: BinaryExpressionP): Runtime => {    
    const runtimeWithInstruction = runtime.pushInstruction({
      type: InstructionType.BINARY_OP,
      operator: node.operator
    });
  
    const runtimeWithRight = runtimeWithInstruction.pushNode(node.rightExpr);
    return runtimeWithRight.pushNode(node.leftExpr);
  },

  UnaryExpression: (runtime: Runtime, node: UnaryExpressionP): Runtime => {
    const runtimeWithInstruction = runtime.pushInstruction({
      type: InstructionType.UNARY_OP,
      operator: node.operator
    });
    
    return runtimeWithInstruction.pushNode(node.expr);
  },

  // TODO
  PreStatementExpression: (runtime: Runtime, node: PreStatementExpressionP): Runtime => {
    return new Runtime([]);
  },

  // TODO
  PostStatementExpression: (runtime: Runtime, node: PostStatementExpressionP): Runtime => {
    return new Runtime([]);
  },

  // TODO
  ConditionalExpression: (runtime: Runtime, node: ConditionalExpressionP): Runtime => {
    return new Runtime([]);
  }
};