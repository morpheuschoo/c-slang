import { Runtime } from "~src/interpreter/runtime";
import { 
  Instruction, 
  InstructionType, 
  BinaryOpInstruction, 
  UnaryOpInstruction, 
  branchOpInstruction,
  popInstruction,
  MemoryLoadInstruction,
  MemoryStoreInstruction,
  WhileLoopInstruction,
  BreakMarkInstruction,
  CaseMarkInstruction,
  CaseJumpInstruction,
  isCaseMarkInstruction,
  doCaseInstructionsMatch,
  isDefaultCaseInstruction,
  ContinueMarkInstruction,
  continueMarkInstruction,
  CallInstruction,
  StackFrameTearDownInstruction,
  FunctionIndexWrapper,
  ForLoopInstruction,
 } from "~src/interpreter/controlItems/instructions";
import { FunctionTableIndex, MemoryStore } from "~src/processor/c-ast/memory";
import { getSizeOfScalarDataType, isIntegerType } from "~src/common/utils";
import { performUnaryOperation } from "~src/processor/evaluateCompileTimeExpression";
import { getAdjustedIntValueAccordingToDataType } from "~src/processor/processConstant";
import { FloatDataType, IntegerDataType, UnaryOperator } from "~src/common/types";
import { StashItem, Stash } from "~src/interpreter/utils/stash";
import { Module, ModuleFunction } from "~src/modules/types";
import { ConstantP } from "~src/processor/c-ast/expression/constants";
import { ReturnStatementP } from "~src/processor/c-ast/statement/jumpStatement";
import { isConstantTrue, performConstantAndAddressBinaryOperation } from "~src/interpreter/utils/constantsUtils"

export const InstructionEvaluator: {
  [InstrType in Instruction["type"]]: (
    runtime: Runtime, 
    instruction: Extract<Instruction, { type: InstrType }>) => Runtime
} = {
  [InstructionType.UNARY_OP]: (runtime: Runtime, instruction: UnaryOpInstruction): Runtime => {
    const [operand, runtimeAfterPop] = runtime.popValue();

    if(!Stash.isConstant(operand)) {
      throw new Error(`Unary operation '${instruction.operator} requires an operand, but stash is empty'`)
    }

    /**
     * Bottom evaluation is same as in ~src\processor\evaluateCompileTimeExpression.ts
     * performUnaryOperation has been fixed to support "!" and "~"
     */
    const dataType = operand.dataType;

    let value = performUnaryOperation(operand.value, instruction.operator as UnaryOperator);
    if (isIntegerType(dataType)) {
      value = getAdjustedIntValueAccordingToDataType(value as bigint, dataType);

      return runtimeAfterPop.pushValue({
        type: "IntegerConstant",
        dataType: dataType as IntegerDataType,
        value,
      });
    } else {
      return runtimeAfterPop.pushValue({
        type: "FloatConstant",
        dataType: dataType as FloatDataType,
        value: value as number,
      });
    }
  },
  
  [InstructionType.BINARY_OP]: (runtime: Runtime, instruction: BinaryOpInstruction): Runtime => {
    const [right, runtimeAfterPopRight] = runtime.popValue();
    const [left, runtimeAfterPopLeft] = runtimeAfterPopRight.popValue();

    if (
      !(Stash.isConstant(left) || Stash.isMemoryAddress(left)) ||
      !(Stash.isConstant(right) || Stash.isMemoryAddress(right))
    ) {
      throw new Error(`Binary operator '${instruction.operator}' encountered operands that are not a constant or an address`);
    }

    return runtimeAfterPopLeft.pushValue(
      performConstantAndAddressBinaryOperation(left, instruction.operator, right)
    );
  },

  [InstructionType.BRANCH]: (runtime: Runtime, instruction: branchOpInstruction): Runtime => {
    const [condition, runtimeWithPoppedValue] = runtime.popValue();
    
    if (!Stash.isConstant(condition)) {
      throw new Error("Branch instruction expects a boolean")
    }
    
    const isTrue = isConstantTrue(condition);
    
    if (isTrue) {
      return runtimeWithPoppedValue.pushNode(instruction.trueExpr);
    }
    return runtimeWithPoppedValue.pushNode(instruction.falseExpr);
  },

  [InstructionType.MEMORY_STORE]: (runtime: Runtime, instruction: MemoryStoreInstruction): Runtime => {
    const [ address, runtimeAfter ]= runtime.popValue();
    const [ value, _ ] = runtimeAfter.popValue();

    /**
     * Ensures that address is a MemoryAddress
     * Checks for mismatches between address, value and instruction dataTypes
     */
    if (address.type !== "MemoryAddress") {
      throw new Error(`Expected MemoryAddress, but got ${address.type}`)
    }

    // if (value.type === "FunctionTableIndex") {
    //   throw new Error(`Did not expect FunctionTableIndex`);
    // }

    let newValue: StashItem;

    if(value.type === "FunctionTableIndex") {
      newValue = value.index
    } else {
      newValue = value;
    }
    
    return runtimeAfter.memoryWrite([{
      type: "RuntimeMemoryPair",
      address: address,
      value: newValue,
      dataType: instruction.dataType,
    }])
  },

  [InstructionType.MEMORY_LOAD]: (runtime: Runtime, instruction: MemoryLoadInstruction): Runtime => {
    const [ address, _ ] = runtime.popValue();

    if (address.type !== "MemoryAddress") {
      throw new Error(`Expected MemoryAddress, but got ${address.type}`)
    }

    return runtime.memoryLoad(address, instruction.dataType);
  },

  [InstructionType.STACKFRAMETEARDOWNINSTRUCTION]: (runtime: Runtime, instruction: StackFrameTearDownInstruction): Runtime => {
    const newRuntime = runtime.stackFrameTearDown(instruction.stackPointer, instruction.basePointer);

    return newRuntime;
  },

  [InstructionType.FUNCTIONINDEXWRAPPER]: (runtime: Runtime, instruction: FunctionIndexWrapper): Runtime => {
    const [ index, popedRuntime ] = runtime.popValue();

    let wrappedFunctionIndex: FunctionTableIndex;

    if(index.type === "IntegerConstant") {
      wrappedFunctionIndex = {
        type: "FunctionTableIndex",
        index: index,
        dataType: "pointer"
      }
    } else if(index.type === "MemoryAddress") {
      wrappedFunctionIndex = {
        type: "FunctionTableIndex",
        index: {
          type: "IntegerConstant",
          value: index.value,
          dataType: "unsigned int"
        },
        dataType: "pointer"
      }
    } else if(index.type === "FunctionTableIndex") {
      wrappedFunctionIndex = index
    } else {
      throw new Error(`Wrong type for function index value in Function index wrapper, expected: IntegerConstant or MemoryAddress, got: ${index.type}`);
    }

    const newRuntime = popedRuntime.push([wrappedFunctionIndex]);

    return newRuntime;
  },

  [InstructionType.CALLINSTRUCTION]: (runtime: Runtime, instruction: CallInstruction): Runtime => {
    let [ functionAddress, poppedRuntime ] = runtime.popValue();

    const numOfParameters = instruction.functionDetails.parameters.length;
    let parameters: StashItem[] = [];
    for(let i = 0; i < numOfParameters; i++) {
      const [parameter, newRuntime] = poppedRuntime.popValue();

      parameters.push(parameter);
      poppedRuntime = newRuntime;
    }
    parameters.reverse();

    if(functionAddress.type !== "FunctionTableIndex") {
      throw new Error("Wrong function pointer type in Call instruction");
    }
    
    const calledFunction = Runtime.astRootP.functionTable[Number(functionAddress.index.value)];
    
    // if(calledFunction.functionName === "print_int") {
    //   const temp = parameters[0];
    //   if(temp.type !== "IntegerConstant") {
    //     throw new Error("Error");
    //   }

    //   console.log("PRINTED VALUE: ", temp.value);
    //   return poppedRuntime;
    // }

    if(Runtime.astRootP.functions.find(x => x.name === calledFunction.functionName)) {
      const func = Runtime.astRootP.functions.find(x => x.name === calledFunction.functionName);
      if(!func) {
        throw new Error("No function called: " + calledFunction.functionName);
      }

      // Set up a new Stackframe
      const sizeOfParams = instruction.functionDetails.sizeOfParams;
      const sizeOfLocals = func.sizeOfLocals;
      const sizeOfReturn = instruction.functionDetails.sizeOfReturn;

      const writtenRuntime = poppedRuntime.stackFrameSetup(
        sizeOfParams,
        sizeOfLocals,
        sizeOfReturn,
        parameters
      )

      // push body statements
      const resultRuntime = writtenRuntime.push(func.body);
  
      return resultRuntime;
    } else {
      // Set up a new Stackframe
      const sizeOfParams = instruction.functionDetails.sizeOfParams;
      const sizeOfReturn = instruction.functionDetails.sizeOfReturn;
      
      const writtenRuntime = poppedRuntime.stackFrameSetup(
        sizeOfParams,
        0,
        sizeOfReturn,
        parameters
      )

      // Copy current memory into the modules repository memory;
      writtenRuntime.writeToModulesMemory();

      let func : ModuleFunction | undefined = undefined, encapsulatingModule: Module | undefined;
      
      for(const moduleName of Runtime.includedModules) {
        const module = Runtime.modules.modules[moduleName];
        
        if(module.moduleFunctions[calledFunction.functionName]) {
          func = module.moduleFunctions[calledFunction.functionName];
          encapsulatingModule = module;
          break;
        }
      }
      
      if (!func) {
        throw new Error(`Function ${calledFunction.functionName} not found in included modules.`);
      }

      const returnObjects = calledFunction.functionDetails.returnObjects;

      if(!returnObjects) {
        func.jsFunction.apply(encapsulatingModule, parameters.map(x => {
          if(x.type === "IntegerConstant" || x.type === "FloatConstant" || x.type === "MemoryAddress") {
            return Number(x.value);
          } else {
            return Number(x.index);
          } 
        }));

        // Clone module repository memory after function call
        const finalRuntime = writtenRuntime.cloneModuleMemory();
        
        return finalRuntime;
      } else {
        const res : unknown = func.jsFunction.apply(encapsulatingModule, parameters.map(x => {
          if(x.type === "IntegerConstant" || x.type === "FloatConstant" || x.type === "MemoryAddress") {
            return Number(x.value);
          } else {
            return Number(x.index);
          } 
        }));

        // Clone module repository memory after function call
        const finalRuntime = writtenRuntime.cloneModuleMemory();
        
        let results = [];
        // check if res is an array
        if(Array.isArray(res)) {
          results = res;
        } else {
          results = [res];
        }
        
        if(results.length !== returnObjects.length) {
          throw new Error("results of external function length does not match returnObjects length");
        }

        // Prepare memory store expressions for each return object address
        const memoryStoreExpressions : MemoryStore[] = [];
        let currentOffSet = 0;
        
        for(let i = 0;i < results.length;i++) {
          let storedValue : ConstantP;
          if(returnObjects[i].dataType === "float" || returnObjects[i].dataType === "double") {
            storedValue = {
              type: "FloatConstant",
              value: Number(results[i]),
              dataType: returnObjects[i].dataType as FloatDataType,
            }
          } else {
            storedValue = {
              type: "IntegerConstant",
              value: BigInt(results[i]),
              dataType: returnObjects[i].dataType as IntegerDataType
            }
          }

          const expression : MemoryStore = {
            type: "MemoryStore",
            address: {
              type: "ReturnObjectAddress",
              subtype: "store",
              offset: {
                type: "IntegerConstant",
                value: BigInt(currentOffSet),
                dataType: "signed int"
              },
              dataType: "pointer"
            },
            dataType: returnObjects[i].dataType,
            value: storedValue
          }

          memoryStoreExpressions.push(expression);
          currentOffSet += getSizeOfScalarDataType(returnObjects[i].dataType);
        }
        const returnStatement : ReturnStatementP = {
          type: "ReturnStatement"
        };

        return finalRuntime.push([...memoryStoreExpressions, returnStatement]);
      }
    }
  },

  [InstructionType.POP]: (runtime: Runtime, instruction: popInstruction): Runtime => {
    const [_, runtimeAfterPop] = runtime.popValue();
    return runtimeAfterPop;
  },

  [InstructionType.WHILE]: (runtime: Runtime, instruction: WhileLoopInstruction): Runtime => {
    let [condition, updatedRuntime] = runtime.popValue();

    if (!Stash.isConstant(condition)) {
      throw new Error("While instruction expects a boolean")
    }
    
    const isTrue = isConstantTrue(condition);

    if (!isTrue) {
      return updatedRuntime;
    }
    
    updatedRuntime = updatedRuntime.push([
      instruction.condition,
      instruction
    ]);

    if (instruction.hasContinue) {
      updatedRuntime = updatedRuntime.push([continueMarkInstruction()]);
    }

    return updatedRuntime.push(instruction.body);
  },

  [InstructionType.FORLOOP]: (runtime: Runtime, instruction: ForLoopInstruction): Runtime => {
    let [condition, updatedRuntime] = runtime.popValue();

    if (!Stash.isConstant(condition)) {
      throw new Error("While instruction expects a boolean")
    }
    
    const isTrue = isConstantTrue(condition);

    if (!isTrue) {
      return updatedRuntime;
    }

    updatedRuntime = updatedRuntime.push([
      ...instruction.update,
      instruction.condition,
      instruction,
    ])

    if (instruction.hasContinue) {
      updatedRuntime = updatedRuntime.push([continueMarkInstruction()]);
    }

    return updatedRuntime.push(instruction.body);
  },

  [InstructionType.CASE_JUMP]: (runtime: Runtime, instruction: CaseJumpInstruction): Runtime => {
    const [right, runtimeAfterPopRight] = runtime.popValue();
    
    let currRuntime = runtimeAfterPopRight;
    
    // if not default case jump instruction perform the below
    if(!isDefaultCaseInstruction(instruction)) {
      let [left, runtimeAfterPopLeft] = runtimeAfterPopRight.popValue();

      if (!Stash.isConstant(left) || !Stash.isConstant(right)) {
        throw new Error(`Case jump requires 2 constants in stash`);
      }

      // manually check for equality
      const isTrueValue = performConstantAndAddressBinaryOperation(left, "==", right);

      if (Stash.isMemoryAddress(isTrueValue)) {
        throw new Error(`Case jump '${instruction.caseValue}' encountered a MemoryAddress`);
      }

      const isTrue = isConstantTrue(isTrueValue);
      
      // if not true, return stash after popping the case expression
      if (!isTrue) {
        return runtimeAfterPopRight;
      }

      currRuntime = runtimeAfterPopLeft;
    }

    let foundCaseMark = false;

    // if true jump to the respective case mark
    while(!currRuntime.isControlEmpty()) {
      const [item, newRuntime] = currRuntime.popNode();
      currRuntime = newRuntime;

      if (isCaseMarkInstruction(item) && doCaseInstructionsMatch(instruction, item)) {
        foundCaseMark = true;
        break;
      }
    }

    if (!foundCaseMark) {
      throw new Error("Unable to locate associated case mark statement");
    }

    return currRuntime;
  },

  [InstructionType.CASE_MARK]: (runtime: Runtime, instruction: CaseMarkInstruction): Runtime => {
    return runtime;
  },

  [InstructionType.CONTINUE_MARK]: (runtime: Runtime, instruction: ContinueMarkInstruction): Runtime => {
    return runtime;
  },

  [InstructionType.BREAK_MARK]: (runtime: Runtime, instruction: BreakMarkInstruction): Runtime => {
    return runtime;
  },
};