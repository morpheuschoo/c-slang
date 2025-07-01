import { CNodeP } from "~src/processor/c-ast/core";
import { Stack } from "./stack";
import { Instruction, InstructionType, isInstruction } from "~src/interpreter/controlItems/instructions";

export type ControlItem = CNodeP | Instruction;

export class Control extends Stack<ControlItem, Control> {
  protected createNew(items: ReadonlyArray<ControlItem>): Control {
    return new Control(items);
  }

  toString(): string {
    if (this.isEmpty()) {
      return "  <empty>";
    }
    
    const controlItems = this.toArray();
    let result = "";

    for (let i = controlItems.length - 1; i >= 0; i--) {
      const item = controlItems[i];
      const itemPosition = controlItems.length - i;
      
      if (isInstruction(item)) {
        if (item.type === InstructionType.BINARY_OP) {
          result += `  ${itemPosition}. [Instruction] ${item.type}: '${(item as any).operator}'\n`;
        } else if (item.type === InstructionType.UNARY_OP) {
          result += `  ${itemPosition}. [Instruction] ${item.type}: '${(item as any).operator}'\n`;
        } else if (
          item.type === InstructionType.BRANCH ||
          item.type === InstructionType.POP ||
          item.type === InstructionType.WHILE ||
          item.type === InstructionType.MEMORY_LOAD ||
          item.type === InstructionType.MEMORY_STORE ||
          item.type === InstructionType.BREAK_MARK ||
          item.type === InstructionType.CONTINUE_MARK
        ) {
          result += `  ${itemPosition}. [Instruction] ${item.type}\n`;
        } else if (
          item.type === InstructionType.CASE_JUMP ||
          item.type === InstructionType.CASE_MARK
        ) {
          result += `  ${itemPosition}. [Instruction] ${item.type}: '${item.caseValue}'\n`;
        } else {
          result += `  ${itemPosition}. [Instruction] ${item.type}\n`
        }
      } else {
        const nodeItem = item as any;
        let additionalInfo = '';
        
        switch (nodeItem.type) {
          case 'FunctionDefinition':
            additionalInfo = nodeItem.name ? `: ${nodeItem.name}` : '';
            break;
          case 'IntegerConstant':
          case 'FloatConstant':
            additionalInfo = nodeItem.value !== undefined ? `: ${nodeItem.value}` : '';
            break;
          case 'UnaryExpression':
          case 'BinaryExpression':
            additionalInfo = nodeItem.operator ? `: '${nodeItem.operator}'` : '';
            break;
        }

        result += `  ${itemPosition}. [Node] ${nodeItem.type}${additionalInfo}\n`;
      }
    }
    return result.trimEnd();
  }
}