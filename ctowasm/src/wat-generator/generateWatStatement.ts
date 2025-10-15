import { WatGeneratorError, toJson } from "~src/errors";
import { WasmSelectionStatement } from "~src/translator/wasm-ast/control";
import { WasmStatement } from "~src/translator/wasm-ast/core";
import { FUNCTION_TYPE_LABEL } from "~src/wat-generator/constants";
import generateWatExpression from "~src/wat-generator/generateWatExpression";
import {
  generateStatementsList,
  generateArgString,
  getWasmMemoryStoreInstruction,
  generateBranchTableInstruction,
  getTempRegister,
} from "~src/wat-generator/util";

/**
 * Generates the WAT from given AST node. Only to be used for nodes within a function body.
 */
export default function generateWatStatement(node: WasmStatement): string {
  if (node.type === "GlobalSet") {
    return `(global.set $${node.name} ${generateWatExpression(node.value)})`;
  } else if (node.type === "LocalSet") {
    return `(local.set $${node.name} ${generateWatExpression(node.value)})`;
  } else if (node.type === "FunctionCall") {
    return `(call $${node.name} ${generateStatementsList(
      node.stackFrameSetup,
    )}) ${generateStatementsList(node.stackFrameTearDown)}`;
  } else if (node.type === "IndirectFunctionCall") {
    return `(call_indirect (type ${FUNCTION_TYPE_LABEL}) ${generateWatExpression(
      node.index,
    )} ${generateStatementsList(
      node.stackFrameSetup,
    )}) ${generateStatementsList(node.stackFrameTearDown)}`;
  } else if (node.type === "RegularFunctionCall") {
    return `(call $${node.name}${generateArgString(node.args)})`;
  } else if (node.type === "SelectionStatement") {
    const n = node as WasmSelectionStatement;
    return `(if ${generateWatExpression(n.condition)} (then ${n.actions
      .map((action) => generateWatStatement(action))
      .join(" ")})${
      n.elseStatements.length > 0
        ? " (else" +
          n.elseStatements
            .map((statement) => generateWatStatement(statement))
            .join(" ") +
          ")"
        : ""
    })`;
  } else if (node.type === "ReturnStatement") {
    return `(return)`;
  } else if (node.type === "Loop") {
    return `(loop $${node.label}${
      node.body.length > 0
        ? " " + node.body.map((line) => generateWatStatement(line)).join(" ")
        : ""
    })`;
  } else if (node.type === "Block") {
    return `(block $${node.label}${
      node.body.length > 0
        ? " " + node.body.map((line) => generateWatStatement(line)).join(" ")
        : ""
    })`;
  } else if (node.type === "Branch") {
    return `(br $${node.label})`;
  } else if (node.type === "BranchIf") {
    return `(br_if $${node.label} ${generateWatExpression(node.condition)})`;
  } else if (node.type === "MemoryGrow") {
    return `(drop (memory.grow ${generateWatExpression(node.pagesToGrowBy)}))`;
  } else if (node.type === "MemoryStore") {
    return `(${getWasmMemoryStoreInstruction(
      node.wasmDataType,
      node.numOfBytes,
    )} ${generateWatExpression(node.addr)} ${generateWatExpression(
      node.value,
    )})`;
  } else if (node.type === "MemoryStoreFromWasmStack") {
    // need to use psuedoregister R2 to temporarily store value from virtual stack,
    // then put store address on virtual stack followed by loading from psuedoregister R2.
    // This is needed to provide the intsructions in correct order to store instruction.
    return `(${getWasmMemoryStoreInstruction(
      node.wasmDataType,
      node.numOfBytes,
    )} (global.set $${getTempRegister(
      node.wasmDataType,
    )}) ${generateWatExpression(node.addr)} (global.get $${getTempRegister(
      node.wasmDataType,
    )}))`;
  } else if (node.type === "BranchTable") {
    return generateBranchTableInstruction(node);
  } else if (node.type === "Nop") {
    return "(nop)";
  } else {
    throw new WatGeneratorError(`Unhandled statement: ${toJson(node)}`);
  }
}
