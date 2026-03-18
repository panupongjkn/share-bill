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
  subOrders: SubOrder[];
  tax?: number; // percentage
  serviceCharge?: number; // percentage
}

export interface BillState {
  people: Person[];
  orders: Order[];
}
