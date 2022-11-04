import * as vscode from "vscode";

export default class FilteredLogger {
  constructor(private outputChannel: vscode.OutputChannel) {}

  log(msg: string) {
    msg = msg.replace(/\[.+?\] \w+ \w+\|\d+\|([\w-]+)/g, "[$1] - ");

    this.outputChannel.appendLine(msg);
  }
}
