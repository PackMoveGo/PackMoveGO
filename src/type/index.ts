export interface Move {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  pickupAddress: Address;
  deliveryAddress: Address;
  moveDate: Date;
  status: MoveStatus;
  items: MoveItem[];
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface MoveItem {
  id: string;
  name: string;
  quantity: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  weight?: number;
  specialInstructions?: string;
}

export enum MoveStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: Address;
  createdAt: Date;
  updatedAt: Date;
}

export interface Quote {
  id: string;
  customerId: string;
  moveId: string;
  amount: number;
  validUntil: Date;
  status: QuoteStatus;
  createdAt: Date;
  updatedAt: Date;
}

export enum QuoteStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED'
} 