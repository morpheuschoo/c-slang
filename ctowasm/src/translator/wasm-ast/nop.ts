import { WasmAstNode } from "~src/translator/wasm-ast/core";

export interface WasmNop extends WasmAstNode {
  type: "Nop";
}