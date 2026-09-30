const fields = ['title', 'notes', 'priority', 'dueDate', 'completed', 'focus', 'duration', 'location'];
function validateSession(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Send a JSON object.' };
  if (Object.keys(body).some(key => !fields.includes(key))) return { error: 'Unknown session field.' };
  const session = {};
  if (!partial || Object.hasOwn(body, 'title')) {
    if (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 160) return { error: 'Enter a title between 1 and 160 characters.' };
    session.title = body.title.trim();
  }
  if (Object.hasOwn(body, 'notes')) {
    if (typeof body.notes !== 'string' || body.notes.length > 2000) return { error: 'Notes must be text, up to 2,000 characters.' };
    session.notes = body.notes.trim();
  }
  if (Object.hasOwn(body, 'priority')) {
    if (!['low', 'medium', 'high'].includes(body.priority)) return { error: 'Choose low, medium, or high priority.' };
    session.priority = body.priority;
  }
  if (Object.hasOwn(body, 'completed')) {
    if (typeof body.completed !== 'boolean') return { error: 'Completed must be true or false.' };
    session.completed = body.completed;
  }
  if (Object.hasOwn(body, 'focus')) {
    if (!['ball-control', 'passing', 'shooting', 'fitness', 'match-prep'].includes(body.focus)) return { error: 'Choose a valid training focus.' };
    session.focus = body.focus;
  }
  if (Object.hasOwn(body, 'duration')) {
    if (!Number.isInteger(body.duration) || body.duration < 5 || body.duration > 240) return { error: 'Duration must be a whole number between 5 and 240 minutes.' };
    session.duration = body.duration;
  }
  if (Object.hasOwn(body, 'location')) {
    if (typeof body.location !== 'string' || body.location.length > 120) return { error: 'Location must be text, up to 120 characters.' };
    session.location = body.location.trim();
  }
  if (Object.hasOwn(body, 'dueDate')) {
    const value = body.dueDate;
    if (value !== null && value !== '') {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) return { error: 'Choose a valid due date.' };
    }
    session.dueDate = value || null;
  }
  if (partial && !Object.keys(session).length) return { error: 'Include at least one field to update.' };
  return { session };
}
module.exports = { validateSession };
