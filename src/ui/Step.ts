import Deferred from "../lib/Deferred";
import * as vscode from "vscode";

export abstract class Step<T = any> {
  protected accepted: boolean = false;
  protected deferred!: Deferred<StepResult>;
  protected input!: vscode.QuickInput;
  private calculateNextStep!: (context: StepContext) => Step | null;

  constructor(protected context: StepContext) {}

  abstract validate(): boolean;
  abstract getValue(): T;

  setCalculateNextStep(callback: (context: StepContext) => Step | null) {
    this.calculateNextStep = callback;
  }

  handleAccept() {
    if (!this.validate()) {
      return;
    }

    this.accepted = true;
    this.context.acceptedSteps.push(this);
    this.input.hide();

    console.log(this.input.title, "SUCCESS");
    this.deferred.resolve({
      type: StepResultType.SUCCESS,
      nextStep: this.calculateNextStep
        ? this.calculateNextStep(this.context) || undefined
        : undefined,
    });
  }

  handleHide() {
    console.log(this.input.title, "Hide");
    if (this.accepted) {
      return;
    }

    console.log(this.input.title, "Cancel");
    this.deferred.resolve({
      type: StepResultType.CANCEL,
    });
  }

  async show() {
    console.log(this.input.title, "Show");
    this.input.show();

    this.accepted = false;
    this.deferred = new Deferred<StepResult>();
    return this.deferred.promise;
  }
}

export enum StepResultType {
  SUCCESS,
  ERROR,
  CANCEL,
}

export interface StepContext {
  currentStep?: Step;
  acceptedSteps: Step[];
}

export interface StepResult {
  type: StepResultType;
  nextStep?: Step;
}
