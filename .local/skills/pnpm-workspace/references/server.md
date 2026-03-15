# API Server

We maintain a single API server in this monorepo built with Express 5 and Node. It implements the OpenAPI contract.

## Express 5

Express 5 is a relatively new version and you might forget some things such as:

- Wildcard routes need names
  - Express 4 used`app.get("*", ...)`
  - In Express 5 you must do `app.get("/*splat", ...)`
- Optional params changed
  - Express 4 used `/todos/:id?`
  - Express 5 uses `/todos{/:id}`
- `res.redirect('back')` is removed, use `res.redirect(req.get('Referrer') || '/')`
- Async errors auto-forward — no need to `try/catch` + `next(err)` for 500s
- `req.params.id` is `string | string[]`, not just `string`. Always parse params:

  ```typescript
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  ```

- Every async handler should be annotated `Promise<void>`:

  ```typescript
  router.get("/things", async (req, res): Promise<void> => { ... });
  ```

  Without this, TypeScript errors on early-return responses.
- For early returns, use `res.status(...).json(...); return;` — never `return res.status(...).json(...)`.

## Implementing a route

Add new routers under `artifacts/api-server/src/routes` and re-export them in `artifacts/api-server/src/routes/index.ts`.

```typescript
import todosRouter from "./todos";
router.use(todosRouter);
```

The root router already handles `/api` — your routes do not need to add it.

Split routes by domain. A domain may span multiple files exported from a single barrel, e.g. `artifacts/api-server/src/routes/todos/index.ts`.

Keep route handlers thin — they should validate, call the DB, and respond. Push complex logic into separate modules (e.g. `artifacts/api-server/src/lib/mylib.ts`).

Always validate inputs (params, query, body) and outputs (responses) with `@workspace/api-zod` schemas generated from the OpenAPI spec. Status codes must match the contract.

```typescript
import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, todosTable } from "@workspace/db";
import {
  CreateTodoBody,
  UpdateTodoBody,
  GetTodoParams,
  GetTodoResponse,
  UpdateTodoParams,
  UpdateTodoResponse,
  DeleteTodoParams,
  ListTodosResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/todos", async (_req, res): Promise<void> => {
  const todos = await db
    .select()
    .from(todosTable)
    .orderBy(todosTable.createdAt);
  res.json(ListTodosResponse.parse(todos));
});

router.post("/todos", async (req, res): Promise<void> => {
  const parsed = CreateTodoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [todo] = await db.insert(todosTable).values(parsed.data).returning();

  res.status(201).json(GetTodoResponse.parse(todo));
});

router.get("/todos/:id", async (req, res): Promise<void> => {
  const params = GetTodoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [todo] = await db
    .select()
    .from(todosTable)
    .where(eq(todosTable.id, params.data.id));

  if (!todo) {
    res.status(404).json({ error: "Todo not found" });
    return;
  }

  res.json(GetTodoResponse.parse(todo));
});

router.patch("/todos/:id", async (req, res): Promise<void> => {
  const params = UpdateTodoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTodoBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [todo] = await db
    .update(todosTable)
    .set(parsed.data)
    .where(eq(todosTable.id, params.data.id))
    .returning();

  if (!todo) {
    res.status(404).json({ error: "Todo not found" });
    return;
  }

  res.json(UpdateTodoResponse.parse(todo));
});

router.delete("/todos/:id", async (req, res): Promise<void> => {
  const params = DeleteTodoParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [todo] = await db
    .delete(todosTable)
    .where(eq(todosTable.id, params.data.id))
    .returning();

  if (!todo) {
    res.status(404).json({ error: "Todo not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
```

Dates work out of the box when casting from DB results to Zod (OpenAPI) schema.

For numeric fields coming from inputs such as query params and path params, the Zod types are already configured to coerce correctly from string to the target type.

When sending a response early (404, 400, etc.), use `res.status().json(); return;` — never `return res.status().json()`:

```typescript
if (!note) {
  res.status(404).json({ error: "Note not found" });
  return;
}
```
