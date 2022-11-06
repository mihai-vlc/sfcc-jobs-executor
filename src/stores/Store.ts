export interface StoreItem {
  id: string;
}

export interface Store<T extends StoreItem> {
  getAllItems(): Promise<T[]>;
  addItem(item: T): Promise<boolean>;
  removeItem(itemId: string): Promise<boolean>;
}
