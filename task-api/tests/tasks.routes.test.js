const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

// GET /tasks — list all
describe('GET /tasks', () => {
  it('returns 200 and an empty array when no tasks exist', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns all tasks', async () => {
    taskService.create({ title: 'Task 1' });
    taskService.create({ title: 'Task 2' });
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('returns tasks with the expected shape', async () => {
    taskService.create({ title: 'Shape test', priority: 'high' });
    const res = await request(app).get('/tasks');
    const task = res.body[0];
    expect(task).toHaveProperty('id');
    expect(task).toHaveProperty('title', 'Shape test');
    expect(task).toHaveProperty('description');
    expect(task).toHaveProperty('status');
    expect(task).toHaveProperty('priority', 'high');
    expect(task).toHaveProperty('dueDate');
    expect(task).toHaveProperty('completedAt');
    expect(task).toHaveProperty('createdAt');
  });
});

// GET /tasks?status=
describe('GET /tasks?status=', () => {
  beforeEach(() => {
    taskService.create({ title: 'Todo task', status: 'todo' });
    taskService.create({ title: 'In-progress task', status: 'in_progress' });
    taskService.create({ title: 'Done task', status: 'done' });
  });

  it('filters by status=todo', async () => {
    const res = await request(app).get('/tasks?status=todo');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Todo task');
  });

  it('filters by status=in_progress', async () => {
    const res = await request(app).get('/tasks?status=in_progress');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('In-progress task');
  });

  it('filters by status=done', async () => {
    const res = await request(app).get('/tasks?status=done');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Done task');
  });

  it('returns empty array for an unknown status value', async () => {
    const res = await request(app).get('/tasks?status=unknown');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('does NOT return tasks when status is a partial match (e.g. "do")', async () => {
    const res = await request(app).get('/tasks?status=do');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

// GET /tasks?page=&limit=
describe('GET /tasks?page=&limit=', () => {
  beforeEach(() => {
    for (let i = 1; i <= 5; i++) {
      taskService.create({ title: `Task ${i}` });
    }
  });

  it('page=1 returns the FIRST set of results', async () => {
    const res = await request(app).get('/tasks?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('Task 1');
    expect(res.body[1].title).toBe('Task 2');
  });

  it('page=2 returns the second set of results', async () => {
    const res = await request(app).get('/tasks?page=2&limit=2');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('Task 3');
    expect(res.body[1].title).toBe('Task 4');
  });

  it('last page returns remaining tasks', async () => {
    const res = await request(app).get('/tasks?page=3&limit=2');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Task 5');
  });

  it('out-of-range page returns empty array', async () => {
    const res = await request(app).get('/tasks?page=99&limit=2');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('defaults page to 1 when only limit is provided', async () => {
    const res = await request(app).get('/tasks?limit=2');
    expect(res.status).toBe(200);
    // should return first 2 tasks
    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('Task 1');
  });
});

// GET /tasks/stats
describe('GET /tasks/stats', () => {
  it('returns 200 with zero counts when no tasks exist', async () => {
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  it('returns correct counts per status', async () => {
    taskService.create({ title: 'T1', status: 'todo' });
    taskService.create({ title: 'T2', status: 'todo' });
    taskService.create({ title: 'T3', status: 'in_progress' });
    taskService.create({ title: 'T4', status: 'done' });
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
    expect(res.body.todo).toBe(2);
    expect(res.body.in_progress).toBe(1);
    expect(res.body.done).toBe(1);
  });

  it('counts overdue tasks correctly', async () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    taskService.create({ title: 'Overdue', status: 'todo', dueDate: past });
    const res = await request(app).get('/tasks/stats');
    expect(res.body.overdue).toBe(1);
  });

  it('does not count done tasks as overdue', async () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    taskService.create({ title: 'Done', status: 'done', dueDate: past });
    const res = await request(app).get('/tasks/stats');
    expect(res.body.overdue).toBe(0);
  });
});

// POST /tasks — create
describe('POST /tasks', () => {
  it('creates a task and returns 201 with the new task', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'New task' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('New task');
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('todo');
  });

  it('creates a task with all optional fields', async () => {
    const payload = {
      title: 'Full task',
      description: 'desc',
      status: 'in_progress',
      priority: 'high',
      dueDate: '2025-12-31T00:00:00.000Z',
    };
    const res = await request(app).post('/tasks').send(payload);
    expect(res.status).toBe(201);
    expect(res.body.description).toBe('desc');
    expect(res.body.status).toBe('in_progress');
    expect(res.body.priority).toBe('high');
    expect(res.body.dueDate).toBe('2025-12-31T00:00:00.000Z');
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app).post('/tasks').send({ priority: 'low' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when title is an empty string', async () => {
    const res = await request(app).post('/tasks').send({ title: '   ' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when title is not a string', async () => {
    const res = await request(app).post('/tasks').send({ title: 42 });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when status is invalid', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Test', status: 'invalid-status' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when priority is invalid', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Test', priority: 'urgent' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when dueDate is not a valid date string', async () => {
    const res = await request(app)
      .post('/tasks')
      .send({ title: 'Test', dueDate: 'not-a-date' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('persists the task — appears in subsequent GET /tasks', async () => {
    await request(app).post('/tasks').send({ title: 'Persisted' });
    const res = await request(app).get('/tasks');
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Persisted');
  });
});

// PUT /tasks/:id — update
describe('PUT /tasks/:id', () => {
  it('updates a task and returns the updated task', async () => {
    const task = taskService.create({ title: 'Original' });
    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ title: 'Updated', priority: 'high' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated');
    expect(res.body.priority).toBe('high');
  });

  it('returns 404 when task does not exist', async () => {
    const res = await request(app)
      .put('/tasks/non-existent-id')
      .send({ title: 'Nope' });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when title is an empty string', async () => {
    const task = taskService.create({ title: 'Task' });
    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ title: '' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when status is invalid', async () => {
    const task = taskService.create({ title: 'Task' });
    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ status: 'bad-status' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('partial update — preserves fields not included in the request body', async () => {
    const task = taskService.create({ title: 'Full', description: 'keep me', priority: 'high' });
    const res = await request(app)
      .put(`/tasks/${task.id}`)
      .send({ title: 'Partial update' });
    expect(res.status).toBe(200);
    expect(res.body.description).toBe('keep me');
    expect(res.body.priority).toBe('high');
  });
});

// DELETE /tasks/:id
describe('DELETE /tasks/:id', () => {
  it('deletes a task and returns 204 with no body', async () => {
    const task = taskService.create({ title: 'To delete' });
    const res = await request(app).delete(`/tasks/${task.id}`);
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  it('returns 404 when task does not exist', async () => {
    const res = await request(app).delete('/tasks/ghost-id');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('task is gone after deletion', async () => {
    const task = taskService.create({ title: 'Remove me' });
    await request(app).delete(`/tasks/${task.id}`);
    const res = await request(app).get('/tasks');
    expect(res.body).toHaveLength(0);
  });

  it('deleting once succeeds; deleting again returns 404', async () => {
    const task = taskService.create({ title: 'Once' });
    await request(app).delete(`/tasks/${task.id}`);
    const second = await request(app).delete(`/tasks/${task.id}`);
    expect(second.status).toBe(404);
  });
});

// PATCH /tasks/:id/complete
describe('PATCH /tasks/:id/complete', () => {
  it('marks a task as complete and returns the updated task', async () => {
    const task = taskService.create({ title: 'Finish me' });
    const res = await request(app).patch(`/tasks/${task.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).not.toBeNull();
  });

  it('returns 404 when task does not exist', async () => {
    const res = await request(app).patch('/tasks/ghost-id/complete');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('sets completedAt to a valid ISO date string', async () => {
    const task = taskService.create({ title: 'Date check' });
    const res = await request(app).patch(`/tasks/${task.id}/complete`);
    expect(res.status).toBe(200);
    const completedAt = res.body.completedAt;
    expect(new Date(completedAt).toISOString()).toBe(completedAt);
  });

  it('does NOT change the priority of the task when marking complete', async () => {
    const task = taskService.create({ title: 'High priority', priority: 'high' });
    const res = await request(app).patch(`/tasks/${task.id}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.priority).toBe('high');
  });

  it('preserves the task title after completion', async () => {
    const task = taskService.create({ title: 'Preserve me' });
    const res = await request(app).patch(`/tasks/${task.id}/complete`);
    expect(res.body.title).toBe('Preserve me');
  });
});

// ---------------------------------------------------------------------------
// PATCH /tasks/:id/assign
// ---------------------------------------------------------------------------
describe('PATCH /tasks/:id/assign', () => {
  it('assigns a task and returns 200 with the updated task', async () => {
    const task = taskService.create({ title: 'Need owner' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Alice' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
  });

  it('returns the full updated task object including all original fields', async () => {
    const task = taskService.create({ title: 'Full shape', priority: 'high', status: 'in_progress' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Bob' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(task.id);
    expect(res.body.title).toBe('Full shape');
    expect(res.body.priority).toBe('high');
    expect(res.body.status).toBe('in_progress');
    expect(res.body.assignee).toBe('Bob');
  });

  it('returns 404 when task does not exist', async () => {
    const res = await request(app)
      .patch('/tasks/ghost-id/assign')
      .send({ assignee: 'Alice' });
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when assignee is missing from the body', async () => {
    const task = taskService.create({ title: 'No assignee' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when assignee is an empty string', async () => {
    const task = taskService.create({ title: 'Empty assignee' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when assignee is a whitespace-only string', async () => {
    const task = taskService.create({ title: 'Whitespace assignee' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '   ' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 when assignee is not a string (e.g. a number)', async () => {
    const task = taskService.create({ title: 'Wrong type' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 42 });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('trims whitespace from assignee before storing', async () => {
    const task = taskService.create({ title: 'Trim test' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: '  Alice  ' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Alice');
  });

  it('allows reassigning a task that is already assigned', async () => {
    const task = taskService.create({ title: 'Reassign' });
    await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Alice' });
    const res = await request(app)
      .patch(`/tasks/${task.id}/assign`)
      .send({ assignee: 'Bob' });
    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Bob');
  });
});
