export interface Person {
  id: string;
  name: string;
}

export interface SubOrder {
  id: string;
  name: string;
  price: number;
  personIds: string[]; // IDs of people sharing this sub-order
}

export interface Order {
  id: string;
  name: string;
  type: 'multiple' | 'single';
  subOrders: SubOrder[]; // Used for 'multiple'
  price?: number; // Used for 'single'
  personIds?: string[]; // Used for 'single'
  tax?: number; // percentage
  serviceCharge?: number; // percentage
  exchangeRate?: number; // multiplier for price
}

export interface BillState {
  people: Person[];
  orders: Order[];
  password?: string; // Optional password for Edit Mode
  isEditMode?: boolean; // Save current mode to URL
  promptPayId?: string; // PromptPay ID (Phone or ID Card)
  promptPayName?: string; // Display name for PromptPay
}
