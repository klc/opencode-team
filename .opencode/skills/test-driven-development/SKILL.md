---
name: test-driven-development
description: Load when implementing any feature or fixing any bug. Enforces RED-GREEN-REFACTOR: write failing test first, watch it fail, write minimal code to pass, refactor. Writing code before tests is a violation — delete and restart.
---

# Test-Driven Development

## The Iron Law

```
WRITE THE TEST FIRST. WATCH IT FAIL. THEN WRITE CODE.
```

**Violating the letter of these rules is violating the spirit of TDD.**

If you wrote code before the test: **Delete it. Start over.**

No exceptions for "simple" tasks. No exceptions for "I already know what to write." No exceptions for "it's just a quick fix."

---

## The RED-GREEN-REFACTOR Cycle

### 🔴 RED — Write a Failing Test

1. Write the simplest possible test that describes the desired behavior
2. **Run it. Watch it fail.**
3. Confirm it fails for the RIGHT reason (not because of a syntax error or wrong import)
4. If the test passes immediately → **your test is wrong. Fix the test.**

A test that passes before you write the implementation proves nothing.

### 🟢 GREEN — Write Minimal Code to Pass

1. Write the **simplest code** that makes the test pass
2. Do NOT add features the test doesn't require
3. Do NOT refactor yet
4. Do NOT "improve" beyond what the test demands
5. Run the test. It must now pass.
6. Run the full suite. No other tests should break.

### 🔵 REFACTOR — Clean Up While Staying Green

1. Improve code structure, naming, duplication
2. Do NOT add new behavior during refactor
3. Tests must stay green throughout
4. After refactoring, run full suite again

---

## Common Rationalizations — All Rejected

| Rationalization | Reality |
|---|---|
| "I'll write tests after, it's faster" | Tests written after code pass immediately and prove nothing |
| "This is too simple to need a test" | Simple code has bugs too. Test it. |
| "I already know it works, I tested manually" | Manual testing is ad-hoc. Automated tests are systematic. |
| "I've already written the code, waste to delete it" | Sunk cost fallacy. The time is gone. Delete it and TDD properly. |
| "It's just a quick fix" | Quick fixes without tests become the bugs you chase for hours next week. |
| "The test framework setup is complex" | Set it up once. Then it's free every time. |

**Write code before the test? Delete it. Start over.**

---

## TDD in the Context of This Project

### When using the project-stack skill:
- Use the test commands defined there (`php artisan test`, `npm run test`, `npx playwright test`)
- Follow the test file naming conventions in use
- Write tests in the same framework already used (Pest PHP, Vitest, etc.)

### Backend tests (senior-backend, junior-backend):
- Unit test: one function, no real DB calls
- Feature/integration test: tests the full request cycle
- Write the test first, even for migrations (write the migration after the test that verifies the schema)

### Frontend tests (senior-frontend, junior-frontend):
- Component test: write test that renders and interacts with the component
- Write the component only after the test describes its behavior
- SSR constraints still apply — test in SSR mode if applicable

---

## Verification Checklist

Before reporting a task complete, verify:

- [ ] Test was written BEFORE implementation
- [ ] Test was run and FAILED before implementation (RED)
- [ ] Test now PASSES after implementation (GREEN)
- [ ] Full test suite still passes (no regressions)
- [ ] Refactoring (if any) did not break tests

If you cannot check all of these: **you did not follow TDD. Do not claim you did.**
