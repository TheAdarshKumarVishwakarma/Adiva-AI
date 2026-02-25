# AI Upgrade Rules

This repository uses an AI-assisted upgrade workflow with mandatory human approval.

## Goal
- Let AI propose and implement improvements quickly.
- Keep production safe with strict quality gates and manual merge approval.

## Hard Rules
- AI must never merge directly to `main`.
- Every change must go through PR + CI + human approval.
- AI must keep PRs small and focused.
- AI must not edit secrets, credentials, or deployment keys.
- AI must not modify branch protections or workflow permissions.

## Allowed Changes
- Refactors that preserve behavior.
- Bug fixes with clear root cause.
- Feature additions from `BACKLOG.md`.
- Test and docs improvements.
- Performance and reliability improvements.

## Restricted Areas
- `backend/.env` and any secret material.
- Auth/session logic, unless backlog explicitly requests it.
- Payment/billing/business-critical logic without explicit approval.

## PR Size Policy
- Prefer <= 400 changed lines per PR.
- One objective per PR (single feature/fix).
- Include rollback notes for risky changes.

## Required Checks Before Review
- Frontend: `npm run lint`, `npm run build`.
- Backend: `npm run test -- --passWithNoTests`.
- If checks fail, PR must be marked `do-not-merge`.

## Required PR Content
- Problem statement.
- What changed.
- Risk and impact.
- Test evidence.
- Rollback plan.

## Approval Policy
- Minimum 1 human reviewer approval.
- CI checks must be green.
- No self-approval by automation bot.

## Promotion and Rollback
- Merge only after approval and checks pass.
- Revert PR immediately if regression appears.
- Record incident and add prevention test in next PR.
