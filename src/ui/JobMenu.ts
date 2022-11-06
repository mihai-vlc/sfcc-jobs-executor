import { InputStep } from "./InputStep";
import MultistepMenu from "./MultistepMenu";
import QuickPickStep, { Item } from "./QuickPickStep";
import { Step, StepContext } from "./Step";
import * as vscode from "vscode";
import { SavedJob } from "../lib/JobsTreeDataProvider";

export default class JobMenu {
  private jobIdStep: Step;
  private timeoutStep: Step;
  private settingsStep: QuickPickStep;
  private clearLogStep: QuickPickStep;
  private positionStep: Step;
  private menu: MultistepMenu;
  private _onSave = new vscode.EventEmitter<SavedJob>();
  readonly onSave = this._onSave.event;

  constructor(private initialStep: "jobId" | "jobConfigurations") {
    const context: StepContext = {
      acceptedSteps: [],
    };
    this.jobIdStep = new InputStep(context, "Job Id");
    this.timeoutStep = new InputStep(context, "Timeout");
    this.settingsStep = new QuickPickStep(context, "Job configurations");
    this.clearLogStep = new QuickPickStep(context, "Clear log");
    this.positionStep = new InputStep(context, "Position");

    this.clearLogStep.setItems([
      new Item("true", true, {
        hideDescription: true,
      }),
      new Item("false", false, {
        hideDescription: true,
      }),
    ]);

    this.settingsStep.setCalculateNextStep((context) => {
      if (this.settingsStep.getValue().id === "save") {
        const details: SavedJob = {
          id: this.jobIdStep.getValue(),
          timeout: this.timeoutStep.getValue(),
          clearLog: this.clearLogStep.getValue().value,
          position: this.positionStep.getValue(),
        };

        this._onSave.fire(details);
        return null;
      }

      if (this.settingsStep.getValue().id === "jobId") {
        return this.jobIdStep;
      }

      if (this.settingsStep.getValue().id === "timeout") {
        return this.timeoutStep;
      }

      if (this.settingsStep.getValue().id === "clearLog") {
        this.clearLogStep.setItems([
          new Item("true", true, {
            hideDescription: true,
          }),
          new Item("false", false, {
            hideDescription: true,
          }),
        ]);

        return this.clearLogStep;
      }

      if (this.settingsStep.getValue().id === "position") {
        return this.positionStep;
      }

      return null;
    });

    this.jobIdStep.setCalculateNextStep((context) => {
      this.updateSettingsItems();
      return this.settingsStep;
    });

    this.timeoutStep.setCalculateNextStep((context) => {
      this.updateSettingsItems();
      return this.settingsStep;
    });

    this.clearLogStep.setCalculateNextStep((context) => {
      this.updateSettingsItems();
      return this.settingsStep;
    });

    this.positionStep.setCalculateNextStep((context) => {
      this.updateSettingsItems();
      return this.settingsStep;
    });

    this.updateSettingsItems();

    this.menu = new MultistepMenu(
      initialStep === "jobId" ? this.jobIdStep : this.settingsStep
    );
  }

  updateSettingsItems() {
    this.settingsStep.setItems([
      new Item("save", "", { hideDescription: true }),
      new Item("jobId", this.jobIdStep.getValue()),
      new Item("timeout", this.timeoutStep.getValue()),
      new Item("clearLog", this.clearLogStep.getValue().value),
      new Item("position", this.positionStep.getValue()),
    ]);
  }

  show() {
    this.menu.show();
  }
}
