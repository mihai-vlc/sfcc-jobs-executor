import * as vscode from "vscode";
import { Step, StepResultType } from "./Step";

export default class MultistepMenu {
  private steps: Step[] = [];
  private activeStep: number = 0;

  constructor() {}

  addStep(step: Step) {
    this.steps.push(step);
  }

  async show() {
    try {
      while (this.activeStep < this.steps.length) {
        const currentStep = this.steps[this.activeStep];

        currentStep.setStepPosition(this.activeStep + 1, this.steps.length);

        const result: StepResultType = await currentStep.show();

        if (result === StepResultType.CANCEL) {
          vscode.window.showInformationMessage("Canceled step");
          break;
        }

        this.activeStep++;
      }
    } catch (e) {
      vscode.window.showErrorMessage("Error in the multistep menu " + e);
    }
  }
}
