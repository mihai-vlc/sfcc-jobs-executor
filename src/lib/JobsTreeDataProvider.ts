import * as vscode from "vscode";
import { JobStore, SavedJob } from "../stores/JobStore";

type EventData = JobItem | undefined | void;

export class JobsTreeViewProvider implements vscode.TreeDataProvider<JobItem> {
  public static readonly viewId = "sfcc-jobs-executor.jobsView";

  private _onDidChangeTreeData: vscode.EventEmitter<EventData> =
    new vscode.EventEmitter<EventData>();
  readonly onDidChangeTreeData: vscode.Event<EventData> =
    this._onDidChangeTreeData.event;

  constructor(private store: JobStore) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: JobItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: JobItem) {
    const savedItems = await this.store.getAllItems();

    if (!savedItems) {
      return [];
    }

    let result: JobItem[] = [];

    result = savedItems
      .sort((a, b) => a.position - b.position)
      .map(
        (job) => new JobItem(job.id, job, vscode.TreeItemCollapsibleState.None)
      );

    return result;
  }
}

export class JobItem extends vscode.TreeItem {
  constructor(
    public label: string,
    public job: SavedJob,
    public collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);

    this.tooltip = `id: ${job.id}
timeout: ${job.timeout}ms
clearLog: ${job.clearLog}
position: ${job.position}
`;
    this.description = `t:${job.timeout / 1000}s, c:${job.clearLog}, p:${
      job.position
    }`;
  }
}
