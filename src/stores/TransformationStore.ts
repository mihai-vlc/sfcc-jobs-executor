import { Store, StoreItem } from "./Store";
import * as vscode from "vscode";

export interface SavedTransformation extends StoreItem {
  pattern: string;
  replacement: string;
  position: number;
  enabled: boolean;
}

export class TransformationStore implements Store<SavedTransformation> {
  constructor(private storeKey: string, private store: vscode.Memento) {}

  getAllItems() {
    let savedItems = this.store.get<SavedTransformation[]>(this.storeKey);
    if (!savedItems) {
      savedItems = [];
    }
    return Promise.resolve(savedItems);
  }

  async addItem(newTransformation: SavedTransformation) {
    let savedItems = this.store.get<SavedTransformation[]>(this.storeKey);
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

    await this.store.update(this.storeKey, savedItems);
    return true;
  }

  async removeItem(transformationId: string) {
    let savedItems = this.store.get<SavedTransformation[]>(this.storeKey);
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
