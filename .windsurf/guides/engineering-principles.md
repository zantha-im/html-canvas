# Engineering Principles

Purpose: reusable, cross-project constraints that improve reliability, readability, and change velocity.

## Fail-fast and No-Fallback Data Rule
- Fail-fast on unrecoverable errors; never use fallback or placeholder data.
- Surface errors to callers and log with structure; avoid any swallowing.

## Thin Controller Pattern
- Routes/controllers: HTTP only (parse, validate, status codes, map responses).
- Services: business logic and orchestration.
- Repositories/gateways: data access and external API calls.
- Benefits: testability, clear ownership, easier refactoring.

## File Size Limits (keep code composable)
- Components: ~150 lines
- Hooks/Services/Repositories: ~100 lines
- Utils/Helpers: ~50 lines
When exceeded, extract to smaller units. Prefer composition over large abstractions.

## Composition Over Inheritance
- Build larger behavior by combining small, focused units.
- Isolate side effects at the edges; keep pure logic pure and testable.

## Comments and Documentation
- Prefer self-explanatory naming and small functions over comments.
- Add comments only when intent cannot be made clear in code (e.g., non-obvious domain rules).
- Keep docs in this folder concise; link to source or specs for details.
