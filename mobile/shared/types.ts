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
  price?: number;
  status: OrderStatus;
  customerName?: string;
  workerName?: string;
};
