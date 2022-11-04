import * as vscode from "vscode";

export class JobsTreeViewProvider implements vscode.TreeDataProvider<JobItem> {
  public static readonly viewId = "sfcc-jobs-executor.jobsView";

  private _onDidChangeTreeData: vscode.EventEmitter<
    JobItem | undefined | void
  > = new vscode.EventEmitter<JobItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<JobItem | undefined | void> =
    this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: JobItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: JobItem): Thenable<JobItem[]> {
    const docItem = new JobItem(
      "Tree item",
      "1",
      vscode.TreeItemCollapsibleState.None
    );

    return Promise.resolve([docItem, docItem, docItem, docItem]);
  }
}

export class JobItem extends vscode.TreeItem {
  public parent?: JobItem;
  public command?: vscode.Command;
  public contextValue = "sfccDocItem";
  public isExpaned = false;

  constructor(
    public label: string,
    public recordId: string,
    public collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);

    this.tooltip = `${this.label}`;
    this.description = "";
  }
}
