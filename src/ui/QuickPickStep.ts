import * as vscode from "vscode";
import { Step, StepContext } from "./Step";

interface ItemOptions {
  hideDescription?: boolean;
}
export class Item<T = any> implements vscode.QuickPickItem {
  picked: boolean = true;

  get label() {
    return this.id;
  }

  get description() {
    if (this.options?.hideDescription) {
      return "";
    }

    return `Current value: ${this.value}`;
  }

  constructor(
    public readonly id: string,
    public readonly value: T,
    private options?: ItemOptions
  ) {}
}

export default class QuickPickStep extends Step<Item> {
  protected input: vscode.QuickPick<Item>;

  constructor(context: StepContext, title: string) {
    super(context);

    this.input = vscode.window.createQuickPick();

    this.input.title = title;
    this.input.placeholder = title;
    this.input.ignoreFocusOut = true;
    this.input.items = [];

    this.input.onDidAccept(this.handleAccept.bind(this));
    this.input.onDidHide(this.handleHide.bind(this));
  }

  setItems(items: Item[]) {
    this.input.items = items;
  }

  validate() {
    if (this.input.selectedItems.length === 0) {
      return false;
    }
    return true;
  }

  getValue(): Item {
    if (this.input.selectedItems.length === 0) {
      return this.input.items[0];
    }

    return this.input.selectedItems[0];
  }
}
