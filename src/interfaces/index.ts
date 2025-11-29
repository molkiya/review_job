export interface PurchaseResult {
  userId: string;
  productId: string;
  price: string;
  balance: string;
  status: string;
}

export interface UserRow {
  id: string;
  email: string;
  balance: string; // DECIMAL comes as string
}

export interface ProductRow {
  id: string;
  name: string;
  price: string; // DECIMAL comes as string
}