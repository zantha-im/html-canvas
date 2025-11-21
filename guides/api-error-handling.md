# API Error Handling

A provider-agnostic strategy combining fail-fast principles with thoughtful retry mechanisms.

## Decision Principles
- Fail-fast for client/auth/business logic errors (4xx).
- Retry transient failures only (5xx/429/timeouts/network) with backoff and jitter.
- Cap attempts (3–5), require idempotency, and use a circuit breaker.

## Retry Implementation
- Exponential backoff with jitter (e.g., 1s, 2s, 4s; +/- random 10–30%).
- Max attempts: 3–5, then escalate to error UX and logging.
- Idempotency required for mutating operations before retrying.
- Circuit breaker to stop hammering unhealthy dependencies.

## Fail-Fast Classification (examples)
- 400/422 Validation or bad request → fail-fast
- 401/403 Auth/permission → fail-fast
- 404 Not found → fail-fast (do not retry)
- 409 Conflict → fail-fast
- 429 Rate limit → retry with backoff
- 5xx Server errors → retry with backoff

## Canonical Response Shapes
- Success: data + success flag + timestamp; optional pagination.
- Error: error (user message) + code + timestamp + retryable + optional details.
- Validation errors: array of { field, message, code }.

Example (TypeScript types):
```ts
interface ApiResponse<T> {
  data: T
  success: true
  timestamp: string
  pagination?: { page: number; limit: number; total: number; hasNext: boolean }
}

interface ErrorResponse {
  error: string
  code: string
  timestamp: string
  retryable: boolean
  success: false
  details?: string
}

interface ValidationError { field: string; message: string; code: string }
interface ValidationResponse extends ErrorResponse {
  errors: ValidationError[]
}
```
