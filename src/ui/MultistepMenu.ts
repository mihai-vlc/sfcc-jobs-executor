import * as vscode from "vscode";
import { Step, StepContext, StepResult, StepResultType } from "./Step";

export default class MultistepMenu {
  constructor(private initalStep: Step) {}

  async show() {
    try {
      let nextStep: Step | undefined = this.initalStep;

      while (nextStep) {
        const result: StepResult = await nextStep.show();

        if (result.type === StepResultType.CANCEL) {
          vscode.window.showInformationMessage("Canceled action");
          break;
        }

        nextStep = result.nextStep;
      }
    } catch (e) {
      vscode.window.showErrorMessage("Error in the multistep menu " + e);
    }
  }
}
