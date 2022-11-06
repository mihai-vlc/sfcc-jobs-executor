import { InputStep } from "./InputStep";
import MultistepMenu from "./MultistepMenu";
import QuickPickStep, { Item } from "./QuickPickStep";
import { Step, StepContext } from "./Step";
import * as vscode from "vscode";
import { SavedTransformation } from "../lib/TransformationsTreeDataProvider";

export default class TransformationMenu {
  private idStep: Step;
  private patternStep: Step;
  private replacementStep: Step;
  private positionStep: Step;
  private enabledStep: QuickPickStep;
  private settingsStep: QuickPickStep;
  private menu: MultistepMenu;
  private _onSave = new vscode.EventEmitter<SavedTransformation>();
  readonly onSave = this._onSave.event;

  constructor(private initialState?: SavedTransformation) {
    const context: StepContext = {
      acceptedSteps: [],
    };
    this.idStep = new InputStep(context, "Transformation Id");
    this.patternStep = new InputStep(context, "Pattern");
    this.replacementStep = new InputStep(context, "Replacement");
    this.positionStep = new InputStep(context, "Position");

    this.enabledStep = new QuickPickStep(context, "Enabled");
    this.settingsStep = new QuickPickStep(
      context,
      "Transformation configurations"
    );

    const itemTrue = new Item("true", true, {
      hideDescription: true,
    });
    const itemFalse = new Item("false", false, {
      hideDescription: true,
    });
    this.enabledStep.setItems([itemTrue, itemFalse]);

    if (initialState) {
      this.idStep.setValue(initialState.id);
      this.patternStep.setValue(initialState.pattern);
      this.replacementStep.setValue(initialState.replacement);
      this.positionStep.setValue(initialState.position);
      this.enabledStep.setValue(initialState.enabled ? itemTrue : itemFalse);
    } else {
      this.enabledStep.setValue(itemTrue);
      this.positionStep.setValue(0);
    }

    this.settingsStep.setCalculateNextStep((context) => {
      if (this.settingsStep.getValue().id === "save") {
        const details: SavedTransformation = {
          id: this.idStep.getValue(),
          pattern: this.patternStep.getValue(),
          replacement: this.replacementStep.getValue(),
          position: this.positionStep.getValue(),
          enabled: this.enabledStep.getValue().value,
        };

        this._onSave.fire(details);
        return null;
      }

      if (this.settingsStep.getValue().id === "id") {
        return this.idStep;
      }

      if (this.settingsStep.getValue().id === "pattern") {
        return this.patternStep;
      }

      if (this.settingsStep.getValue().id === "replacement") {
        return this.replacementStep;
      }

      if (this.settingsStep.getValue().id === "position") {
        return this.positionStep;
      }

      if (this.settingsStep.getValue().id === "enabled") {
        this.enabledStep.setItems([itemTrue, itemFalse]);

        return this.enabledStep;
      }

      return null;
    });

    this.idStep.setCalculateNextStep((context) => {
      this.updateSettingsItems();
      return this.settingsStep;
    });

    this.patternStep.setCalculateNextStep((context) => {
      this.updateSettingsItems();
      return this.settingsStep;
    });

    this.replacementStep.setCalculateNextStep((context) => {
      this.updateSettingsItems();
      return this.settingsStep;
    });

    this.positionStep.setCalculateNextStep((context) => {
      this.updateSettingsItems();
      return this.settingsStep;
    });

    this.enabledStep.setCalculateNextStep((context) => {
      this.updateSettingsItems();
      return this.settingsStep;
    });

    this.updateSettingsItems();

    this.menu = new MultistepMenu(
      initialState === undefined ? this.idStep : this.settingsStep
    );
  }

  updateSettingsItems() {
    this.settingsStep.setItems([
      new Item("save", "", { hideDescription: true }),
      new Item("id", this.idStep.getValue()),
      new Item("pattern", this.patternStep.getValue()),
      new Item("replacement", this.replacementStep.getValue()),
      new Item("position", this.positionStep.getValue()),
      new Item("enabled", this.enabledStep.getValue().value),
    ]);
  }

  show() {
    this.menu.show();
  }
}
