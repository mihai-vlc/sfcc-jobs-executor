import * as vscode from "vscode";
import FilteredLogger from "./lib/FilteredLogger";
import JobDetails from "./lib/JobDetails";
import JobRunner from "./lib/JobRunner";
import {
  JobItem,
  JobsTreeViewProvider as JobsTreeDataProvider,
} from "./lib/JobsTreeDataProvider";
import OCAPIClient from "./lib/OCAPIClient";
import OCAPIConfiguration from "./lib/OCAPIConfiguration";
import {
  SavedTransformation,
  TransformationItem,
  TransformationsTreeDataProvider,
} from "./lib/TransformationsTreeDataProvider";
import JobMenu from "./ui/JobMenu";
import TransformationMenu from "./ui/TransformationMenu";

export function activate(context: vscode.ExtensionContext) {
  registerStatusBar(context);

  const ocapiConfiguration = new OCAPIConfiguration();
  startConfigurationMonitor(context, ocapiConfiguration);

  const outputChannel = vscode.window.createOutputChannel("SFCC_JOBS");
  context.subscriptions.push(outputChannel);

  const logger = new FilteredLogger(outputChannel);
  const ocapi = new OCAPIClient(ocapiConfiguration, logger);

  const jobRunner = new JobRunner(ocapi, outputChannel);
  registerRunJobCommand(context, jobRunner);

  const jobsProvider = new JobsTreeDataProvider(context.globalState);
  const jobsTreeView = vscode.window.createTreeView(
    JobsTreeDataProvider.viewId,
    {
      treeDataProvider: jobsProvider,
    }
  );

  registerAddJobCommand(context, jobsProvider);
  registerEditJobCommand(context, jobsProvider);
  registerRemoveJobCommand(context, jobsProvider);

  const transformationsProvider = new TransformationsTreeDataProvider(
    context.globalState
  );
  const transformationsTreeView = vscode.window.createTreeView(
    TransformationsTreeDataProvider.viewId,
    {
      treeDataProvider: transformationsProvider,
    }
  );

  registerAddTransformationCommand(context, transformationsProvider);
  registerEditTransformationCommand(context, transformationsProvider);
  registerRemoveTransformationCommand(context, transformationsProvider);
}

async function registerRunJobCommand(
  context: vscode.ExtensionContext,
  jobRunner: JobRunner
) {
  const commandDisposable = vscode.commands.registerCommand(
    "sfcc-jobs-executor.runJob",
    async (item?: JobItem) => {
      if (!jobRunner.isConfigured()) {
        vscode.window.showErrorMessage("[SFCC_JOBS] Missing configuration");
        return;
      }

      let jobDetails: JobDetails;
      if (item && item.job) {
        jobDetails = new JobDetails();
        jobDetails.jobId = item.job.id;
        jobDetails.timeout = item.job.timeout || jobDetails.timeout;
        jobDetails.shouldClearLog =
          item.job.clearLog || jobDetails.shouldClearLog;
      } else {
        jobDetails = await getJobDetailsFromActiveFile();
      }

      if (!jobDetails.jobId) {
        await jobDetails.readFromInput(jobRunner.lastJobId);
      }

      if (jobDetails.jobId) {
        jobRunner.run(jobDetails);
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

async function registerAddJobCommand(
  context: vscode.ExtensionContext,
  jobsProvider: JobsTreeDataProvider
) {
  const commandDisposable = vscode.commands.registerCommand(
    "sfcc-jobs-executor.addJob",
    () => {
      const menu = new JobMenu();

      menu.onSave(async (details) => {
        await jobsProvider.addNewJob(details);
        jobsProvider.refresh();
      });

      menu.show();
    }
  );
  context.subscriptions.push(commandDisposable);
}

async function registerEditJobCommand(
  context: vscode.ExtensionContext,
  jobsProvider: JobsTreeDataProvider
) {
  const commandDisposable = vscode.commands.registerCommand(
    "sfcc-jobs-executor.editJob",
    (item: JobItem) => {
      const menu = new JobMenu(item.job);

      menu.onSave(async (details) => {
        await jobsProvider.removeJob(item.job.id);
        await jobsProvider.addNewJob(details);
        jobsProvider.refresh();
      });

      menu.show();
    }
  );
  context.subscriptions.push(commandDisposable);
}

async function registerRemoveJobCommand(
  context: vscode.ExtensionContext,
  jobsProvider: JobsTreeDataProvider
) {
  const commandDisposable = vscode.commands.registerCommand(
    "sfcc-jobs-executor.removeJob",
    async (item: JobItem) => {
      await jobsProvider.removeJob(item.job.id);
      jobsProvider.refresh();
    }
  );
  context.subscriptions.push(commandDisposable);
}

async function registerAddTransformationCommand(
  context: vscode.ExtensionContext,
  transformationsProvider: TransformationsTreeDataProvider
) {
  const commandDisposable = vscode.commands.registerCommand(
    "sfcc-jobs-executor.addTransformation",
    () => {
      const menu = new TransformationMenu();

      menu.onSave(async (details) => {
        await transformationsProvider.addNewItem(details);
        transformationsProvider.refresh();
      });

      menu.show();
    }
  );
  context.subscriptions.push(commandDisposable);
}

async function registerEditTransformationCommand(
  context: vscode.ExtensionContext,
  transformationsProvider: TransformationsTreeDataProvider
) {
  const commandDisposable = vscode.commands.registerCommand(
    "sfcc-jobs-executor.editTransformation",
    (item: TransformationItem) => {
      const menu = new TransformationMenu(item.transformation);

      menu.onSave(async (details) => {
        await transformationsProvider.removeItem(item.transformation.id);
        await transformationsProvider.addNewItem(details);
        transformationsProvider.refresh();
      });

      menu.show();
    }
  );
  context.subscriptions.push(commandDisposable);
}

async function registerRemoveTransformationCommand(
  context: vscode.ExtensionContext,
  transformationsProvider: TransformationsTreeDataProvider
) {
  const commandDisposable = vscode.commands.registerCommand(
    "sfcc-jobs-executor.removeTransformation",
    async (item: TransformationItem) => {
      await transformationsProvider.removeItem(item.transformation.id);
      transformationsProvider.refresh();
    }
  );
  context.subscriptions.push(commandDisposable);
}

async function startConfigurationMonitor(
  context: vscode.ExtensionContext,
  ocapiConfiguration: OCAPIConfiguration
) {
  // read the inital configuration
  vscode.workspace.findFiles("**/dw.json").then(async (filesUri) => {
    if (filesUri.length === 0) {
      return;
    }

    await onConfigurationChange(filesUri[0], ocapiConfiguration);
  });

  // monitor for future changes on the configuration
  var configWatcher = vscode.workspace.createFileSystemWatcher("**/dw.json");
  context.subscriptions.push(configWatcher);

  configWatcher.onDidChange(async (fileUri) => {
    await onConfigurationChange(fileUri, ocapiConfiguration);
  });
}

async function onConfigurationChange(
  fileUri: vscode.Uri,
  ocapiConfiguration: OCAPIConfiguration
) {
  const isFirstUpdate = !ocapiConfiguration.isDefined();
  const content = await vscode.workspace.fs.readFile(fileUri);
  const updateResult = ocapiConfiguration.update(content.toString());

  if (updateResult) {
    if (!isFirstUpdate) {
      vscode.window.showInformationMessage(
        "[SFCC_JOBS]: configuration updated successfully !"
      );
    }
  } else {
    vscode.window.showErrorMessage(
      "[SFCC_JOBS]: Error parsing the dw.json file"
    );
  }
}

async function getJobDetailsFromActiveFile(): Promise<JobDetails> {
  const jobDetails = new JobDetails();

  var activeTextEditor = vscode.window.activeTextEditor;

  if (!activeTextEditor) {
    return jobDetails;
  }

  var activeDocument = activeTextEditor.document;

  if (!activeDocument) {
    return jobDetails;
  }

  jobDetails.parseDocument(activeDocument);

  return jobDetails;
}

function registerStatusBar(context: vscode.ExtensionContext) {
  var statusBar = vscode.window.createStatusBarItem(
    "overload_status",
    vscode.StatusBarAlignment.Left,
    1
  );
  statusBar.text = "SFCC - Run job";
  statusBar.command = "sfcc-jobs-executor.runJob";
  statusBar.show();

  context.subscriptions.push(statusBar);
}

export function deactivate() {}
