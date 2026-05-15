import Dexie, { Table } from 'dexie';

export interface QueuedOrder {
  id?: number;
  branchId: string;
  tableId: string;
  customerName: string;
  customerId: string;
  note: string;
  items: {
    productId: string;
    quantity: number;
    note: string;
    toppingIds: string[];
  }[];
  payment: {
    method: number;
    receivedAmount: number;
  };
  createdAt: number;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
}

export class OfflineDB extends Dexie {
  queuedOrders!: Table<QueuedOrder>;

  constructor() {
    super('KioskFlowOfflineDB');
    this.version(1).stores({
      queuedOrders: '++id, status, createdAt'
    });
  }
}

export const db = new OfflineDB();
