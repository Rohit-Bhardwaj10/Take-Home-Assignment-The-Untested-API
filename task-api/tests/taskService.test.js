const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

// getAll
describe('getAll', () => {
  it('returns an empty array when no tasks exist', () => {
    expect(taskService.getAll()).toEqual([]);
  });

  it('returns all created tasks', () => {
    taskService.create({ title: 'Task A' });
    taskService.create({ title: 'Task B' });
    expect(taskService.getAll()).toHaveLength(2);
  });

  it('returns a copy — mutating the result does not affect the store', () => {
    taskService.create({ title: 'Task A' });
    const tasks = taskService.getAll();
    tasks.pop();
    expect(taskService.getAll()).toHaveLength(1);
  });
});

// findById
describe('findById', () => {
  it('returns the task when found', () => {
    const created = taskService.create({ title: 'Find me' });
    const found = taskService.findById(created.id);
    expect(found).toBeDefined();
    expect(found.id).toBe(created.id);
  });

  it('returns undefined for a non-existent id', () => {
    expect(taskService.findById('non-existent-id')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// create
// ---------------------------------------------------------------------------
describe('create', () => {
  it('creates a task with the given title', () => {
    const task = taskService.create({ title: 'Buy milk' });
    expect(task.title).toBe('Buy milk');
  });

  it('assigns a unique uuid id', () => {
    const a = taskService.create({ title: 'A' });
    const b = taskService.create({ title: 'B' });
    expect(a.id).toBeDefined();
    expect(b.id).toBeDefined();
    expect(a.id).not.toBe(b.id);
  });

  it('sets default status to "todo"', () => {
    const task = taskService.create({ title: 'Defaults test' });
    expect(task.status).toBe('todo');
  });

  it('sets default priority to "medium"', () => {
    const task = taskService.create({ title: 'Defaults test' });
    expect(task.priority).toBe('medium');
  });

  it('sets default description to empty string', () => {
    const task = taskService.create({ title: 'Defaults test' });
    expect(task.description).toBe('');
  });

  it('sets default dueDate to null', () => {
    const task = taskService.create({ title: 'Defaults test' });
    expect(task.dueDate).toBeNull();
  });

  it('sets completedAt to null on creation', () => {
    const task = taskService.create({ title: 'New task' });
    expect(task.completedAt).toBeNull();
  });

  it('sets createdAt to an ISO string', () => {
    const task = taskService.create({ title: 'Timestamp test' });
    expect(() => new Date(task.createdAt)).not.toThrow();
    expect(new Date(task.createdAt).toISOString()).toBe(task.createdAt);
  });

  it('accepts custom status, priority and dueDate', () => {
    const due = '2025-12-31T00:00:00.000Z';
    const task = taskService.create({ title: 'Custom', status: 'in_progress', priority: 'high', dueDate: due });
    expect(task.status).toBe('in_progress');
    expect(task.priority).toBe('high');
    expect(task.dueDate).toBe(due);
  });
});

// ---------------------------------------------------------------------------
// getByStatus
// ---------------------------------------------------------------------------
describe('getByStatus', () => {
  beforeEach(() => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'in_progress' });
    taskService.create({ title: 'C', status: 'done' });
  });

  it('returns only tasks matching the requested status (exact match)', () => {
    const result = taskService.getByStatus('todo');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('A');
  });

  it('returns only in_progress tasks', () => {
    const result = taskService.getByStatus('in_progress');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('B');
  });

  it('returns empty array for an unknown status', () => {
    const result = taskService.getByStatus('pending');
    expect(result).toHaveLength(0);
  });


  it('does NOT match tasks whose status merely contains the query string (e.g. "do")', () => {
    // "do" is a substring of both "todo" and "done"
    const result = taskService.getByStatus('do');
    expect(result).toHaveLength(0); // no task has status === "do"
  });

  it('does NOT match tasks whose status merely contains "in"', () => {
    // "in" is a substring of "in_progress"
    const result = taskService.getByStatus('in');
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// getPaginated
// ---------------------------------------------------------------------------
describe('getPaginated', () => {
  beforeEach(() => {
    // Create 5 tasks in order
    for (let i = 1; i <= 5; i++) {
      taskService.create({ title: `Task ${i}` });
    }
  });

  
  it('page 1 returns the FIRST page of results', () => {
    const page1 = taskService.getPaginated(1, 2);
    expect(page1).toHaveLength(2);
    expect(page1[0].title).toBe('Task 1');
    expect(page1[1].title).toBe('Task 2');
  });

  it('page 2 returns the second page of results', () => {
    const page2 = taskService.getPaginated(2, 2);
    expect(page2).toHaveLength(2);
    expect(page2[0].title).toBe('Task 3');
    expect(page2[1].title).toBe('Task 4');
  });

  it('last page returns remaining tasks', () => {
    const page3 = taskService.getPaginated(3, 2);
    expect(page3).toHaveLength(1);
    expect(page3[0].title).toBe('Task 5');
  });

  it('returns empty array when page exceeds total tasks', () => {
    const page10 = taskService.getPaginated(10, 2);
    expect(page10).toHaveLength(0);
  });

  it('page 1 with limit equal to total returns all tasks', () => {
    const result = taskService.getPaginated(1, 5);
    expect(result).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------
describe('update', () => {
  it('updates the specified fields and returns the updated task', () => {
    const task = taskService.create({ title: 'Original', priority: 'low' });
    const updated = taskService.update(task.id, { title: 'Updated', priority: 'high' });
    expect(updated.title).toBe('Updated');
    expect(updated.priority).toBe('high');
  });

  it('preserves fields that were not updated', () => {
    const task = taskService.create({ title: 'Keep me', description: 'desc' });
    const updated = taskService.update(task.id, { title: 'Changed' });
    expect(updated.description).toBe('desc');
    expect(updated.id).toBe(task.id);
  });

  it('returns null when task id does not exist', () => {
    const result = taskService.update('ghost-id', { title: 'Nope' });
    expect(result).toBeNull();
  });

  it('the update is persisted — getAll reflects the change', () => {
    const task = taskService.create({ title: 'Before' });
    taskService.update(task.id, { title: 'After' });
    const all = taskService.getAll();
    expect(all[0].title).toBe('After');
  });
});

// ---------------------------------------------------------------------------
// remove
// ---------------------------------------------------------------------------
describe('remove', () => {
  it('removes the task and returns true', () => {
    const task = taskService.create({ title: 'Delete me' });
    const result = taskService.remove(task.id);
    expect(result).toBe(true);
    expect(taskService.getAll()).toHaveLength(0);
  });

  it('returns false when task does not exist', () => {
    const result = taskService.remove('non-existent');
    expect(result).toBe(false);
  });

  it('only removes the targeted task, not others', () => {
    const a = taskService.create({ title: 'Keep' });
    const b = taskService.create({ title: 'Remove' });
    taskService.remove(b.id);
    const all = taskService.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(a.id);
  });
});

// ---------------------------------------------------------------------------
// completeTask
// ---------------------------------------------------------------------------
describe('completeTask', () => {
  it('sets status to "done"', () => {
    const task = taskService.create({ title: 'Finish me' });
    const updated = taskService.completeTask(task.id);
    expect(updated.status).toBe('done');
  });

  it('sets completedAt to a valid ISO string', () => {
    const task = taskService.create({ title: 'Finish me' });
    const updated = taskService.completeTask(task.id);
    expect(updated.completedAt).not.toBeNull();
    expect(new Date(updated.completedAt).toISOString()).toBe(updated.completedAt);
  });

  it('returns null when task does not exist', () => {
    expect(taskService.completeTask('ghost-id')).toBeNull();
  });

  it('can complete a task that is already done (idempotent call)', () => {
    const task = taskService.create({ title: 'Already done', status: 'done' });
    const updated = taskService.completeTask(task.id);
    expect(updated.status).toBe('done');
  });

  it('does NOT change the priority when marking a task complete', () => {
    const task = taskService.create({ title: 'High priority task', priority: 'high' });
    const updated = taskService.completeTask(task.id);
    expect(updated.priority).toBe('high'); 
  });

  it('preserves the task title and description after completion', () => {
    const task = taskService.create({ title: 'Title', description: 'Desc' });
    const updated = taskService.completeTask(task.id);
    expect(updated.title).toBe('Title');
    expect(updated.description).toBe('Desc');
  });
});

// ---------------------------------------------------------------------------
// assignTask
describe('assignTask', () => {
  it('assigns an assignee to an existing task and returns the updated task', () => {
    const task = taskService.create({ title: 'Assign me' });
    const updated = taskService.assignTask(task.id, 'Alice');
    expect(updated).not.toBeNull();
    expect(updated.assignee).toBe('Alice');
  });

  it('returns null when the task does not exist', () => {
    const result = taskService.assignTask('ghost-id', 'Alice');
    expect(result).toBeNull();
  });

  it('preserves all other task fields when assigning', () => {
    const task = taskService.create({ title: 'Keep fields', priority: 'high', status: 'in_progress' });
    const updated = taskService.assignTask(task.id, 'Bob');
    expect(updated.title).toBe('Keep fields');
    expect(updated.priority).toBe('high');
    expect(updated.status).toBe('in_progress');
    expect(updated.id).toBe(task.id);
  });

  it('allows reassigning a task that is already assigned (overwrites)', () => {
    const task = taskService.create({ title: 'Reassign me' });
    taskService.assignTask(task.id, 'Alice');
    const updated = taskService.assignTask(task.id, 'Bob');
    expect(updated.assignee).toBe('Bob');
  });

  it('persists the assignment — findById reflects the change', () => {
    const task = taskService.create({ title: 'Persist' });
    taskService.assignTask(task.id, 'Carol');
    const found = taskService.findById(task.id);
    expect(found.assignee).toBe('Carol');
  });
});

// getStats
// ---------------------------------------------------------------------------
describe('getStats', () => {
  it('returns zero counts when no tasks exist', () => {
    const stats = taskService.getStats();
    expect(stats).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  it('counts tasks by status correctly', () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'todo' });
    taskService.create({ title: 'C', status: 'in_progress' });
    taskService.create({ title: 'D', status: 'done' });
    const stats = taskService.getStats();
    expect(stats.todo).toBe(2);
    expect(stats.in_progress).toBe(1);
    expect(stats.done).toBe(1);
  });

  it('counts overdue tasks (past dueDate and not done)', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString(); // yesterday
    taskService.create({ title: 'Overdue todo', status: 'todo', dueDate: pastDate });
    taskService.create({ title: 'Overdue in_progress', status: 'in_progress', dueDate: pastDate });
    const stats = taskService.getStats();
    expect(stats.overdue).toBe(2);
  });

  it('does NOT count done tasks as overdue even if past due date', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    taskService.create({ title: 'Done overdue', status: 'done', dueDate: pastDate });
    const stats = taskService.getStats();
    expect(stats.overdue).toBe(0);
  });

  it('does NOT count future-due tasks as overdue', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString(); // tomorrow
    taskService.create({ title: 'Not yet overdue', status: 'todo', dueDate: futureDate });
    const stats = taskService.getStats();
    expect(stats.overdue).toBe(0);
  });

  it('does NOT count tasks with no dueDate as overdue', () => {
    taskService.create({ title: 'No due date', status: 'todo' });
    const stats = taskService.getStats();
    expect(stats.overdue).toBe(0);
  });
});
