import * as vscode from "vscode";
import Deferred from "../lib/Deferred";
import { Step, StepResultType } from "./Step";

export class InputStep implements Step {
  private quickInput: vscode.InputBox;
  private deferred!: Deferred<StepResultType>;
  private accepted: boolean = false;

  constructor(title: string) {
    this.quickInput = vscode.window.createInputBox();

    this.quickInput.title = title;
    this.quickInput.prompt = "Insert the item name";

    this.quickInput.onDidAccept(this.handleAccept.bind(this));
    this.quickInput.onDidChangeValue(this.validate.bind(this));
    this.quickInput.onDidHide(this.handleHide.bind(this));
  }

  setStepPosition(stepNumber: number, totalSteps: number): void {
    this.quickInput.step = stepNumber;
    this.quickInput.totalSteps = totalSteps;
  }

  private handleAccept() {
    if (!this.validate()) {
      return;
    }

    this.accepted = true;

    if (this.deferred) {
      this.deferred.resolve(StepResultType.SUCCESS);
    }
    this.quickInput.hide();
  }

  handleHide() {
    if (this.accepted) {
      this.deferred.resolve(StepResultType.SUCCESS);
    } else {
      this.deferred.resolve(StepResultType.CANCEL);
    }
  }

  private validate(): boolean {
    const value = this.quickInput.value;

    if (!value) {
      this.quickInput.validationMessage = "Please insert a value";
      return false;
    }

    this.quickInput.validationMessage = "";
    return true;
  }

  show() {
    this.accepted = false;
    this.deferred = new Deferred<StepResultType>();
    this.quickInput.show();

    return this.deferred.promise;
  }
}
