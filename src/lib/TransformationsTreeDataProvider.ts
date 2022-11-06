import * as vscode from "vscode";

export interface SavedTransformation {
  id: string;
  pattern: string;
  replacement: string;
  position: number;
  enabled: boolean;
}

export class TransformationsTreeDataProvider
  implements vscode.TreeDataProvider<TransformationItem>
{
  public static readonly viewId = "sfcc-jobs-executor.transformationsView";

  private _onDidChangeTreeData: vscode.EventEmitter<
    TransformationItem | undefined | void
  > = new vscode.EventEmitter<TransformationItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<
    TransformationItem | undefined | void
  > = this._onDidChangeTreeData.event;

  constructor(private store: vscode.Memento) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TransformationItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TransformationItem): Thenable<TransformationItem[]> {
    const savedItems = this.store.get<SavedTransformation[]>(
      "savedTransformations"
    );

    if (!savedItems) {
      return Promise.resolve([]);
    }

    let result: TransformationItem[] = [];

    result = savedItems.map(
      (transformation) =>
        new TransformationItem(
          transformation,
          vscode.TreeItemCollapsibleState.None
        )
    );

    return Promise.resolve(result);
  }

  async addNewItem(newTransformation: SavedTransformation) {
    let savedItems = this.store.get<SavedTransformation[]>(
      "savedTransformations"
    );
    if (!savedItems) {
      savedItems = [];
    }

    const existingIndex = savedItems.findIndex(function (
      currentTransformation
    ) {
      return currentTransformation.id === newTransformation.id;
    });

    if (existingIndex === -1) {
      savedItems.push({
        id: newTransformation.id,
        pattern: newTransformation.pattern,
        replacement: newTransformation.replacement,
        position: newTransformation.position,
        enabled: newTransformation.enabled,
      });
    } else {
      savedItems.splice(existingIndex, 1, {
        id: newTransformation.id,
        pattern: newTransformation.pattern,
        replacement: newTransformation.replacement,
        position: newTransformation.position,
        enabled: newTransformation.enabled,
      });
    }

    await this.store.update("savedTransformations", savedItems);
    return true;
  }

  async removeItem(transformationId: string) {
    let savedItems = this.store.get<SavedTransformation[]>(
      "savedTransformations"
    );
    if (!savedItems) {
      return false;
    }

    savedItems = savedItems.filter(
      (transformation) => transformation.id !== transformationId
    );
    await this.store.update("savedTransformations", savedItems);
    return true;
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
