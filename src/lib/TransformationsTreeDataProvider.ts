import * as vscode from "vscode";
import { Store } from "../stores/Store";
import {
  SavedTransformation,
  TransformationStore,
} from "../stores/TransformationStore";

type EventData = TransformationItem | undefined | void;

export class TransformationsTreeDataProvider
  implements vscode.TreeDataProvider<TransformationItem>
{
  public static readonly viewId = "sfcc-jobs-executor.transformationsView";

  private _onDidChangeTreeData: vscode.EventEmitter<EventData> =
    new vscode.EventEmitter<EventData>();
  readonly onDidChangeTreeData: vscode.Event<EventData> =
    this._onDidChangeTreeData.event;

  constructor(private store: TransformationStore) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TransformationItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TransformationItem) {
    const savedItems = await this.store.getAllItems();

    if (!savedItems) {
      return [];
    }

    let result: TransformationItem[] = [];

    result = savedItems
      .sort((a, b) => a.position - b.position)
      .map(
        (transformation) =>
          new TransformationItem(
            transformation,
            vscode.TreeItemCollapsibleState.None
          )
      );

    return result;
  }
}

export class TransformationItem extends vscode.TreeItem {
  constructor(
    public transformation: SavedTransformation,
    public collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(
      `${transformation.enabled ? "🗸" : ""} ${transformation.id}`,
      collapsibleState
    );

    this.tooltip = `id: ${transformation.id}
pattern: ${transformation.pattern}
replacement:${transformation.replacement}
position: ${transformation.position}
enabled: ${transformation.enabled}`;
    this.description =
      transformation.pattern + " -> " + transformation.replacement;
  }
}
