import * as vscode from "vscode";

export interface SavedJob {
  id: string;
  timeout: number;
  clearLog: boolean;
  position: number;
}

export class JobsTreeViewProvider implements vscode.TreeDataProvider<JobItem> {
  public static readonly viewId = "sfcc-jobs-executor.jobsView";

  private _onDidChangeTreeData: vscode.EventEmitter<
    JobItem | undefined | void
  > = new vscode.EventEmitter<JobItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<JobItem | undefined | void> =
    this._onDidChangeTreeData.event;

  constructor(private store: vscode.Memento) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: JobItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: JobItem): Thenable<JobItem[]> {
    const savedItems = this.store.get<SavedJob[]>("savedJobs");

    if (!savedItems) {
      return Promise.resolve([]);
    }

    let result: JobItem[] = [];

    result = savedItems
      .sort((a, b) => a.position - b.position)
      .map(
        (job) => new JobItem(job.id, job, vscode.TreeItemCollapsibleState.None)
      );

    return Promise.resolve(result);
  }

  async addNewJob(job: SavedJob) {
    let savedItems = this.store.get<SavedJob[]>("savedJobs");
    if (!savedItems) {
      savedItems = [];
    }

    savedItems.push({
      id: job.id,
      timeout: job.timeout,
      clearLog: job.clearLog,
      position: job.position,
    });

    await this.store.update("savedJobs", savedItems);
    return true;
  }

  async removeJob(jobId: string) {
    let savedItems = this.store.get<SavedJob[]>("savedJobs");
    if (!savedItems) {
      return false;
    }

    savedItems = savedItems.filter((job) => job.id !== jobId);
    await this.store.update("savedJobs", savedItems);
    return true;
  }
}

export class JobItem extends vscode.TreeItem {
  constructor(
    public label: string,
    public job: SavedJob,
    public collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);

    this.tooltip = `${this.label}`;
    this.description = "";
  }
}
