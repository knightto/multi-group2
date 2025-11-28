    let eventsHtml = '';
    for (const event of events) {
      eventsHtml += `<div class="event-block"><h3>${event.name} <span style='font-size:0.8em;font-weight:normal;'>(${new Date(event.date).toLocaleString()})</span></h3>`;
      eventsHtml += `<div>${event.type === 'teeTime' ? 'Tee Time Event' : 'Team Event'}</div>`;
      if (event.description) eventsHtml += `<div>${event.description}</div>`;
      if (event.type === 'teeTime' && Array.isArray(event.teeTimes)) {
        eventsHtml += '<ul>';
        event.teeTimes.forEach((tt, idx) => {
          eventsHtml += `<li><b>${tt.time}</b> (${tt.slots.length}/${tt.maxPlayers})`;
          eventsHtml += '<ul>';
          tt.slots.forEach(p => {
            eventsHtml += `<li>${p.name} (${p.email})</li>`;
          });
          eventsHtml += '</ul>';
          if (tt.slots.length < tt.maxPlayers) {
            eventsHtml += `<form class='signup-form' data-event='${event._id}' data-tt='${idx}'>
              <input type='text' name='name' placeholder='Your Name' required>
              <input type='email' name='email' placeholder='Your Email' required>
              <button type='submit'>Sign Up</button>
            </form>`;
          }
          eventsHtml += `<form class='remove-form' data-event='${event._id}' data-tt='${idx}'>
            <input type='email' name='email' placeholder='Your Email' required>
            <button type='submit'>Remove Me</button>
          </form>`;
          eventsHtml += '</li>';
        });
        eventsHtml += '</ul>';
      } else if (event.type === 'team' && Array.isArray(event.teams)) {
        eventsHtml += '<ul>';
        event.teams.forEach((team, idx) => {
          eventsHtml += `<li><b>${team.name}</b> (${team.players.length}/${team.maxPlayers})`;
          eventsHtml += '<ul>';
          team.players.forEach(p => {
            eventsHtml += `<li>${p.name} (${p.email})</li>`;
          });
          eventsHtml += '</ul>';
          if (team.players.length < team.maxPlayers) {
            eventsHtml += `<form class='signup-team-form' data-event='${event._id}' data-team='${idx}'>
              <input type='text' name='name' placeholder='Your Name' required>
              <input type='email' name='email' placeholder='Your Email' required>
              <button type='submit'>Join Team</button>
            </form>`;
          }
          eventsHtml += `<form class='remove-team-form' data-event='${event._id}' data-team='${idx}'>
            <input type='email' name='email' placeholder='Your Email' required>
            <button type='submit'>Remove Me</button>
          </form>`;
          eventsHtml += '</li>';
        });
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
