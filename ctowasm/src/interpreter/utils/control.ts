import { CNodeP } from "~src/processor/c-ast/core";
import { ImmutableStack, Stack } from "./stack";
import { Instruction, InstructionType, isInstruction } from "~src/interpreter/controlItems/instructions";

export type ControlItem = CNodeP | Instruction;

export class Control implements ImmutableStack<ControlItem, Control> {
  private readonly stack: Stack<ControlItem>;

  constructor(items: ReadonlyArray<ControlItem> = []) {
    this.stack = new Stack<ControlItem>(items);
  }

  push(item: ControlItem): Control {
    const newStack = this.stack.push(item);
    return new Control(newStack.toArray());
  }

  pop(): [ControlItem | undefined, Control] {
    const [item, newStack] = this.stack.pop();
    return [item, new Control(newStack.toArray())];
  }

  peek(): ControlItem | undefined {
    return this.stack.peek();
  }

  size(): number {
    return this.stack.size();
  }

  isEmpty(): boolean {
    return this.stack.isEmpty();
  }

  toArray(): ReadonlyArray<ControlItem> {
    return this.stack.toArray();
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
        } else {
          
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