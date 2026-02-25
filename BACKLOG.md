# Upgrade Backlog

Use this file as the source of truth for AI upgrade tasks.

## Priority Legend
- P0: Critical
- P1: Important
- P2: Nice to have

## Task Template
- ID:
- Priority:
- Area:
- Objective:
- Acceptance Criteria:
- Risk Notes:

## Active Tasks
- ID: P1-FE-001
- Priority: P1
- Area: Frontend Chat
- Objective: Improve code splitting for large chat bundle.
- Acceptance Criteria: Main bundle size reduced and app behavior unchanged.
- Risk Notes: Ensure markdown rendering and chat streaming still work.

- ID: P1-BE-001
- Priority: P1
- Area: Backend Chat Service
- Objective: Add lightweight integration tests for chat route error paths.
- Acceptance Criteria: Tests run in CI with `npm run test -- --passWithNoTests`.
- Risk Notes: Avoid coupling tests to external APIs.

- ID: P2-DX-001
- Priority: P2
- Area: Dev Experience
- Objective: Standardize logging format in backend services.
- Acceptance Criteria: Logs have consistent prefix and context fields.
- Risk Notes: Do not leak sensitive data to logs.

## Done Tasks
- Move completed tasks here with PR link.
