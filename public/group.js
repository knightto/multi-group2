// group.js: Modern calendar/events UI for group members, adapted from tee-time-brs

(function() {
  'use strict';
  const $ = (s, r=document) => r.querySelector(s);
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

  // Get groupId from URL
  const urlParams = new URLSearchParams(window.location.search);
  const groupId = urlParams.get('groupId');
  if (!groupId) {
    document.body.innerHTML = '<div style="padding:2em;text-align:center;color:#b00;font-size:1.2em">Missing groupId in URL.</div>';
    return;
  }


  // Grab all required DOM elements
  const eventsEl = $('#events');
  const calendarGrid = $('#calendarGrid');
  const currentMonthEl = $('#currentMonth');
  const prevMonthBtn = $('#prevMonth');
  const nextMonthBtn = $('#nextMonth');
  const selectedDateTitle = $('#selectedDateTitle');
  // Event creation modal elements
  const eventModal = $('#eventModal');
  const eventForm = $('#eventForm');
  const newTeeBtn = $('#newTeeBtn');
  const newTeamBtn = $('#newTeamBtn');
  const createModeInput = $('#createMode');
  const teeTimeRow = $('#teeTimeRow');
  const teamSizeRow = $('#teamSizeRow');
  const teamStartType = $('#teamStartType');
  const teamStartHint = $('#teamStartHint');

  // Diagnostics: check for missing elements
  const requiredEls = [
    ['#events', eventsEl],
    ['#calendarGrid', calendarGrid],
    ['#currentMonth', currentMonthEl],
    ['#prevMonth', prevMonthBtn],
    ['#nextMonth', nextMonthBtn],
    ['#selectedDateTitle', selectedDateTitle],
    ['#eventModal', eventModal],
    ['#eventForm', eventForm],
    ['#newTeeBtn', newTeeBtn],
    ['#newTeamBtn', newTeamBtn],
    ['#createMode', createModeInput],
    ['#teeTimeRow', teeTimeRow],
    ['#teamSizeRow', teamSizeRow],
    ['#teamStartType', teamStartType],
    ['#teamStartHint', teamStartHint],
  ];
  const missing = requiredEls.filter(([name, el]) => !el).map(([name]) => name);
  if (missing.length) {
    document.body.innerHTML = `<div style="padding:2em;text-align:center;color:#b00;font-size:1.2em">Error: Missing required elements:<br><b>${missing.join(', ')}</b><br>Check group.html and element IDs.</div>`;
    console.error('Missing required elements:', missing);
    return;
  }

  let allEvents = [];
  let currentDate = new Date();
  let selectedDate = null;

  // Show/hide modal for event creation
  on(newTeeBtn, 'click', () => {
    if (createModeInput) createModeInput.value = 'tees';
    if (teeTimeRow) teeTimeRow.hidden = false;
    if (teamSizeRow) teamSizeRow.hidden = true;
    if (eventForm?.elements?.['teeTime']) eventForm.elements['teeTime'].required = true;
    if (eventForm?.elements?.['teamStartTime']) eventForm.elements['teamStartTime'].required = false;
    if (selectedDate && eventForm?.elements?.['date']) {
      eventForm.elements['date'].value = selectedDate;
    }
    eventModal?.showModal?.();
  });
  on(newTeamBtn, 'click', () => {
    if (createModeInput) createModeInput.value = 'teams';
    if (teeTimeRow) teeTimeRow.hidden = true;
    if (teamSizeRow) teamSizeRow.hidden = false;
    if (eventForm?.elements?.['teeTime']) eventForm.elements['teeTime'].required = false;
    if (eventForm?.elements?.['teamStartTime']) eventForm.elements['teamStartTime'].required = true;
    if (selectedDate && eventForm?.elements?.['date']) {
      eventForm.elements['date'].value = selectedDate;
    }
    eventModal?.showModal?.();
  });
  // Team start type toggle
  on(teamStartType, 'change', () => {
    const isShotgun = teamStartType.value === 'shotgun';
    if (teamStartHint) {
      teamStartHint.textContent = isShotgun 
        ? 'All teams start at this time' 
        : 'Teams will start 9 minutes apart';
    }
  });
  // Dialog cancel
  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-cancel]');
    if (!btn) return;
    ev.preventDefault();
    const dlg = btn.closest('dialog');
    dlg?.close?.();
  });
  // Event creation submit
  on(eventForm, 'submit', async (e)=>{
    e.preventDefault();
    try{
      const form = eventForm;
      const mode = createModeInput?.value;
      const course = form.course.value;
      const date = form.date.value;
      const notes = form.notes.value;
      let payload = {
        groupId,
        name: course,
        date,
        description: notes,
        type: mode === 'teams' ? 'team' : 'teeTime',
      };
      if (mode === 'teams') {
        payload.teamSize = Number(form.teamSizeMax.value) || 4;
        payload.startType = form.teamStartType.value;
        payload.teams = [{ name: 'Team 1', players: [], maxPlayers: payload.teamSize }];
      } else {
        // For tee times, create 3 tee times 9 minutes apart
        const baseTime = form.teeTime.value;
        const [h, m] = baseTime.split(':').map(Number);
        payload.teeTimes = Array.from({length:3}, (_,i)=>{
          const dateObj = new Date(0,0,0,h,m+9*i);
          const time = dateObj.toTimeString().slice(0,5);
          return { time, slots: [], maxPlayers: 4 };
        });
      }
      const res = await fetch(`/api/events/group/${groupId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, adminCode: window.ADMIN_CODE || 'test' })
      });
      if (res.ok) {
        eventModal?.close?.();
        eventForm.reset();
        load();
      } else {
        alert('Create failed: ' + (await res.json()).error);
      }
    }catch(err){
      alert('Create failed: ' + (err.message || 'Unknown error'));
    }
  });

  function fmtDate(val){
    try{
      if (!val) return '—';
      const s = String(val);
      let d;
      if (/^\d{4}-\d{2}-\d{2}T/.test(s)) d = new Date(s);
      else if (/^\d{4}-\d{2}-\d{2}$/.test(s)) d = new Date(s+'T12:00:00Z');
      else d = new Date(s);
      if (isNaN(d)) return '—';
      return d.toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric', year:'numeric', timeZone:'UTC' });
    } catch { return '—'; }
  }

  function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    currentMonthEl.textContent = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    calendarGrid.innerHTML = '';
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
      const header = document.createElement('div');
      header.className = 'calendar-day-header';
      header.textContent = day;
      calendarGrid.appendChild(header);
    });
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const eventDates = new Set();
    allEvents.forEach(ev => {
      if (ev.date) {
        const dateStr = String(ev.date).slice(0, 10);
        eventDates.add(dateStr);
      }
    });
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const dayEl = createDayElement(day, year, month - 1, true);
      calendarGrid.appendChild(dayEl);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEl = createDayElement(day, year, month, false);
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      if (dateStr === todayStr) dayEl.classList.add('today');
      if (eventDates.has(dateStr)) dayEl.classList.add('has-events');
      if (selectedDate && dateStr === selectedDate) dayEl.classList.add('selected');
      calendarGrid.appendChild(dayEl);
    }
    const totalCells = firstDay + daysInMonth;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let day = 1; day <= remainingCells; day++) {
      const dayEl = createDayElement(day, year, month + 1, true);
      calendarGrid.appendChild(dayEl);
    }
  }

  function createDayElement(day, year, month, isOtherMonth) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    if (isOtherMonth) dayEl.classList.add('other-month');
    dayEl.textContent = day;
    let actualYear = year;
    let actualMonth = month;
    if (month < 0) { actualMonth = 11; actualYear--; }
    else if (month > 11) { actualMonth = 0; actualYear++; }
    const dateStr = `${actualYear}-${String(actualMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    dayEl.addEventListener('click', () => {
      if (isOtherMonth) {
        currentDate = new Date(actualYear, actualMonth, day);
        renderCalendar();
      }
      selectDate(dateStr);
    }, { passive: true });
    return dayEl;
  }

  let selectDateTimeout = null;
  function selectDate(dateStr) {
    if (selectedDate === dateStr) return;
    if (selectDateTimeout) clearTimeout(selectDateTimeout);
    selectDateTimeout = setTimeout(() => {
      selectedDate = dateStr;
      renderCalendar();
      renderEventsForDate();
    }, 60);
  }

  function renderEventsForDate() {
    if (!selectedDate) {
      selectedDateTitle.textContent = '';
      eventsEl.innerHTML = '';
      return;
    }
    const date = new Date(selectedDate + 'T12:00:00Z');
    selectedDateTitle.textContent = date.toLocaleDateString(undefined, { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      timeZone: 'UTC'
    });
    const filtered = allEvents.filter(ev => {
      if (!ev.date) return false;
      const evDateStr = String(ev.date).slice(0, 10);
      return evDateStr === selectedDate;
    });
    if (filtered.length === 0) {
      eventsEl.innerHTML = '<div style="color:#ffffff;padding:20px;text-align:center;text-shadow:0 2px 8px rgba(0,0,0,0.7)">No events scheduled for this date</div>';
    } else {
      render(filtered);
    }
  }

  on(prevMonthBtn, 'click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
  on(nextMonthBtn, 'click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });


  async function load(){
    console.log('[group.js] load() called');
    try{
      const resp = await fetch(`/api/events?groupId=${encodeURIComponent(groupId)}`);
      let list = [];
      let debugMsg = '';
      if (resp.ok) {
        list = await resp.json();
        debugMsg = `<div style="color:#166534;background:#dcfce7;padding:6px 10px;border-radius:6px;margin-bottom:8px;font-size:13px;">Loaded events: <pre style='margin:0;font-size:12px;'>${JSON.stringify(list, null, 2)}</pre></div>`;
      } else {
        debugMsg = `<div style="color:#dc2626;background:#fee2e2;padding:6px 10px;border-radius:6px;margin-bottom:8px;font-size:13px;">Failed to fetch events: ${resp.status} ${resp.statusText}</div>`;
      }
      allEvents = Array.isArray(list) ? list : [];
      renderCalendar();
      if (selectedDate) {
        renderEventsForDate();
      } else {
        eventsEl.innerHTML = '';
      }
      // Show debug info at top of events area
      eventsEl.insertAdjacentHTML('afterbegin', debugMsg);
    } catch(e) {
      console.error('[group.js] load() error:', e);
      eventsEl.innerHTML='<div class="card">Failed to load events.<br>'+String(e)+'</div>';
    }
  }

  function render(list){
    window.requestAnimationFrame(() => {
      eventsEl.innerHTML = '';
      const frag = document.createDocumentFragment();
      for(const ev of list){
        const card=document.createElement('div'); card.className='card';
        // Maybe/interested list
        const maybeList = (ev.maybeList || []).map((name, idx) =>
          `<span class="maybe-chip" title="${name}">
            <span class="maybe-name">${name}</span>
            <button class="icon small danger" title="Remove" data-remove-maybe="${ev._id}:${idx}">×</button>
          </span>`
        ).join('');
        const maybeSection = `
          <div class="maybe-section">
            <div class="maybe-header">
              <h4>🤔 Maybe List</h4>
              <button class="small" data-add-maybe="${ev._id}" style="font-size:11px;padding:3px 8px">+ Interested</button>
            </div>
            <div class="maybe-list">
              ${maybeList || '<em style="color:var(--slate-700);font-size:11px;opacity:0.7">No one yet</em>'}
            </div>
          </div>
        `;
        // Tee times or teams
        let details = '';
        if (ev.type === 'teeTime' && Array.isArray(ev.teeTimes)) {
          details += '<ul>';
          ev.teeTimes.forEach((tt, idx) => {
            details += `<li><b>${tt.time}</b> (${tt.slots.length}/${tt.maxPlayers})<ul>`;
            tt.slots.forEach(p => {
              details += `<li>${p.name} (${p.email})</li>`;
            });
            details += '</ul>';
            if (tt.slots.length < tt.maxPlayers) {
              details += `<form class='signup-form' data-event='${ev._id}' data-tt='${idx}'>
                <input type='text' name='name' placeholder='Your Name' required>
                <input type='email' name='email' placeholder='Your Email' required>
                <button type='submit'>Sign Up</button>
              </form>`;
            }
            details += `<form class='remove-form' data-event='${ev._id}' data-tt='${idx}'>
              <input type='email' name='email' placeholder='Your Email' required>
              <button type='submit'>Remove Me</button>
            </form>`;
            details += '</li>';
          });
          details += '</ul>';
        } else if (ev.type === 'team' && Array.isArray(ev.teams)) {
          details += '<ul>';
          ev.teams.forEach((team, idx) => {
            details += `<li><b>${team.name}</b> (${team.players.length}/${team.maxPlayers})<ul>`;
            team.players.forEach(p => {
              details += `<li>${p.name} (${p.email})</li>`;
            });
            details += '</ul>';
            if (team.players.length < team.maxPlayers) {
              details += `<form class='signup-team-form' data-event='${ev._id}' data-team='${idx}'>
                <input type='text' name='name' placeholder='Your Name' required>
                <input type='email' name='email' placeholder='Your Email' required>
                <button type='submit'>Join Team</button>
              </form>`;
            }
            details += `<form class='remove-team-form' data-event='${ev._id}' data-team='${idx}'>
              <input type='email' name='email' placeholder='Your Email' required>
              <button type='submit'>Remove Me</button>
            </form>`;
            details += '</li>';
          });
          details += '</ul>';
        }
        card.innerHTML = `
          <h3>${ev.name || ev.course || 'Event'}</h3>
          <div>${fmtDate(ev.date)}</div>
          ${ev.description ? `<div>${ev.description}</div>` : ''}
          ${details}
          ${maybeSection}
        `;
        frag.appendChild(card);
      }
      eventsEl.appendChild(frag);

      // Attach signup/remove handlers
      document.querySelectorAll('.signup-form').forEach(form => {
        form.onsubmit = async function(e) {
          e.preventDefault();
          const eventId = form.getAttribute('data-event');
          const ttIdx = form.getAttribute('data-tt');
          const name = form.name.value;
          const email = form.email.value;
          const res = await fetch(`/api/events/${eventId}/teetimes/${ttIdx}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email })
          });
          if (res.ok) load();
          else alert('Signup failed: ' + (await res.json()).error);
        };
      });
      document.querySelectorAll('.remove-form').forEach(form => {
        form.onsubmit = async function(e) {
          e.preventDefault();
          const eventId = form.getAttribute('data-event');
          const ttIdx = form.getAttribute('data-tt');
          const email = form.email.value;
          const res = await fetch(`/api/events/${eventId}/teetimes/${ttIdx}/remove`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          if (res.ok) load();
          else alert('Remove failed: ' + (await res.json()).error);
        };
      });
      document.querySelectorAll('.signup-team-form').forEach(form => {
        form.onsubmit = async function(e) {
          e.preventDefault();
          const eventId = form.getAttribute('data-event');
          const teamIdx = form.getAttribute('data-team');
          const name = form.name.value;
          const email = form.email.value;
          const res = await fetch(`/api/events/${eventId}/teams/${teamIdx}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email })
          });
          if (res.ok) load();
          else alert('Signup failed: ' + (await res.json()).error);
        };
      });
      document.querySelectorAll('.remove-team-form').forEach(form => {
        form.onsubmit = async function(e) {
          e.preventDefault();
          const eventId = form.getAttribute('data-event');
          const teamIdx = form.getAttribute('data-team');
          const email = form.email.value;
          const res = await fetch(`/api/events/${eventId}/teams/${teamIdx}/remove`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          if (res.ok) load();
          else alert('Remove failed: ' + (await res.json()).error);
        };
      });
      // Maybe list handlers
      document.querySelectorAll('[data-add-maybe]').forEach(btn => {
        btn.onclick = async function() {
          const eventId = btn.getAttribute('data-add-maybe');
          const name = prompt('Enter your name to add to the Maybe list:');
          if (!name) return;
          const res = await fetch(`/api/events/${eventId}/maybe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
          });
          if (res.ok) load();
          else alert('Failed to add to maybe list: ' + (await res.json()).error);
        };
      });
      document.querySelectorAll('[data-remove-maybe]').forEach(btn => {
        btn.onclick = async function() {
          const [eventId, idx] = btn.getAttribute('data-remove-maybe').split(':');
          if (!confirm('Remove from maybe list?')) return;
          const res = await fetch(`/api/events/${eventId}/maybe/${idx}`, { method: 'DELETE' });
          if (res.ok) load();
          else alert('Failed to remove from maybe list: ' + (await res.json()).error);
        };
      });
    });
  }

  // Initial load
  load();

})();
        const ttIdx = form.getAttribute('data-tt');
        const name = form.name.value;
        const email = form.email.value;
        const res = await fetch(`/api/events/${eventId}/teetimes/${ttIdx}/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email })
        });
        if (res.ok) loadGroup();
        else alert('Signup failed: ' + (await res.json()).error);
      };
    });
    document.querySelectorAll('.remove-form').forEach(form => {
      form.onsubmit = async function(e) {
        e.preventDefault();
        const eventId = form.getAttribute('data-event');
        const ttIdx = form.getAttribute('data-tt');
        const email = form.email.value;
        const res = await fetch(`/api/events/${eventId}/teetimes/${ttIdx}/remove`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        if (res.ok) loadGroup();
        else alert('Remove failed: ' + (await res.json()).error);
      };
    });
    document.querySelectorAll('.signup-team-form').forEach(form => {
      form.onsubmit = async function(e) {
        e.preventDefault();
        const eventId = form.getAttribute('data-event');
        const teamIdx = form.getAttribute('data-team');
        const name = form.name.value;
        const email = form.email.value;
        const res = await fetch(`/api/events/${eventId}/teams/${teamIdx}/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email })
        });
        if (res.ok) loadGroup();
        else alert('Signup failed: ' + (await res.json()).error);
      };
    });
    document.querySelectorAll('.remove-team-form').forEach(form => {
      form.onsubmit = async function(e) {
        e.preventDefault();
        const eventId = form.getAttribute('data-event');
        const teamIdx = form.getAttribute('data-team');
        const email = form.email.value;
        const res = await fetch(`/api/events/${eventId}/teams/${teamIdx}/remove`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        if (res.ok) loadGroup();
        else alert('Remove failed: ' + (await res.json()).error);
      };
    });
        const teamId = form.getAttribute('data-team');
        const name = form.name.value;
        const email = form.email.value;
        const res = await fetch(`/api/events/${eventId}/teams/${teamId}/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email })
        });
        if (res.ok) loadGroup();
        else alert('Signup failed: ' + (await res.json()).error);
      };
    });
    document.querySelectorAll('.remove-team-form').forEach(form => {
      form.onsubmit = async function(e) {
        e.preventDefault();
        const eventId = form.getAttribute('data-event');
        const teamId = form.getAttribute('data-team');
        const email = form.email.value;
        const res = await fetch(`/api/events/${eventId}/teams/${teamId}/remove`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        if (res.ok) loadGroup();
        else alert('Remove failed: ' + (await res.json()).error);
      };
    });
  } catch (err) {
    document.getElementById('groupHeader').innerHTML = '<p>Group not found.</p>';
  }
}

// Admin link

