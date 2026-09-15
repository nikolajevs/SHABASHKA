import assert from "node:assert/strict";
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:5174";
if (!["127.0.0.1", "localhost"].includes(new URL(origin).hostname))
  throw Error("Run only against the local built Worker.");
const prefix = "test-" + Date.now();
const customer = prefix + "-customer",
  provider = prefix + "-provider",
  stranger = prefix + "-stranger";
let checks = 0;
async function request(user, data, expected = 200) {
  if (data?.action === 'register') data.acceptTerms = true;
  const headers = user
    ? {
        "oai-authenticated-user-id": user,
        "oai-authenticated-user-email": user + "@example.test",
      }
    : {};
  headers.Connection = "close";
  if (data) {
    headers.Origin = origin;
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(origin + "/api/market", {
    headers,
    method: data ? "POST" : "GET",
    body: data ? JSON.stringify(data) : undefined,
  });
  const body = await response.json();
  assert.equal(response.status, expected, JSON.stringify(body));
  checks++;
  return body;
}
const common = {
  title: "Тест: сборка шкафа",
  description: "Тестовая задача",
  category: "Ремонт",
  city: "Рига",
  price: "50 €",
};
await request(null, { action: "task", ...common }, 401);
await request(customer, { action: "task", ...common }, 400);
await request(customer, {
  action: "register",
  name: "Тестовый заказчик",
  role: "customer",
});
await request(provider, {
  action: "register",
  name: "Тестовый исполнитель",
  role: "provider",
});
await request(stranger, {
  action: "register",
  name: "Посторонний участник",
  role: "customer",
});
await request(
  customer,
  { action: "profile", ...common, skills: "Сборка" },
  400,
);
await request(provider, { action: "task", ...common }, 400);
await request(customer, { action: "task", ...common, city: "Вильнюс" }, 400);
await request(
  provider,
  {
    action: "profile",
    ...common,
    skills: "Сборка мебели",
    portfolio: "javascript:alert(1)",
  },
  400,
);
await request(provider, {
  action: "profile",
  ...common,
  skills: "Сборка мебели",
  portfolio: "https://example.com/work",
});
const task = await request(customer, { action: "task", ...common });
await request(provider, {
  action: "bid",
  parent: task.id,
  price: "45 €",
  description: "Могу завтра",
});
const state = await request(customer);
const bid = state.records.find((r) => r.kind === "bid" && r.parent === task.id);
assert.ok(bid);
checks++;
await request(
  provider,
  { action: "bid", parent: task.id, price: "40 €", description: "Повтор" },
  400,
);
assert.ok(!(await request(stranger)).records.some((r) => r.id === bid.id));
checks++;
await request(customer, {
  action: "message",
  parent: bid.id,
  description: "Можно завтра в 10?",
});
await request(provider, {
  action: "message",
  parent: bid.id,
  description: "Да, договорились",
});
assert.equal(
  (await request(provider)).records.filter(
    (r) => r.kind === "message" && r.parent === bid.id,
  ).length,
  2,
);
checks++;
assert.ok(
  !(await request(stranger)).records.some(
    (r) => r.kind === "message" && r.parent === bid.id,
  ),
);
checks++;
await request(
  stranger,
  { action: "message", parent: bid.id, description: "Вторжение" },
  403,
);
await request(stranger, { action: "choose", id: bid.id }, 400);
await request(
  customer,
  { action: "review", parent: task.id, rating: 5, description: "Рано" },
  400,
);
await request(customer, { action: "choose", id: bid.id });
await request(customer, { action: "choose", id: bid.id }, 400);
await request(provider, { action: "complete", id: task.id }, 400);
await request(customer, { action: "complete", id: task.id });
await request(
  stranger,
  { action: "review", parent: task.id, rating: 5, description: "Чужой отзыв" },
  400,
);
await request(
  customer,
  {
    action: "review",
    parent: task.id,
    rating: 6,
    description: "Неверная оценка",
  },
  400,
);
await request(customer, {
  action: "review",
  parent: task.id,
  rating: 5,
  description: "Всё хорошо",
});
await request(
  customer,
  { action: "review", parent: task.id, rating: 4, description: "Повтор" },
  400,
);
const anon = await request(null);
assert.ok(
  anon.records.some(
    (r) => r.kind === "review" && r.parent === task.id && r.rating === 5,
  ),
);
assert.ok(
  !anon.records.some((r) => ["bid", "message", "account"].includes(r.kind)),
);
checks += 2;
const csrf = await fetch(origin + "/api/market", {
  method: "POST",
  headers: {
    Origin: "https://unrelated.example",
    "Content-Type": "application/json",
  },
  body: "{}",
});
assert.equal(csrf.status, 403);
checks++;
console.log(
  JSON.stringify({
    passed: checks,
    testOwnerPrefix: prefix,
    cleanup:
      "Delete only local records owned by this exact prefix after testing.",
  }),
);
