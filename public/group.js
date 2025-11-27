// Parse groupId from URL
function getGroupId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('groupId');
}

async function loadGroup() {
  const groupId = getGroupId();
  if (!groupId) {
    document.getElementById('groupHeader').innerHTML = '<p>Missing group ID.</p>';
    return;
  }
  try {
    const res = await fetch(`/api/groups/${groupId}`);
    if (!res.ok) throw new Error('Group not found');
    const group = await res.json();
    let html = `<h1>${group.name}</h1>`;
    if (group.logoUrl) html += `<img src="${group.logoUrl}" alt="Logo" style="max-width:120px;display:block;margin:1em 0;">`;
    html += `<p>${group.description || ''}</p>`;
    document.getElementById('groupHeader').innerHTML = html;
    // Fetch and render events for this group
    const eventsRes = await fetch(`/api/events/group/${groupId}`);
    const events = await eventsRes.json();
    if (!Array.isArray(events) || events.length === 0) {
      document.getElementById('eventsSection').innerHTML = '<em>No upcoming events.</em>';
      return;
    }
    let eventsHtml = '';
    for (const event of events) {
      eventsHtml += `<div class="event-block"><h3>${event.name} <span style='font-size:0.8em;font-weight:normal;'>(${new Date(event.date).toLocaleString()})</span></h3>`;
      eventsHtml += `<div>${event.type === 'teeTime' ? 'Tee Time Event' : 'Team Event'}</div>`;
      if (event.description) eventsHtml += `<div>${event.description}</div>`;
      if (event.type === 'teeTime') {
        // Tee times
        const teeTimesRes = await fetch(`/api/events/${event._id}/teetimes`);
        const teeTimes = await teeTimesRes.json();
        eventsHtml += '<ul>';
        for (const tt of teeTimes) {
          eventsHtml += `<li><b>${tt.time}</b> (${tt.players.length}/${tt.maxPlayers})`;
          eventsHtml += '<ul>';
          for (const p of tt.players) {
            eventsHtml += `<li>${p.name} (${p.email})</li>`;
          }
          eventsHtml += '</ul>';
          if (tt.players.length < tt.maxPlayers) {
            eventsHtml += `<form class='signup-form' data-event='${event._id}' data-tt='${tt._id}'>
              <input type='text' name='name' placeholder='Your Name' required>
              <input type='email' name='email' placeholder='Your Email' required>
              <button type='submit'>Sign Up</button>
            </form>`;
          }
          eventsHtml += `<form class='remove-form' data-event='${event._id}' data-tt='${tt._id}'>
            <input type='email' name='email' placeholder='Your Email' required>
            <button type='submit'>Remove Me</button>
          </form>`;
          eventsHtml += '</li>';
        }
        eventsHtml += '</ul>';
      } else if (event.type === 'team') {
        // Teams
        const teamsRes = await fetch(`/api/events/${event._id}/teams`);
        const teams = await teamsRes.json();
        eventsHtml += '<ul>';
        for (const team of teams) {
          eventsHtml += `<li><b>${team.name}</b> (${team.players.length}/${team.maxPlayers})`;
          eventsHtml += '<ul>';
          for (const p of team.players) {
            eventsHtml += `<li>${p.name} (${p.email})</li>`;
          }
          eventsHtml += '</ul>';
          if (team.players.length < team.maxPlayers) {
            eventsHtml += `<form class='signup-team-form' data-event='${event._id}' data-team='${team._id}'>
              <input type='text' name='name' placeholder='Your Name' required>
              <input type='email' name='email' placeholder='Your Email' required>
              <button type='submit'>Join Team</button>
            </form>`;
          }
          eventsHtml += `<form class='remove-team-form' data-event='${event._id}' data-team='${team._id}'>
            <input type='email' name='email' placeholder='Your Email' required>
            <button type='submit'>Remove Me</button>
          </form>`;
          eventsHtml += '</li>';
        }
        eventsHtml += '</ul>';
      }
      eventsHtml += '</div><hr>';
    }
    document.getElementById('eventsSection').innerHTML = eventsHtml;
    // Attach signup/remove handlers
    document.querySelectorAll('.signup-form').forEach(form => {
      form.onsubmit = async function(e) {
        e.preventDefault();
        const eventId = form.getAttribute('data-event');
        const ttId = form.getAttribute('data-tt');
        const name = form.name.value;
        const email = form.email.value;
        const res = await fetch(`/api/events/${eventId}/teetimes/${ttId}/signup`, {
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
        const ttId = form.getAttribute('data-tt');
        const email = form.email.value;
        const res = await fetch(`/api/events/${eventId}/teetimes/${ttId}/remove`, {
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
window.addEventListener('DOMContentLoaded', () => {
  loadGroup();
  document.getElementById('adminLink').onclick = function(e) {
    e.preventDefault();
    const groupId = getGroupId();
    const code = prompt('Enter group admin code:');
    if (code && groupId) {
      window.location.href = `/group-admin.html?groupId=${groupId}&adminCode=${encodeURIComponent(code)}`;
    }
  };
});
