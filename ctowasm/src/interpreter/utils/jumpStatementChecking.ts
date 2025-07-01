import { CNodeP } from "~src/processor/c-ast/core";

// Should consider combining these two functions into one
// So the AST is traversed only once instead of twice

export function containsBreakStatement(stmt: CNodeP | CNodeP[]): boolean {
  if (Array.isArray(stmt)) {
    return stmt.some(s => containsBreakStatement(s));
  }

  switch (stmt.type) {
    case "BreakStatement":
      return true;
    case "SelectionStatement":
      return containsBreakStatement(stmt.ifStatements) || 
        (stmt.elseStatements ? containsBreakStatement(stmt.elseStatements) : false);
    default:
      return false;
  }
}

export function containsContinueStatement(stmt: CNodeP | CNodeP[]): boolean {
  if (Array.isArray(stmt)) {
    return stmt.some(s => containsContinueStatement(s));
  }

  switch (stmt.type) {
    case "ContinueStatement":
      return true;
    case "SelectionStatement":
      return containsContinueStatement(stmt.ifStatements) || 
        (stmt.elseStatements ? containsContinueStatement(stmt.elseStatements) : false);
    default:
      return false;
  }
}