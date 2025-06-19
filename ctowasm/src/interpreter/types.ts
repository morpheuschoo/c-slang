import { 
  CNodeP, 
  ExpressionP, 
  StatementP 
} from "~src/processor/c-ast/core";

// Extract all possible node types from CNodeP
export type CNodeType = CNodeP["type"];