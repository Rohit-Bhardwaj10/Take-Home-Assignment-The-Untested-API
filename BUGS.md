# Bug Report - Task Manager API

Bugs discovered through automated testing (unit + integration tests).  
All bugs are in `task-api/src/services/taskService.js`.

---

## Bug 1 - `getByStatus`: Partial string match instead of exact equality

**File:** `src/services/taskService.js`, line 9

### Expected behavior
`GET /tasks?status=todo` should return only tasks whose `status` is exactly `"todo"`.  
Querying with an arbitrary string like `"do"` should return 0 results, since no task has a status of `"do"`.

### What actually happens
The implementation uses `String.prototype.includes()`:

```js
// current (buggy)
const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
```

This performs a substring search. Any query string that appears inside a valid status will match unintended tasks:

| Query | Incorrectly matches |
|---|---|
| `"do"` | `"todo"` and `"done"` |
| `"in"` | `"in_progress"` |
| `"_"` | `"in_progress"` |

### How I discovered it
Written test: `does NOT return tasks when status is a partial match (e.g. "do")`.  
Expected 0 results, received 2 (`"todo"` and `"done"` tasks both matched).

### What a fix looks like
```diff
- const getByStatus = (status) => tasks.filter((t) => t.status.includes(status));
+ const getByStatus = (status) => tasks.filter((t) => t.status === status);
```

---

## Bug 2 - `getPaginated`: Off-by-one in page offset calculation

**File:** `src/services/taskService.js`, line 12

### Expected behavior
Pagination is 1-indexed: `page=1` should return the first page of results (items 0 to `limit-1`).  
With 5 tasks and `limit=2`, `page=1` should return Task 1 and Task 2.

### What actually happens
The offset formula uses `page * limit` instead of `(page - 1) * limit`:

```js
// current (buggy)
const getPaginated = (page, limit) => {
  const offset = page * limit;   // wrong - treats pages as 0-indexed
  return tasks.slice(offset, offset + limit);
};
```

With `page=1, limit=2`:
- Bug computes `offset = 1 * 2 = 2` → skips first 2 items, returns Task 3 and Task 4
- Correct should be `offset = (1-1) * 2 = 0` → returns Task 1 and Task 2

**Impact:** The first page is completely unreachable. Every page a client requests is shifted by one, meaning clients always receive the wrong data with no error signal.

### How I discovered it
Written test: `page=1 returns the FIRST set of results`.  
Expected `Task 1`, received `Task 3`.

### What a fix looks like
```diff
- const offset = page * limit;
+ const offset = (page - 1) * limit;
```

---

## Bug 3 - `completeTask`: Silently resets task priority to `"medium"`

**File:** `src/services/taskService.js`, line 69

### Expected behavior
`PATCH /tasks/:id/complete` should set `status` to `"done"` and record `completedAt`.  
It should not modify any other field - in particular, a `high` priority task should remain `high` after being marked complete.

### What actually happens
`priority: 'medium'` is hard-coded inside the object spread:

```js
// current (buggy)
const updated = {
  ...task,
  priority: 'medium',   // overwrites the task's actual priority
  status: 'done',
  completedAt: new Date().toISOString(),
};
```

Because `priority: 'medium'` comes after `...task`, it overwrites the original priority on every completion call. A task that was created with `priority: 'high'` silently becomes `priority: 'medium'` when completed. The API returns HTTP 200 with no error, making this corruption invisible to callers.

### How I discovered it
Written test: `does NOT change the priority when marking a task complete`.  
Created a `high` priority task, called complete, expected `priority: "high"`, received `priority: "medium"`.

### What a fix looks like
Remove the erroneous line entirely. The spread `...task` already carries the original priority forward:

```diff
  const updated = {
    ...task,
-   priority: 'medium',
    status: 'done',
    completedAt: new Date().toISOString(),
  };
```

---

## Summary

| # | Location | Line | Description | Severity |
|---|---|---|---|---|
| 1 | `taskService.js` | 9 | `getByStatus` uses `.includes()` instead of `===` | Medium |
| 2 | `taskService.js` | 12 | `getPaginated` offset is `page * limit` instead of `(page-1) * limit` | **High** |
| 3 | `taskService.js` | 69 | `completeTask` hard-codes `priority: 'medium'` on every completion | Medium |

Bug 2 is the most severe - it causes every paginated response to return wrong data with no client-visible error.
