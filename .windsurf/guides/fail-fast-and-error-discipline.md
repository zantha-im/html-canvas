# Fail-Fast and Error Discipline

Authoritative rules to prevent error swallowing and enforce clear failure semantics.

## Principles
- Fail-fast for client/auth/business-logic errors. Do not retry unrecoverable failures.
- No fallback data: never mask failures with placeholder or stale data.
- Errors must be surfaced to the caller (UI/API) and recorded via structured logging.

## Handling Rules
- No empty catch blocks.
- Do not use console.error for application errors; use a logger and rethrow.
- Wrap-and-rethrow (error enrichment): add context and preserve the original cause/stack.
- Classify for retry separately (see API retry guidance); do not retry 4xx/auth failures.

## Pattern: Wrap and Rethrow
```ts
// Example using Node/TS with a logger and error cause
import { logger } from "src/lib/logger" // adjust path as needed

class AppError extends Error {
  code?: string
  constructor(message: string, code?: string, options?: { cause?: unknown; meta?: Record<string, unknown> }) {
    super(message, { cause: options?.cause as any })
    this.name = "AppError"
    this.code = code
    // Optionally attach meta for structured logs while keeping the thrown value simple
    if (options?.meta) (this as any).meta = options.meta
  }
}

async function loadOrder(id: string) {
  try {
    return await repo.getOrder(id)
  } catch (err) {
    const meta = { op: "load_order", id }
    logger.error({ err, ...meta }, "failed to load order")
    throw new AppError("Failed to load order", "ORDER_LOAD_FAILED", { cause: err, meta })
  }
}
```

## Surfacing Errors
- UI: show actionable messages; avoid "pretend success" states.
- API: return canonical error/validation shapes with appropriate status codes.
- Logging: include operation, resource identifiers, correlation/request IDs when available.

## Anti-Patterns (Do Not Do)
- Fallback data in place of real results.
- Empty catch blocks or catching-and-ignoring errors.
- console.error as the primary error handling mechanism.
- Log-and-continue without user/system feedback when an operation actually failed.
