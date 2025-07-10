import { Runtime } from "~src/interpreter/runtime";
import {  
  binaryOpInstruction, 
  branchOpInstruction, 
  callInstruction, 
  breakMarkInstruction, 
  continueMarkInstruction, 
  createCaseInstructionPair, 
  createDefaultCaseInstructionPair, 
  isBreakMarkInstruction, 
  isContinueMarkInstruction, 
  memoryLoadInstruction, 
  memoryStoreInstruction,  
  popInstruction, 
  stackFrameTearDownInstruction, 
  unaryOpInstruction ,
  whileLoopInstruction,
  functionIndexWrapper,
  forLoopInstruction,
} from "~src/interpreter/controlItems/instructions";
import { CNodeType } from "~src/interpreter/controlItems/types";
import { CNodeP, ExpressionP } from "~src/processor/c-ast/core";
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
import { 
  DirectlyCalledFunction, 
  FunctionCallP, 
} from "~src/processor/c-ast/function";
import { 
  MemoryStore, 
  MemoryLoad, 
  LocalAddress, 
  DataSegmentAddress, 
  DynamicAddress, 
  ReturnObjectAddress,
  FunctionTableIndex
} from "~src/processor/c-ast/memory";
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
import { containsBreakStatement, containsContinueStatement } from "~src/interpreter/utils/jumpStatementChecking";
import { ControlItem } from "~src/interpreter/utils/control";
import { createMemoryAddress } from "~src/interpreter/utils/addressUtils";

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

  DoWhileLoop: (runtime: Runtime, node: DoWhileLoopP): Runtime => {
    const hasBreak = containsBreakStatement(node.body);
    const hasContinue = containsContinueStatement(node.body);
    
    let pRuntime = runtime;
    
    if (hasBreak) {
      pRuntime = pRuntime.push([breakMarkInstruction()]);
    }

    pRuntime = pRuntime.push([
      node.condition,
      whileLoopInstruction(node.condition, node.body, hasContinue)
    ]);

    if (hasContinue) {
      pRuntime = pRuntime.push([continueMarkInstruction()]);
    }

    return pRuntime.push([...node.body])
  },

  WhileLoop: (runtime: Runtime, node: WhileLoopP): Runtime => {
    const hasBreak = containsBreakStatement(node.body);
    const hasContinue = containsContinueStatement(node.body);
    
    let pRuntime = runtime;
    
    if (hasBreak) {
      pRuntime = pRuntime.push([breakMarkInstruction()]);
    }

    pRuntime = pRuntime.push([
      whileLoopInstruction(node.condition, node.body, hasContinue)
    ]);
    
    return pRuntime.push([node.condition]);
  },

  ForLoop: (runtime: Runtime, node: ForLoopP): Runtime => {
    const hasBreak = containsBreakStatement(node.body);
    const hasContinue = containsContinueStatement(node.body);
    
    const condition: ExpressionP = node.condition === null
      ? {
          type: "IntegerConstant",
          value: 1n,
          dataType: "signed int"
        }
      : node.condition;

    const forLoopInstr = forLoopInstruction(
      node.body,
      node.update,
      condition,
      hasContinue
    )
    
    let pRuntime = runtime;

    if (hasBreak) {
      pRuntime = pRuntime.push([breakMarkInstruction()]);
    }

    return pRuntime.push([
      ...node.clause,
      condition,
      forLoopInstr
    ])
  },

  // === JUMP STATEMENTS ===

  ReturnStatement: (runtime: Runtime, node: ReturnStatementP): Runtime => {
    const topControlItem = runtime.peekControl();

    if(topControlItem.type === "STACKFRAMETEARDOWNINSTRUCTION" || runtime.hasCompleted()) {
      return runtime;
    } else {
      const returnStatement: ReturnStatementP = {
        type: "ReturnStatement"
      }
      const [ _ , popedRuntime ] = runtime.popControl();
      const newRuntime = popedRuntime.push([returnStatement]);

      return newRuntime;
    }
  },

  BreakStatement: (runtime: Runtime, node: BreakStatementP): Runtime => {
    let currRuntime = runtime;
    let foundBreakMark = false;

    while (!currRuntime.isControlEmpty()) {
      const [item, newRuntime] = currRuntime.popNode();
      currRuntime = newRuntime;

      if (isBreakMarkInstruction(item)) {
        foundBreakMark = true;
        break;
      }
    }
    
    if (!foundBreakMark) {
      throw new Error("Unable to locate break mark");
    }

    return currRuntime;
  },

  ContinueStatement: (runtime: Runtime, node: ContinueStatementP): Runtime => {
    let currRuntime = runtime;
    let foundContinueMark = false;

    while (!currRuntime.isControlEmpty()) {
      const [item, newRuntime] = currRuntime.popNode();
      currRuntime = newRuntime;

      if (isContinueMarkInstruction(item)) {
        foundContinueMark = true;
        break;
      }
    }
    
    if (!foundContinueMark) {
      throw new Error("Unable to locate continue mark");
    }

    return currRuntime;
  },

  /**
   * Followed from: https://stackoverflow.com/questions/68406541/how-cases-get-evaluated-in-switch-statements-c
   */
  SwitchStatement: (runtime: Runtime, node: SwitchStatementP): Runtime => {
    const hasBreak = containsBreakStatement(
      [...node.cases.flatMap(c => c.statements), ...node.defaultStatements]
    )

    let conditions: ControlItem[] = [];
    let statements: ControlItem[] = [];
    
    for (let i = 0; i < node.cases.length; i++) {
      const caseItem = node.cases[i];
      const casePair = createCaseInstructionPair(i);
      
      conditions.push(caseItem.condition.rightExpr);
      conditions.push(casePair.jumpInstruction);

      statements.push(casePair.markInstruction);
      statements.push(...caseItem.statements);
    }

     if (node.defaultStatements) {
      const defaultPair = createDefaultCaseInstructionPair();
      
      conditions.push(defaultPair.jumpInstruction);
      
      statements.push(defaultPair.markInstruction);
      statements.push(...node.defaultStatements);
    }

    let updatedRuntime = runtime;

    if (hasBreak) {
      updatedRuntime = updatedRuntime.push([breakMarkInstruction()]);
    }

    return updatedRuntime.push(statements).push(conditions).push([node.targetExpression]);
  },

  // ========== MEMORY ==========  

  MemoryLoad: (runtime: Runtime, node: MemoryLoad): Runtime => {
    return runtime.push([
      node.address,
      memoryLoadInstruction(node.dataType),
    ])
  },

  FunctionTableIndex: (runtime: Runtime, node: FunctionTableIndex): Runtime => {
    const newRuntime = runtime.pushValue(node);
    return newRuntime;
  },

  MemoryStore: (runtime: Runtime, node: MemoryStore): Runtime => {
    return runtime.push([
      node.value,
      node.address,
      memoryStoreInstruction(node.dataType),
      popInstruction(),
    ])
  },

  LocalAddress: (runtime: Runtime, node: LocalAddress): Runtime => {
    return runtime.pushValue(
      createMemoryAddress(
        BigInt(runtime.getPointers().basePointer.value) + node.offset.value,
      )
    )
  },

  DataSegmentAddress: (runtime: Runtime, node: DataSegmentAddress): Runtime => {
    return runtime.pushValue(
      createMemoryAddress(
        node.offset.value,
      )
    )
  },

  ReturnObjectAddress: (runtime: Runtime, node: ReturnObjectAddress): Runtime => {
    if (node.subtype === "load") {
      return runtime.pushValue(
        createMemoryAddress(
          BigInt(runtime.getPointers().stackPointer.value) + node.offset.value
        )
      )
    } else {
      return runtime.pushValue(
        createMemoryAddress(
          BigInt(runtime.getPointers().basePointer.value) + node.offset.value
        )
      )
    }
  },

  DynamicAddress: (runtime: Runtime, node: DynamicAddress): Runtime => {
    return runtime.pushNode([
      node.address
    ])
  },

  FunctionCall: (runtime: Runtime, node: FunctionCallP): Runtime => {
    // push order: stack frame tear down instruction, call instruction (contains function details information, and function call information),
    // arguments
    const pointers = runtime.getPointers();

    let funcIndex : ExpressionP;

    if(node.calledFunction.type === "DirectlyCalledFunction") {
      const temp = node.calledFunction;
      temp as DirectlyCalledFunction;
      const index = Runtime.astRootP.functionTable.findIndex(x => x.functionName === temp.functionName);

      if(index === -1) {
        throw new Error(`Function not found: ${temp.functionName}`);
      }

      funcIndex = {
        type: "IntegerConstant",
        value: BigInt(index),
        dataType: "unsigned int"
      };

    } else {
      const temp = node.calledFunction;
      funcIndex = temp.functionAddress;
    }

    const newRuntime = runtime.push([
      ...node.args,
      funcIndex,
      functionIndexWrapper(),
      callInstruction(
        node.calledFunction,
        node.functionDetails
      ),
      stackFrameTearDownInstruction(
        pointers.basePointer.value,
        pointers.stackPointer.value
      ),
    ]);

    return newRuntime;
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
    
    const newRuntime = runtime.push([node.leftExpr, node.rightExpr, binaryOpInstruction(node.operator, node.dataType)]) 

    return runtimeWithRight.pushNode([node.leftExpr]);
  },

  UnaryExpression: (runtime: Runtime, node: UnaryExpressionP): Runtime => {
    const runtimeWithInstruction = runtime.pushInstruction([unaryOpInstruction(node.operator)]);
    return runtimeWithInstruction.pushNode([node.expr]);
  },

  PreStatementExpression: (runtime: Runtime, node: PreStatementExpressionP): Runtime => {
    const newRuntime = runtime.push([
      ...node.statements,
      node.expr
    ])

    return newRuntime;
  },

  PostStatementExpression: (runtime: Runtime, node: PostStatementExpressionP): Runtime => {
    const newRuntime = runtime.push([
      node.expr,
      ...node.statements
    ])

    return newRuntime;
  },

  ConditionalExpression: (runtime: Runtime, node: ConditionalExpressionP): Runtime => {
    const runtimeWithInstruction = runtime.pushInstruction([branchOpInstruction([node.trueExpression], [node.falseExpression])]);
    return runtimeWithInstruction.pushNode([node.condition]);
  }
};