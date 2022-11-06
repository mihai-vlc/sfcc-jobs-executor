import * as vscode from "vscode";
import {
  SavedTransformation,
  TransformationStore,
} from "../stores/TransformationStore";

export default class FilteredLogger {
  private rules: SavedTransformation[] = [];

  constructor(
    private outputChannel: vscode.OutputChannel,
    private transformationStore: TransformationStore
  ) {
    this.readAllRules();
    this.transformationStore.onChange(() => this.readAllRules());
  }

  readAllRules() {
    this.transformationStore.getAllItems().then((savedItems) => {
      this.rules = savedItems.filter((item) => item.enabled);
    });
  }

  log(msg: string) {
    this.rules.forEach((rule) => {
      const regex = new RegExp(rule.pattern, "g");
      msg = msg.replace(regex, rule.replacement);
    });

    this.outputChannel.appendLine(msg);
  }
}
