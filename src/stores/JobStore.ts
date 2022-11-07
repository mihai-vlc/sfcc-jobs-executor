import { Store, StoreItem } from "./Store";
import * as vscode from "vscode";

export interface SavedJob extends StoreItem {
  timeout: number;
  clearLog: boolean;
  position: number;
}

export class JobStore implements Store<SavedJob> {
  constructor(private storeKey: string, private store: vscode.Memento) {}

  private _onChange = new vscode.EventEmitter<void>();
  readonly onChange: vscode.Event<void> = this._onChange.event;

  async getAllItems() {
    let savedItems = this.store.get<SavedJob[]>(this.storeKey);
    if (!savedItems) {
      savedItems = [];
    }
    return Promise.resolve(savedItems);
  }

  async addItem(newJob: SavedJob) {
    let savedItems = this.store.get<SavedJob[]>(this.storeKey);
    if (!savedItems) {
      savedItems = [];
    }

    const existingJobIndex = savedItems.findIndex(function (currentJob) {
      return currentJob.id === newJob.id;
    });

    if (existingJobIndex === -1) {
      savedItems.push({
        id: newJob.id,
        timeout: newJob.timeout,
        clearLog: newJob.clearLog,
        position: newJob.position,
      });
    } else {
      savedItems.splice(existingJobIndex, 1, {
        id: newJob.id,
        timeout: newJob.timeout,
        clearLog: newJob.clearLog,
        position: newJob.position,
      });
    }

    await this.store.update(this.storeKey, savedItems);
    this._onChange.fire();
    return true;
  }

  async removeItem(jobId: string) {
    let savedItems = this.store.get<SavedJob[]>(this.storeKey);
    if (!savedItems) {
      return false;
    }

    savedItems = savedItems.filter((job) => job.id !== jobId);
    await this.store.update(this.storeKey, savedItems);
    this._onChange.fire();
    return true;
  }
}
