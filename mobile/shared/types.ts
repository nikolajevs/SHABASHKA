export type OrderStatus =
  | "new"
  | "accepted"
  | "on_the_way"
  | "in_progress"
  | "completed"
  | "cancelled";

export type Order = {
  id: string;
  title: string;
  description: string;
  address: string;
  scheduledAt: string;
  dateFrom?: string;
  dateTo?: string;
  photos?: string[];
  category?: string;
  city?: string;
  street?: string;
  location?: { latitude: number; longitude: number } | null;
  budgetCents?: number;
  currency?: 'EUR';
  price?: number;
  status: OrderStatus;
  customerName?: string;
  workerName?: string;
};
