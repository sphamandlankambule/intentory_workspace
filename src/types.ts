export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
  createdAt: string;
}

export interface InventoryItem {
  id: number;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
  createdAt: string;
  updatedAt: string;
}

export interface MovementLog {
  id: number;
  itemId: number;
  itemName: string;
  itemSku: string;
  quantity: number;
  type: 'incoming' | 'outgoing';
  recipient: string | null;
  reason: string | null;
  carrier: string | null;
  createdAt: string;
  operatorEmail: string;
  operatorRole: string;
}

export interface TrendStat {
  date: string;
  incoming: number;
  outgoing: number;
}
