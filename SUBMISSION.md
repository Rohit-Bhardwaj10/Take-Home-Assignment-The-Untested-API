# Submission Notes

## What was done

### Day 1 - Tests
Wrote a full test suite from scratch across two files:
![alt text](image-1.png)

- **`tests/taskService.test.js`** - unit tests calling service functions directly
- **`tests/tasks.routes.test.js`** - integration tests over HTTP using Supertest

Coverage achieved: **95.5% statements / 92% branches / 92.3% functions / 95.1% lines** - well above the 80% target.
![alt text](image.png)

The uncovered lines are intentional non-testable code:
- `app.listen` (gated by `require.main === module`, doesn't run in tests)
- The global error handler (requires deliberately crashing a route)

### Day 2 - Bugs, Fix, Feature

**Bugs found:** 3 - all in `src/services/taskService.js`. Full details in [`BUGS.md`](./BUGS.md).

**All 3 bugs were fixed:**
1. `getByStatus` - changed `.includes()` to `===` (line 9)
2. `getPaginated` - changed `page * limit` to `(page - 1) * limit` (line 12)
3. `completeTask` - removed the hard-coded `priority: 'medium'` line (line 69)

**New feature:** `PATCH /tasks/:id/assign` implemented with full validation and tests.

**Final test count: 97 tests, all passing.**

---

## Feature Design Decisions — `PATCH /tasks/:id/assign`

- **Separate `PATCH` endpoint over reusing `PUT /tasks/:id`**: A dedicated route makes the intent explicit and avoids the risk of accidentally overwriting other fields (title, priority, status) when all the caller wants to do is assign. It also mirrors the existing `PATCH /:id/complete` pattern already in the codebase.
- **`assignee` as a trimmed, non-empty string**: No user store exists to validate against, so a free-text string is the pragmatic choice. `.trim()` is applied before saving so `"alice"` and `" alice "` don't create duplicates — a small guard without over-engineering. The trade-off (case sensitivity, no canonical list) is noted as a production question.
- **`400` for missing or blank `assignee`**: Two separate validation checks — one for `undefined`/`null` (field absent entirely) and one for empty string after trimming — give callers a specific, actionable error rather than a silent no-op or a vague 500.
- **`404` for a non-existent task**: Returns 404 rather than silently ignoring the request, so clients can distinguish "task doesn't exist" from "assignment succeeded". Consistent with how `PUT`, `DELETE`, and `PATCH /complete` all handle missing tasks.

---

## What I'd test next if I had more time

- **Concurrent writes** - the in-memory store is a plain array with no locking. If two requests hit `create` or `remove` simultaneously in a real async environment, there's a race condition risk. Worth testing even now to document the limitation.
- **`validateUpdateTask` with invalid `priority` and `dueDate`** - the coverage report flagged lines 28 and 31 of `validators.js` as uncovered. These are the `PUT /tasks/:id` equivalents of the POST validation cases. Small gap, easy to close.
- **`GET /tasks/stats` with tasks in unknown statuses** - if a task somehow ends up with a status outside `todo/in_progress/done` (e.g. written directly to the store), `getStats` silently ignores it. Worth a test to document that behavior.
- **The global 500 error handler** - `app.js` has error middleware that's never triggered in tests. A test that injects a middleware error would catch any regression there.
- **Ordering guarantees** - none of the list endpoints specify a sort order. Tests assume insertion order, which holds for an array but isn't a contract. Worth either formalising or testing explicitly.

---

## Anything that surprised me

Two things stood out:

**The `getByStatus` substring bug** was particularly subtle. `t.status.includes(status)` looks almost right - it would pass all the happy-path tests you'd naturally write first (`status=todo`, `status=done`). It only fails on partial or overlapping strings, which you'd only discover by thinking adversarially or by testing with an invalid status value. This is a good example of why edge-case tests matter more than happy paths.

**The `completeTask` priority reset** was the most dangerous kind of bug - a silent data mutation with a 200 response. There's no way for a client to know their high-priority task just became medium unless they diff the before and after. It looked like a copy-paste artifact from an earlier draft of the function.

---

## Questions I'd ask before shipping to production

1. **Persistence** - the in-memory store resets on every restart. Is that intentional for this use case, or does this need a database before going live? Any deploy or crash wipes all data.

2. **Authentication** - there's no auth on any endpoint. Anyone can create, update, delete, or assign tasks. Is that by design (internal tool?) or a missing requirement?

3. **The `assignee` field** - it's currently a free-text string. Should it be validated against a list of real users? If two people type `"alice"` and `"Alice"` they appear as different assignees in the data.

4. **Pagination contract** - the API accepts `?page=` and `?limit=` but there's no `total` count in the response. Clients have no way to know how many pages exist or when they've reached the end. Is that acceptable, or should the response wrap results with metadata?

5. **Status transitions** - right now `PUT /tasks/:id` lets you freely set any status, including going backwards from `done` to `todo`. Should there be transition rules (e.g. can't un-complete a task)?
