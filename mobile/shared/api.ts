import type { Order } from "./types";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://gigs.lv/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export const clientApi = {
  createOrder: (order: Omit<Order, "id" | "status">) =>
    request<Order>("/mobile/client/orders", {
      method: "POST",
      body: JSON.stringify(order),
    }),
  listOrders: () => request<Order[]>("/mobile/client/orders"),
};

export const workerApi = {
  listAvailableOrders: () => request<Order[]>("/mobile/worker/orders/available"),
  acceptOrder: (id: string) =>
    request<Order>(`/mobile/worker/orders/${id}/accept`, { method: "POST" }),
  updateStatus: (id: string, status: Order["status"]) =>
    request<Order>(`/mobile/worker/orders/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),
};
