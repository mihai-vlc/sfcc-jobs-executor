import * as vscode from "vscode";
import OCAPIClient from "./lib/OCAPIClient";

interface Config {
  hostname: string;
  "client-id": string;
  "client-secret": string;
}

export function activate(context: vscode.ExtensionContext) {
  let config: Config;
  let ocapi: OCAPIClient;
  let lastJobId = "";

  const outputChannel = vscode.window.createOutputChannel("SFCC_JOBS");
  context.subscriptions.push(outputChannel);

  const statusBar = createStatusBar();
  context.subscriptions.push(statusBar);

  readConfiguration();
  activateConfigurationWatcher();
  registerRunJobCommand();

  async function readConfiguration() {
    vscode.workspace.findFiles("**/dw.json").then(async (filesUri) => {
      if (filesUri.length === 0) {
        vscode.window.showInformationMessage(
          "[SFCC_JOBS]: No dw.json was found in the workspace."
        );
        return;
      }

      const fileUri = filesUri[0];

      try {
        await onConfigurationChange(fileUri);
      } catch (e) {
        vscode.window.showErrorMessage(
          "[SFCC_JOBS]: Error parsing the dw.json file"
        );
      }
    });
  }

  async function activateConfigurationWatcher() {
    var configWatcher = vscode.workspace.createFileSystemWatcher("**/dw.json");
    context.subscriptions.push(configWatcher);

    configWatcher.onDidChange(async (fileUri) => {
      try {
        await onConfigurationChange(fileUri);

        vscode.window.showInformationMessage(
          "[SFCC_JOBS]: configuration updated successfully !"
        );
      } catch (e) {
        vscode.window.showErrorMessage(
          "[SFCC_JOBS]: Error parsing the dw.json file"
        );
      }
    });
  }

  async function registerRunJobCommand() {
    const commandDisposable = vscode.commands.registerCommand(
      "sfcc-jobs-executor.runJob",
      async () => {
        if (!config || !ocapi) {
          vscode.window.showErrorMessage("[SFCC_JOBS] Missing configuration");
          return;
        }

        let jobDetails = getJobDetailsFromActiveFile();
        let jobId = jobDetails.jobId;

        if (!jobId) {
          let inputJobId = await vscode.window.showInputBox({
            value: lastJobId,
            title: "Insert the SFCC job id that will be executed",
            placeHolder: "job-id",
          });

          if (inputJobId) {
            jobId = inputJobId;
          }
        }

        if (jobId) {
          lastJobId = jobId;

          if (jobDetails.shouldClear) {
            outputChannel.clear();
          }

          runJob(jobId, jobDetails.timeout);
        } else {
          vscode.window.showErrorMessage(
            `[SFCC_JOBS]: No job ids were found in the current file.` +
              `Please define one using "@sfccJobId <job id>"`
          );
        }
      }
    );
    context.subscriptions.push(commandDisposable);
  }

  async function onConfigurationChange(fileUri: vscode.Uri) {
    const content = await vscode.workspace.fs.readFile(fileUri);
    config = JSON.parse(content.toString());
    ocapi = new OCAPIClient(config, outputChannel);
  }

  async function runJob(jobId: string, timeout: number) {
    outputChannel.show(true);
    const status = await ocapi.executeJob(jobId);

    if (status === "running" || status === "pending") {
      await ocapi.tailJobLogs(jobId, timeout);
    }
  }
}

function getJobDetailsFromActiveFile() {
  let timeout = 60000;
  let shouldClear = false;
  let jobId = "";

  var activeTextEditor = vscode.window.activeTextEditor;

  if (!activeTextEditor) {
    return {
      shouldClear,
      jobId,
      timeout,
    };
  }

  var activeDocument = activeTextEditor.document;

  if (!activeDocument) {
    return {
      shouldClear,
      jobId,
      timeout,
    };
  }

  for (let i = 0; i < activeDocument.lineCount; i++) {
    let currentLine = activeDocument.lineAt(i);

    let matchJobTailLogTimeout = [
      ...currentLine.text.matchAll(/\s*@sfccJobTailLogTimeout\s([^\s]+)/g),
    ];

    if (matchJobTailLogTimeout.length > 0) {
      timeout = parseInt(matchJobTailLogTimeout[0][1], 10);
    }

    let matchJobClearLog = [
      ...currentLine.text.matchAll(/\s*@sfccJobClearLog/g),
    ];

    if (matchJobClearLog.length > 0) {
      shouldClear = true;
    }

    let matchJobId = [...currentLine.text.matchAll(/\s*@sfccJobId\s([^\s]+)/g)];

    if (matchJobId.length > 0) {
      jobId = matchJobId[0][1];
      break;
    }
  }

  return {
    jobId,
    shouldClear,
    timeout,
  };
}

function createStatusBar() {
  var statusBar = vscode.window.createStatusBarItem(
    "overload_status",
    vscode.StatusBarAlignment.Left,
    1
  );
  statusBar.text = "SFCC - Run job";
  statusBar.command = "sfcc-jobs-executor.runJob";
  statusBar.show();

  return statusBar;
}

export function deactivate() {}
