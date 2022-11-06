import * as vscode from "vscode";
import { Step, StepContext } from "./Step";

export class InputStep extends Step<string> {
  protected input: vscode.InputBox;

  constructor(context: StepContext, title: string) {
    super(context);

    this.input = vscode.window.createInputBox();

    this.input.title = title;
    this.input.ignoreFocusOut = true;

    this.input.onDidAccept(this.handleAccept.bind(this));
    this.input.onDidChangeValue(this.validate.bind(this));
    this.input.onDidHide(this.handleHide.bind(this));
  }

  validate(): boolean {
    const value = this.input.value;

    if (!value) {
      this.input.validationMessage = "Please insert a value";
      return false;
    }

    this.input.validationMessage = "";
    return true;
  }

  getValue() {
    return this.input.value;
  }
}
