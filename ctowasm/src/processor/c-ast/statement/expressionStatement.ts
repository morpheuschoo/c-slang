import { CNodePBase, ExpressionP } from "../core";

export interface ExpressionStatementP extends CNodePBase {
  type: "ExpressionStatement";
  expr: ExpressionP;
}
