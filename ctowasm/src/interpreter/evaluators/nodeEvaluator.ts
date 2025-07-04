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
import { DataSegmentAddress, DynamicAddress, LocalAddress, MemoryLoad, MemoryStore, ReturnObjectAddress } from "~src/processor/c-ast/memory";
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
import { containsBreakStatement, containsContinueStatement } from "~src/interpreter/utils/jumpStatementChecking";
import { ControlItem } from "~src/interpreter/utils/control";
import { createMemoryAddress, MemoryAddress } from "../utils/addressUtils";

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

  // TODO
  ForLoop: (runtime: Runtime, node: ForLoopP): Runtime => {
    return new Runtime();
  },

  // === JUMP STATEMENTS ===

  // TODO
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
   * https://stackoverflow.com/questions/68406541/how-cases-get-evaluated-in-switch-statements-c
   * No default statement body not tested yet
   * 
   * TODO: 
   * 2. redundant case marks need to be skipped
   * 3. redundant break marks need to be skipped
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

  // TODO
  ReturnObjectAddress: (runtime: Runtime, node: ReturnObjectAddress): Runtime => {
    // const newRuntime = runtime.pushValue(node);

    // return newRuntime;
  },

  MemoryLoad: (runtime: Runtime, node: MemoryLoad): Runtime => {
    let addressPush;
    switch(node.address.type) {
      case "LocalAddress":
        addressPush = createMemoryAddress(
          BigInt(runtime.getPointers().basePointer.value) + node.address.offset.value,
          node.dataType
        );
        break;

      case "DataSegmentAddress":
        addressPush = createMemoryAddress(
          node.address.offset.value,
          node.dataType
        );
        break;
      
      // TODO: quite bad rn lol
      case "DynamicAddress":
        addressPush = {
          type: node.address.address.type,
          address: node.address.address.address,
          dataType: node.address.address.dataType,
          targetType: node.dataType,
        }
        break;

      // TODO: Other Types
      default:
        throw new Error(`MemoryLoad for ${node.address.type} has not been implemented`);
    }
    
    if (addressPush === undefined) {
      throw new Error('MemoryLoad for Address not implemented yet')
    }
    
    if (node.targetType !== undefined) {
      return runtime.push([
        addressPush,
        memoryLoadInstruction(node.dataType, node.targetType)
      ]);
    }

    return runtime.push([
      addressPush,
      memoryLoadInstruction(node.dataType),
    ])
  },

  MemoryStore: (runtime: Runtime, node: MemoryStore): Runtime => {
    let addressPush;
    
    // handle target address (where we are storing)
    switch(node.address.type) {
      case "LocalAddress":
        addressPush = createMemoryAddress(
          BigInt(runtime.getPointers().basePointer.value) + node.address.offset.value,
          node.dataType
        );
        break;

      case "DataSegmentAddress":
        addressPush = createMemoryAddress(
          node.address.offset.value,
          node.dataType
        );
        break;
      
      case "DynamicAddress":
        throw new Error("DynamicAddress for MemoryStore not implemented")
        
      // TODO: Other Types
    }
    
    if (addressPush === undefined) {
      throw new Error('MemoryStore for Address not implemented yet')
    }

    // handle value
    // TODO: still needs fixing
    let valueToStore: ControlItem = node.value;
    if (node.value.type === "LocalAddress") {
      valueToStore = createMemoryAddress(
        BigInt(runtime.getPointers().basePointer.value) + node.value.offset.value,
        node.value.dataType,
      );
    }

    return runtime.push([
      valueToStore,
      addressPush,
      memoryStoreInstruction(node.dataType),
      popInstruction(),
    ])
  },

  MemoryAddress: (runtime: Runtime, node: MemoryAddress): Runtime => {
    return runtime.pushValue(node);
  },

  LocalAddress: (runtime: Runtime, node: LocalAddress): Runtime => {
    throw new Error("LocalAddress should not be in Control")
  },

  DataSegmentAddress: (runtime: Runtime, node: DataSegmentAddress): Runtime => {
    throw new Error("DataSegmentAddress should not be in Control")
  },

  DynamicAddress: (runtime: Runtime, node: DynamicAddress): Runtime => {
    throw new Error("DynamicAddress should not be in Control")
  },

  // TODO
  FunctionCall: (runtime: Runtime, node: FunctionCallP): Runtime => {
    // push order: stack frame tear down instruction, call instruction (contains function details information, and function call information),
    // arguments
    const pointers = runtime.getPointers();

    const newRuntime = runtime.push([
      ...node.args,
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

  // TODO
  PreStatementExpression: (runtime: Runtime, node: PreStatementExpressionP): Runtime => {
    const newRuntime = runtime.push([
      ...node.statements,
      node.expr
    ])

    return newRuntime;
  },

  // TODO
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