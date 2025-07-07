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
  TypeConversionInstruction,
 } from "~src/interpreter/controlItems/instructions";
import { getSizeOfScalarDataType, isIntegerType } from "~src/common/utils";
import { DirectlyCalledFunction } from "~src/processor/c-ast/function";
import { performUnaryOperation } from "~src/processor/evaluateCompileTimeExpression";
import { getAdjustedIntValueAccordingToDataType } from "~src/processor/processConstant";
import { FloatDataType, IntegerDataType, UnaryOperator } from "~src/common/types";
import { StashItem, Stash } from "~src/interpreter/utils/stash";
import { isConstantTrue, performConstantBinaryOperation } from "~src/interpreter/utils/constantsUtils"
import { 
  createMemoryAddress, 
  isMemoryAddress, 
  RuntimeMemoryPair 
} from "~src/interpreter/utils/addressUtils";

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

    if (!Stash.isConstant(left) || !Stash.isConstant(right)) {
      throw new Error(`Binary operation '${instruction.operator} requires an operand, but stash is empty'`);
    }

    return runtimeAfterPopLeft.pushValue(performConstantBinaryOperation(left, instruction.operator, right));
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

    if (address.dataType !== instruction.dataType) {
      throw new Error(`Address dataType (${address.dataType}) doesn't match instruction dataType (${instruction.dataType})`);
    }

    // TODO: This type checking needs to be checked if it works / fixed
    switch(value.type) {
      case "IntegerConstant":
        if (!isIntegerType(instruction.dataType)) {
          throw new Error(`Type mismatch: Cannot store integer in ${instruction.dataType} memory location`);
        }
        break;
      case "FloatConstant":
        if (isIntegerType(instruction.dataType)) {
          throw new Error(`Type mismatch: Cannot store float in ${instruction.dataType} memory location`);
        }
        break;
      case "MemoryAddress":
        if (instruction.dataType !== "pointer") {
          throw new Error(`Type mismatch: Cannot store memory address in non-pointer location (${instruction.dataType})`);
        }
        break;
    }

    return runtimeAfter.memoryWrite([{
      type: "RuntimeMemoryPair",
      address: address,
      value: value
    }])
  },

  [InstructionType.MEMORY_LOAD]: (runtime: Runtime, instruction: MemoryLoadInstruction): Runtime => {
    const [ address, _ ] = runtime.popValue();

    if (address.type !== "MemoryAddress") {
      throw new Error(`Expected MemoryAddress, but got ${address.type}`)
    }

    if (address.dataType !== instruction.dataType) {
      throw new Error(`Address dataType (${address.dataType}) doesn't match instruction dataType (${instruction.dataType})`);
    }

    return runtime.memoryLoad(address);
  },

  [InstructionType.STACKFRAMETEARDOWNINSTRUCTION]: (runtime: Runtime, instruction: StackFrameTearDownInstruction): Runtime => {
    const newRuntime = runtime.stackFrameTearDown(instruction.stackPointer, instruction.basePointer);

    return newRuntime;
  },

  [InstructionType.CALLINSTRUCTION]: (runtime: Runtime, instruction: CallInstruction): Runtime => {
    const numOfParameters = instruction.functionDetails.parameters.length;
    
    let parameters: StashItem[] = [], popedRuntime = runtime;
    for(let i = 0; i < numOfParameters; i++) {
      const [parameter, newRuntime] = popedRuntime.popValue();

      parameters.push(parameter);
      popedRuntime = newRuntime;
    }
    parameters.reverse();

    if(instruction.calledFunction.type === "IndirectlyCalledFunction") {
      throw new Error("Indirectly Called Function not implemented yet");
    }

    const calledFunction = instruction.calledFunction;
    calledFunction as DirectlyCalledFunction;

    if(calledFunction.functionName === "print_int") {
      const temp = parameters[0];
      if(temp.type !== "IntegerConstant") {
        throw new Error("FUKK");
      }

      console.log("PRINTED VALUE: ", temp.value);
      return popedRuntime;
    }

    const func = Runtime.astRootP.functions.find(x => x.name === calledFunction.functionName);
    if(!func) {
      throw new Error("No function called: " + calledFunction.functionName);
    }
    
    // internal functions (defined by user)
    const sizeOfParams = instruction.functionDetails.sizeOfParams;
    const sizeOfLocals = func.sizeOfLocals;
    const sizeOfReturn = instruction.functionDetails.sizeOfReturn;

    // Set up a new Stackframe
    const newRuntime = popedRuntime.stackFrameSetup(
      sizeOfParams,
      sizeOfLocals,
      sizeOfReturn
    )
    
    let offset = 0;
    // Write parameters into memory
    const writeParameters : RuntimeMemoryPair[] = parameters.map(writeObject => {
      if(writeObject.type === "IntegerConstant" || writeObject.type === "FloatConstant") {
        const size = getSizeOfScalarDataType(writeObject.dataType)
        offset -= size;

        const writeAddress = createMemoryAddress(
          BigInt(runtime.getPointers().basePointer.value) + BigInt(offset),
          "pointer",
        )

        return {
          type: "RuntimeMemoryPair",
          address: writeAddress,
          value: writeObject
        };
      } else {
        throw new Error("Not implemented yet: pointers as function arguments");
      }
    })
    const writtenRuntime = newRuntime.memoryWrite(writeParameters);

    // push body statements
    const resultRuntime = writtenRuntime.push(func.body);

    return resultRuntime;
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
      const isTrue = isConstantTrue(performConstantBinaryOperation(left, "==", right));
      
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

  [InstructionType.TYPE_CONVERSION]: (runtime: Runtime, instruction: TypeConversionInstruction): Runtime => {
    const [address, newRuntime] = runtime.popValue();
    
    if (!isMemoryAddress(address)) {
      throw new Error(`Expected MemoryAddress in Stash but got ${address.type}`);
    }

    return newRuntime.pushValue(createMemoryAddress(address.value, instruction.targetType));
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