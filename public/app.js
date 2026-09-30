'use strict';
const $ = selector => document.querySelector(selector);
const state = { user: null, tasks: [], view: 'all', filter: 'all', search: '', sort: 'newest', authMode: 'register', editing: null, deleting: null, day: null };
const descriptions = { all: ['Training plan', 'Your sessions, your schedule, your progress.'], today: ['Today', 'Today’s sessions and any training still to catch up on.'], high: ['Match prep', 'Get ready for your next game.'], completed: ['Completed', 'The work you’ve put in. Keep building.'] };
const focusLabels = { 'ball-control': 'Ball control', passing: 'Passing', shooting: 'Shooting', fitness: 'Fitness', 'match-prep': 'Match prep' };
const intensityLabels = { low: 'Light', medium: 'Moderate', high: 'High intensity' };
const starters = {
  control: { title: 'First touch & close control', focus: 'ball-control', duration: 30, priority: 'medium', notes: `Start with an easy warm-up.
Work through a cone slalom using both feet.
Practice receiving a pass and taking your first touch into space.
Finish with a short cool-down.` },
  shooting: { title: 'Finishing & weak-foot practice', focus: 'shooting', duration: 45, priority: 'medium', notes: `Warm up with short passes.
Practice placing shots into different corners.
Alternate your stronger and weaker foot.
Finish with receiving, turning, and shooting.` },
  fitness: { title: 'Footwork & agility', focus: 'fitness', duration: 30, priority: 'medium', notes: `Start with an easy warm-up.
Practice quick steps between cones.
Add short changes of direction, with recovery between rounds.
Finish with a gentle cool-down.` },
};
let toastTimer;
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3500);
}
function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  } catch { throw new Error('Cannot reach the app. Check that npm start is still running, then try again.'); }
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && state.user) showAuth();
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data;
}
function showAuth() {
  state.user = null;
  state.tasks = [];
  for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
  $('#loading').hidden = true;
  $('#workspace').hidden = true;
  $('#auth-screen').hidden = false;
  $('#auth-password').value = '';
}
function setAuthMode(mode) {
  state.authMode = mode;
  const register = mode === 'register';
  $('#auth-heading').textContent = register ? 'Welcome to your club.' : 'Welcome back.';
  $('#auth-subtitle').textContent = register ? 'A personal space for your soccer ambitions.' : 'Your next session is waiting.';
  $('#name-label').hidden = !register;
  $('#auth-name').required = register;
  $('#auth-password').autocomplete = register ? 'new-password' : 'current-password';
  $('#auth-submit').textContent = register ? 'Create my account ↗' : 'Get back on the pitch ↗';
  $('#auth-error').textContent = '';
  for (const item of ['register', 'login']) {
    $(`#${item}-tab`).classList.toggle('selected', item === mode);
    $(`#${item}-tab`).setAttribute('aria-pressed', String(item === mode));
  }
}
async function openWorkspace(user) {
  state.user = user;
  state.view = 'all'; state.filter = 'all'; state.search = ''; state.sort = 'newest'; state.day = null;
  $('#search').value = ''; $('#sort').value = 'newest';
  $('#auth-password').value = '';
  const result = await api('/training');
  state.tasks = result.sessions;
  $('#loading').hidden = true; $('#auth-screen').hidden = true; $('#workspace').hidden = false;
  $('#account-name').textContent = user.name;
  $('#avatar').textContent = user.name.split(/\s+/).map(word => word[0]).slice(0,2).join('').toUpperCase();
  $('#greeting').textContent = `Ready to put in the work, ${user.name.split(/\s+/)[0]}?`;
  $('#date-label').textContent = new Date().toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' }).toUpperCase();
  render();
  try {
    const health = await api('/health');
    $('#db-status').textContent = health.database === 'connected' ? 'MongoDB connected' : 'Database unavailable';
  } catch { $('#db-status').textContent = 'Database unavailable'; }
}
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function actionButton(label, svgPath, onClick) {
  const button = element('button', 'icon-button');
  button.type = 'button'; button.title = label; button.setAttribute('aria-label', label);
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('fill','none'); svg.setAttribute('stroke','currentColor'); svg.setAttribute('stroke-width','1.5'); svg.setAttribute('aria-hidden','true');
  const path = document.createElementNS('http://www.w3.org/2000/svg','path'); path.setAttribute('d',svgPath);
  svg.append(path); button.append(svg); button.addEventListener('click',onClick);
  return button;
}
function matchesView(task, view) {
  if (view === 'today') return !task.completed && task.dueDate && task.dueDate <= localDate();
  if (view === 'high') return task.focus === 'match-prep';
  if (view === 'completed') return task.completed;
  return true;
}
function taskRow(task) {
  const row = element('article', `task-row${task.completed ? ' done' : ''}`);
  const check = element('button', 'task-check', '✓');
  check.type = 'button'; check.setAttribute('aria-label', `${task.completed ? 'Mark planned' : 'Complete'}: ${task.title}`); check.setAttribute('aria-pressed', String(task.completed));
  check.addEventListener('click', async () => {
    check.disabled = true;
    try {
      const result = await api(`/training/${task.id}`, { method: 'PATCH', body: JSON.stringify({ completed: !task.completed }) });
      state.tasks = state.tasks.map(item => item.id === task.id ? result.session : item);
      render(); toast(result.session.completed ? 'Session complete. That’s work in the bank.' : 'Session moved back to planned.');
    } catch (error) { toast(error.message); check.disabled = false; }
  });
  const content = element('div','task-content');
  content.append(element('h3','task-title',task.title));
  if (task.notes) content.append(element('p','task-notes',task.notes));
  const meta = element('div','task-meta');
  meta.append(element('span', 'focus-badge', focusLabels[task.focus]));
  meta.append(element('span',`badge ${task.priority}`,intensityLabels[task.priority]));
  meta.append(element('span','task-date',`${task.duration} min`));
  if (task.location) meta.append(element('span','task-date',task.location));
  if (task.dueDate) {
    const due = new Date(`${task.dueDate}T12:00:00`);
    const isOverdue = !task.completed && task.dueDate < localDate();
    const label = task.dueDate === localDate() ? 'Today' : due.toLocaleDateString(undefined,{month:'short',day:'numeric', ...(due.getFullYear() !== new Date().getFullYear() ? {year:'numeric'} : {})});
    meta.append(element('span',`task-date${isOverdue ? ' overdue' : ''}`,`${isOverdue ? 'Past date · ' : ''}${label}`));
  }
  content.append(meta);
  const actions = element('div','task-actions');
  actions.append(actionButton(`Edit: ${task.title}`, 'M15 5l4 4M4 20l4-1 12-12a2.8 2.8 0 0 0-4-4L4 15v5z', () => openTask(task)));
  actions.append(actionButton(`Delete: ${task.title}`, 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7', () => {
    state.deleting = task; $('#delete-description').textContent = task.title; $('#delete-error').textContent = ''; $('#delete-dialog').showModal(); $('#cancel-delete').focus();
  }));
  row.append(check,content,actions);
  return row;
}
function render() {
  const done = state.tasks.filter(task => task.completed).length;
  const percent = state.tasks.length ? Math.round(done/state.tasks.length*100) : 0;
  $('#stat-total').textContent = state.tasks.length; $('#stat-active').textContent = state.tasks.length-done; $('#stat-done').textContent = done;
  const minutes = state.tasks.filter(task => task.completed).reduce((sum, task) => sum + task.duration, 0);
  $('#stat-percent').replaceChildren(document.createTextNode(String(minutes)), element('span',null,' min'));
  $('#progress').value = percent;
  $('#progress-caption').textContent = state.tasks.length ? `${done} of ${state.tasks.length} sessions completed` : 'Time well spent';
  for (const button of document.querySelectorAll('[data-view]')) {
    button.classList.toggle('active',button.dataset.view === state.view);
    button.setAttribute('aria-current', button.dataset.view === state.view ? 'page' : 'false');
    $(`#count-${button.dataset.view}`).textContent = state.tasks.filter(task => matchesView(task,button.dataset.view)).length;
  }
  for (const button of document.querySelectorAll('[data-filter]')) {
    button.classList.toggle('selected',button.dataset.filter === state.filter);
    button.setAttribute('aria-pressed',String(button.dataset.filter === state.filter));
  }
  const [title, description] = descriptions[state.view];
  $('#breadcrumb-view').textContent = title; $('#list-subtitle').textContent = description;
  let visible = state.tasks.filter(task => matchesView(task,state.view))
    .filter(task => state.filter === 'all' || (state.filter === 'completed' ? task.completed : !task.completed))
    .filter(task => !state.day || task.dueDate === state.day)
    .filter(task => `${task.title} ${task.notes} ${task.location} ${focusLabels[task.focus]}`.toLowerCase().includes(state.search.toLowerCase()));
  const priority = { high:0, medium:1, low:2 };
  visible.sort((a,b) => {
    if (state.sort === 'priority') return priority[a.priority]-priority[b.priority] || b.createdAt.localeCompare(a.createdAt);
    if (state.sort === 'due') return (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || b.createdAt.localeCompare(a.createdAt);
    return b.createdAt.localeCompare(a.createdAt);
  });
  $('#list-heading').replaceChildren(document.createTextNode(title+' '), element('span',null,String(visible.length)));
  $('#tasks').replaceChildren(...visible.map(taskRow));
  $('#empty').hidden = visible.length > 0;
  const noTasks = state.tasks.length === 0;
  $('#empty-heading').textContent = noTasks ? 'Your next level starts here.' : 'A clear schedule. Room to get better.';
  $('#empty-description').textContent = noTasks ? 'Plan your first session. The pitch is waiting.' : 'Try a different filter, or plan a session for this day.';
  $('#empty-add').textContent = noTasks ? '＋ Plan your first session' : '＋ New session';
  renderWeek();
  $('#list-summary').textContent = `${visible.length} ${visible.length === 1 ? 'session' : 'sessions'} · ${state.tasks.length-done} planned overall`;
}
function openTask(task = null) {
  state.editing = task;
  $('#task-form').reset();
  $('#task-title').value = task?.title || ''; $('#task-notes').value = task?.notes || ''; $('#task-priority').value = task?.priority || 'medium'; $('#task-due').value = task?.dueDate || state.day || localDate();
  $('#task-focus').value = task?.focus || 'ball-control'; $('#task-duration').value = task?.duration || 45; $('#task-location').value = task?.location || '';
  $('#task-dialog-heading').textContent = task ? 'Fine-tune your session.' : 'Plan your next session.';
  $('#save-task').textContent = task ? 'Save changes ↗' : 'Add to my plan ↗';
  $('#task-error').textContent = '';
  $('#task-dialog').showModal(); $('#task-title').focus();
}
function renderWeek() {
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const days = [];
  for (let i=0; i<7; i++) {
    const date = new Date(monday); date.setDate(monday.getDate()+i);
    const key = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const count = state.tasks.filter(task => task.dueDate === key).length;
    const button = element('button', `week-day${key===localDate()?' is-today':''}${key===state.day?' selected':''}`);
    button.setAttribute('aria-label', `${date.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})}: ${count} sessions`);
    button.setAttribute('aria-pressed',String(key===state.day));
    button.append(element('span','week-label',date.toLocaleDateString(undefined,{weekday:'short'})),element('strong',null,String(date.getDate())),element('span','week-count',count ? `${count} ${count===1?'session':'sessions'}` : '—'));
    button.addEventListener('click',() => {state.day=state.day===key?null:key;state.view='all';state.filter='all';render();});
    days.push(button);
  }
  $('#week-days').replaceChildren(...days);
  $('#clear-day').hidden = !state.day;
}
$('#clear-day').addEventListener('click',() => {state.day=null;render();});
for (const button of document.querySelectorAll('[data-drill]')) button.addEventListener('click',() => {
  openTask(); const starter=starters[button.dataset.drill];
  $('#task-title').value=starter.title; $('#task-notes').value=starter.notes; $('#task-focus').value=starter.focus; $('#task-duration').value=starter.duration; $('#task-priority').value=starter.priority;
});
$('#register-tab').addEventListener('click',() => setAuthMode('register'));
$('#login-tab').addEventListener('click',() => setAuthMode('login'));
$('#auth-form').addEventListener('submit',async event => {
  event.preventDefault();
  const submit = $('#auth-submit'); submit.disabled = true; $('#auth-error').textContent = '';
  $('#register-tab').disabled = true; $('#login-tab').disabled = true;
  try {
    const body = { email:$('#auth-email').value.trim(), password:$('#auth-password').value };
    if (state.authMode === 'register') body.name = $('#auth-name').value.trim();
    const {user} = await api(`/auth/${state.authMode}`,{method:'POST',body:JSON.stringify(body)});
    await openWorkspace(user);
  } catch (error) { $('#auth-error').textContent = error.message; }
  finally { submit.disabled = false; $('#register-tab').disabled = false; $('#login-tab').disabled = false; }
});
$('#logout').addEventListener('click',async () => {
  $('#logout').disabled = true;
  try { await api('/auth/logout',{method:'POST',body:'{}'}); showAuth(); setAuthMode('login'); }
  catch (error) { toast(error.message); }
  finally { $('#logout').disabled = false; }
});
for (const id of ['sidebar-add','main-add','empty-add','hero-add']) $(`#${id}`).addEventListener('click',() => openTask());
for (const id of ['close-task','cancel-task']) $(`#${id}`).addEventListener('click',() => $('#task-dialog').close());
$('#cancel-delete').addEventListener('click',() => $('#delete-dialog').close());
$('#task-form').addEventListener('submit',async event => {
  event.preventDefault(); $('#task-error').textContent = '';
  const dialog = $('#task-dialog');
  const buttons = [$('#save-task'),$('#close-task'),$('#cancel-task')]; buttons.forEach(button => { button.disabled=true; });
  dialog.dataset.saving='true';
  try {
    const body = { title:$('#task-title').value, notes:$('#task-notes').value, priority:$('#task-priority').value, dueDate:$('#task-due').value || null, focus:$('#task-focus').value, duration:Number($('#task-duration').value), location:$('#task-location').value };
    const result = await api(state.editing ? `/training/${state.editing.id}` : '/training', {method:state.editing ? 'PATCH' : 'POST',body:JSON.stringify(body)});
    if (state.editing) state.tasks=state.tasks.map(task => task.id === result.session.id ? result.session : task);
    else { state.tasks.unshift(result.session); state.view='all'; state.filter='all'; state.search=''; state.day=null; $('#search').value=''; }
    dialog.close(); render(); toast(state.editing ? 'Changes saved.' : 'Session added. See you on the pitch.');
  } catch (error) { $('#task-error').textContent=error.message; }
  finally { buttons.forEach(button => {button.disabled=false;}); delete dialog.dataset.saving; }
});
$('#delete-form').addEventListener('submit',async event => {
  event.preventDefault(); $('#delete-error').textContent='';
  $('#confirm-delete').disabled=true; $('#cancel-delete').disabled=true; $('#delete-dialog').dataset.saving='true';
  try {
    await api(`/training/${state.deleting.id}`,{method:'DELETE'});
    state.tasks=state.tasks.filter(task => task.id !== state.deleting.id);
    $('#delete-dialog').close(); render(); toast('Session removed from your plan.');
  } catch (error) { $('#delete-error').textContent=error.message; }
  finally { $('#confirm-delete').disabled=false; $('#cancel-delete').disabled=false; delete $('#delete-dialog').dataset.saving; }
});
for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('cancel',event => {if (dialog.dataset.saving) event.preventDefault();});
for (const button of document.querySelectorAll('[data-view]')) button.addEventListener('click',() => {state.view=button.dataset.view;state.filter='all';state.day=null;render();});
for (const button of document.querySelectorAll('[data-filter]')) button.addEventListener('click',() => {state.filter=button.dataset.filter;render();});
$('#search').addEventListener('input',event => {state.search=event.target.value;render();});
$('#sort').addEventListener('change',event => {state.sort=event.target.value;render();});
document.addEventListener('keydown',event => {
  if (event.key.toLowerCase()==='n' && !event.metaKey && !event.ctrlKey && !event.altKey && state.user && !document.querySelector('dialog[open]') && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {event.preventDefault();openTask();}
});
(async () => {
  try {const {user}=await api('/auth/me');await openWorkspace(user);}
  catch (error) {showAuth();if (!/sign in/i.test(error.message)) $('#auth-error').textContent=error.message;}
})();
