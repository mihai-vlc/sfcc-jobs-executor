import * as vscode from "vscode";

export default class JobDetails {
  public jobId: string = "";
  public timeout: number = 60000;
  public shouldClearLog: boolean = false;

  async readFromInput(lastJobId: string) {
    let inputJobId = await vscode.window.showInputBox({
      value: lastJobId,
      title: "Insert the SFCC job id that will be executed",
      placeHolder: "job-id",
    });

    if (inputJobId) {
      this.jobId = inputJobId;
    }
  }

  parseDocument(document: vscode.TextDocument) {
    for (let i = 0; i < document.lineCount; i++) {
      let currentLine = document.lineAt(i);

      let matchJobTailLogTimeout = [
        ...currentLine.text.matchAll(/\s*@sfccJobTailLogTimeout\s([^\s]+)/g),
      ];

      if (matchJobTailLogTimeout.length > 0) {
        this.timeout = parseInt(matchJobTailLogTimeout[0][1], 10);
      }

      let matchJobClearLog = [
        ...currentLine.text.matchAll(/\s*@sfccJobClearLog/g),
      ];

      if (matchJobClearLog.length > 0) {
        this.shouldClearLog = true;
      }

      let matchJobId = [
        ...currentLine.text.matchAll(/\s*@sfccJobId\s([^\s]+)/g),
      ];

      if (matchJobId.length > 0) {
        this.jobId = matchJobId[0][1];
        break;
      }
    }
  }
}
