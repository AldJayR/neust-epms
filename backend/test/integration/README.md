# Backend Integration Tests

`pnpm test:integration` runs against a dedicated local PostgreSQL database. Docker and the application's `.env` database are not required.

Create an empty local database once, then provide its connection string:

```text
INTEGRATION_DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/neust_epms_test
```

The runner:

1. Refuses to run without an explicit `INTEGRATION_DATABASE_URL`.
2. Applies the repository's Drizzle migrations.
3. Runs only `*.integration.spec.ts` files sequentially.
4. Truncates application tables between tests.

The integration URL must point to a dedicated test database and must not equal the application's `DATABASE_URL`. Never point it at production or a shared development database.
