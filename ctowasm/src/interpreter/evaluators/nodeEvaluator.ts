import { Runtime } from "~src/interpreter/runtime";
import { 
  assignmentInstruction, 
  binaryOpInstruction, 
  branchOpInstruction, 
  popInstruction, 
  unaryOpInstruction 
} from "~src/interpreter/controlItems/instructions";
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
import { MemoryLoad, MemoryStore } from "~src/processor/c-ast/memory";
import { FunctionCallP } from "~src/processor/c-ast/function";
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
import { ExpressionStatementP } from "~src/processor/c-ast/statement/expressionStatement";

export const NodeEvaluator: { 
  [Type in CNodeType]?: (
    runtime: Runtime, 
    node: Extract<CNodeP, { type: Type }>) => Runtime 
} = {
  // ========== STATEMENTS ==========

  ExpressionStatement: (runtime: Runtime, node: ExpressionStatementP): Runtime => {
    const runtimeWithPop = runtime.pushInstruction([popInstruction()]);
    return runtimeWithPop.pushNode([node.expr]);
  },

  SelectionStatement: (runtime: Runtime, node: SelectionStatementP): Runtime => {
    const runtimeWithPushedInstruction = runtime.pushInstruction([
      branchOpInstruction(
        node.ifStatements,
        node.elseStatements ?? [],
      )
    ])
    
    return runtimeWithPushedInstruction.pushNode([node.condition]);
  },

  // === ITERATION STATEMENTS ===

  // TODO
  DoWhileLoop: (runtime: Runtime, node: DoWhileLoopP): Runtime => {
    return new Runtime();
  },

  // TODO
  WhileLoop: (runtime: Runtime, node: WhileLoopP): Runtime => {
    return new Runtime();
  },

  // TODO
  ForLoop: (runtime: Runtime, node: ForLoopP): Runtime => {
    return new Runtime();
  },

  // === JUMP STATEMENTS ===

  // TODO
  ReturnStatement: (runtime: Runtime, node: ReturnStatementP): Runtime => {
    return runtime;
  },

  // TODO
  BreakStatement: (runtime: Runtime, node: BreakStatementP): Runtime => {
    return new Runtime();
  },

  // TODO
  ContinueStatement: (runtime: Runtime, node: ContinueStatementP): Runtime => {
    return new Runtime();
  },

  // TODO
  SwitchStatement: (runtime: Runtime, node: SwitchStatementP): Runtime => {
    return new Runtime();
  },

  // TODO
  MemoryStore: (runtime: Runtime, node: MemoryStore): Runtime => {
    const newRuntime = runtime.push([
      node.value, 
      assignmentInstruction(node.address, node.dataType),
      popInstruction()
    ]);

    return newRuntime;
  },

  // TODO
  MemoryLoad: (runtime: Runtime, node: MemoryLoad): Runtime => {
    return new Runtime();
  },

  // TODO
  FunctionCall: (runtime: Runtime, node: FunctionCallP): Runtime => {
    return new Runtime();
  },

 // ========== EXPRESSIONS ==========

  IntegerConstant: (runtime: Runtime, node: IntegerConstantP): Runtime => {
    return runtime.pushValue(node);
  },

  FloatConstant: (runtime: Runtime, node: FloatConstantP): Runtime => {
    return runtime.pushValue(node);
  },

  BinaryExpression: (runtime: Runtime, node: BinaryExpressionP): Runtime => {    
    const runtimeWithInstruction = runtime.pushInstruction([binaryOpInstruction(node.operator, node.dataType)]);
    const runtimeWithRight = runtimeWithInstruction.pushNode([node.rightExpr]);
    
    return runtimeWithRight.pushNode([node.leftExpr]);
  },

  UnaryExpression: (runtime: Runtime, node: UnaryExpressionP): Runtime => {
    const runtimeWithInstruction = runtime.pushInstruction([unaryOpInstruction(node.operator)]);
    return runtimeWithInstruction.pushNode([node.expr]);
  },

  // TODO
  PreStatementExpression: (runtime: Runtime, node: PreStatementExpressionP): Runtime => {
    return new Runtime();
  },

  // TODO
  PostStatementExpression: (runtime: Runtime, node: PostStatementExpressionP): Runtime => {
    return new Runtime();
  },

  ConditionalExpression: (runtime: Runtime, node: ConditionalExpressionP): Runtime => {
    const runtimeWithInstruction = runtime.pushInstruction([branchOpInstruction([node.trueExpression], [node.falseExpression])]);
    return runtimeWithInstruction.pushNode([node.condition]);
  }
};