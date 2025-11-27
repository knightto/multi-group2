// Parse groupId and adminCode from URL
function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    groupId: params.get('groupId'),
    adminCode: params.get('adminCode')
  };
}


async function loadGroupAdmin() {
  const { groupId, adminCode } = getParams();
  if (!groupId || !adminCode) {
    document.getElementById('groupAdminContent').innerHTML = '<p>Missing group ID or admin code.</p>';
    return;
  }
  try {
    const res = await fetch(`/api/groups/${groupId}`);
    if (!res.ok) throw new Error('Group not found');
    const group = await res.json();
    let html = `<h2>${group.name}</h2>`;
    if (group.logoUrl) html += `<img src="${group.logoUrl}" alt="Logo" style="max-width:120px;display:block;margin:1em 0;">`;
    html += `<p>${group.description || ''}</p>`;
    html += `<p>Template: ${group.template}</p>`;
    html += `<hr><h3>Events</h3><div id='eventsAdmin'></div>`;
    html += `<button id='createEventBtn'>Create Event</button>`;
    html += `<hr><h3>Subscribers</h3><div id='subscribersAdmin'></div>`;
    document.getElementById('groupAdminContent').innerHTML = html;
    await loadEventsAdmin(groupId, adminCode);
    await loadSubscribersAdmin(groupId, adminCode);
    document.getElementById('createEventBtn').onclick = () => showCreateEventForm(groupId, adminCode);
  } catch (err) {
    document.getElementById('groupAdminContent').innerHTML = '<p>Group not found.</p>';
  }
}

async function loadEventsAdmin(groupId, adminCode) {
  const res = await fetch(`/api/group-admin/${groupId}/events?adminCode=${encodeURIComponent(adminCode)}`);
  const events = await res.json();
  let html = '';
  for (const event of events) {
    html += `<div class='event-block'><b>${event.name}</b> (${new Date(event.date).toLocaleString()}) [${event.type}] <button onclick="deleteEvent('${groupId}','${event._id}','${adminCode}')">Delete</button><br>`;
    html += `<div>${event.description || ''}</div>`;
    if (event.type === 'teeTime') {
      html += `<button onclick="showTeeTimeAdmin('${groupId}','${event._id}','${adminCode}')">Manage Tee Times</button>`;
    } else if (event.type === 'team') {
      html += `<button onclick="showTeamAdmin('${groupId}','${event._id}','${adminCode}')">Manage Teams</button>`;
    }
    html += '</div><hr>';
  }
  document.getElementById('eventsAdmin').innerHTML = html;
}

function showCreateEventForm(groupId, adminCode) {
  document.getElementById('eventsAdmin').innerHTML = `
    <h4>Create Event</h4>
    <form id='createEventForm'>
      <input name='name' placeholder='Event Name' required><br>
      <input name='date' type='datetime-local' required><br>
      <select name='type'>
        <option value='teeTime'>Tee Time</option>
        <option value='team'>Team</option>
      </select><br>
      <input name='description' placeholder='Description'><br>
      <input name='maxPlayers' type='number' placeholder='Max Players (tee time)'><br>
      <input name='teamSize' type='number' placeholder='Team Size (team)'><br>
      <input name='startType' placeholder='Start Type'><br>
      <button type='submit'>Create</button>
      <button type='button' onclick='loadGroupAdmin()'>Cancel</button>
    </form>
    <div id='eventFormError' class='error'></div>
  `;
  document.getElementById('createEventForm').onsubmit = async function(e) {
    e.preventDefault();
    const form = e.target;
    const body = {
      adminCode,
      name: form.name.value,
      date: form.date.value,
      type: form.type.value,
      description: form.description.value,
      maxPlayers: form.maxPlayers.value,
      teamSize: form.teamSize.value,
      startType: form.startType.value
    };
    const res = await fetch(`/api/events/group/${groupId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (res.ok) loadGroupAdmin();
    else document.getElementById('eventFormError').textContent = (await res.json()).error;
  };
}

async function deleteEvent(groupId, eventId, adminCode) {
  if (!confirm('Delete this event?')) return;
  const res = await fetch(`/api/group-admin/${groupId}/events/${eventId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminCode })
  });
  if (res.ok) loadGroupAdmin();
  else alert('Delete failed: ' + (await res.json()).error);
}

async function showTeeTimeAdmin(groupId, eventId, adminCode) {
  // Fetch tee times
  const res = await fetch(`/api/events/${eventId}/teetimes`);
  const teeTimes = await res.json();
  let html = `<h4>Tee Times</h4><ul>`;
  for (const tt of teeTimes) {
    html += `<li>${tt.time} (${tt.players.length}/${tt.maxPlayers}) <button onclick="movePlayerTeeTime('${groupId}','${eventId}','${tt._id}','${adminCode}')">Move Player</button></li>`;
  }
  html += '</ul>';
  html += `<form id='addTeeTimeForm'>
    <input name='time' placeholder='HH:MM' required>
    <input name='maxPlayers' type='number' placeholder='Max Players' required>
    <button type='submit'>Add Tee Time</button>
    <button type='button' onclick='loadGroupAdmin()'>Back</button>
  </form><div id='teeTimeError' class='error'></div>`;
  document.getElementById('eventsAdmin').innerHTML = html;
  document.getElementById('addTeeTimeForm').onsubmit = async function(e) {
    e.preventDefault();
    const form = e.target;
    const teeTimes = [{ time: form.time.value, maxPlayers: form.maxPlayers.value }];
    const res = await fetch(`/api/group-admin/${groupId}/events/${eventId}/teetimes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminCode, teeTimes })
    });
    if (res.ok) showTeeTimeAdmin(groupId, eventId, adminCode);
    else document.getElementById('teeTimeError').textContent = (await res.json()).error;
  };
}

async function showTeamAdmin(groupId, eventId, adminCode) {
  // Fetch teams
  const res = await fetch(`/api/events/${eventId}/teams`);
  const teams = await res.json();
  let html = `<h4>Teams</h4><ul>`;
  for (const team of teams) {
    html += `<li>${team.name} (${team.players.length}/${team.maxPlayers}) <button onclick="movePlayerTeam('${groupId}','${eventId}','${team._id}','${adminCode}')">Move Player</button></li>`;
  }
  html += '</ul>';
  html += `<form id='addTeamForm'>
    <input name='name' placeholder='Team Name' required>
    <input name='maxPlayers' type='number' placeholder='Max Players' required>
    <button type='submit'>Add Team</button>
    <button type='button' onclick='loadGroupAdmin()'>Back</button>
  </form><div id='teamError' class='error'></div>`;
  document.getElementById('eventsAdmin').innerHTML = html;
  document.getElementById('addTeamForm').onsubmit = async function(e) {
    e.preventDefault();
    const form = e.target;
    const teams = [{ name: form.name.value, maxPlayers: form.maxPlayers.value }];
    const res = await fetch(`/api/group-admin/${groupId}/events/${eventId}/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminCode, teams })
    });
    if (res.ok) showTeamAdmin(groupId, eventId, adminCode);
    else document.getElementById('teamError').textContent = (await res.json()).error;
  };
}

// Move player between tee times (simple modal)
function movePlayerTeeTime(groupId, eventId, fromTeeTimeId, adminCode) {
  const email = prompt('Player email to move:');
  const toTeeTimeId = prompt('Destination Tee Time ID:');
  if (!email || !toTeeTimeId) return;
  fetch(`/api/group-admin/${groupId}/events/${eventId}/teetimes/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminCode, playerEmail: email, fromTeeTimeId, toTeeTimeId })
  }).then(res => {
    if (res.ok) showTeeTimeAdmin(groupId, eventId, adminCode);
    else res.json().then(data => alert('Move failed: ' + data.error));
  });
}

// Move player between teams (simple modal)
function movePlayerTeam(groupId, eventId, fromTeamId, adminCode) {
  const email = prompt('Player email to move:');
  const toTeamId = prompt('Destination Team ID:');
  if (!email || !toTeamId) return;
  fetch(`/api/group-admin/${groupId}/events/${eventId}/teams/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminCode, playerEmail: email, fromTeamId, toTeamId })
  }).then(res => {
    if (res.ok) showTeamAdmin(groupId, eventId, adminCode);
    else res.json().then(data => alert('Move failed: ' + data.error));
  });
}

// --- Subscriber Management ---
async function loadSubscribersAdmin(groupId, adminCode) {
  const res = await fetch(`/api/group-admin/${groupId}/subscribers?adminCode=${encodeURIComponent(adminCode)}`);
  const subs = await res.json();
  let html = '<ul>';
  for (const s of subs) {
    html += `<li>${s.name || ''} (${s.email}) <button onclick="removeSubscriber('${groupId}','${s._id}','${adminCode}')">Remove</button></li>`;
  }
  html += '</ul>';
  document.getElementById('subscribersAdmin').innerHTML = html;
}

async function removeSubscriber(groupId, subscriberId, adminCode) {
  if (!confirm('Remove this subscriber?')) return;
  const res = await fetch(`/api/group-admin/${groupId}/subscribers/${subscriberId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminCode })
  });
  if (res.ok) loadGroupAdmin();
  else alert('Remove failed: ' + (await res.json()).error);
}

window.loadGroupAdmin = loadGroupAdmin;
window.showTeeTimeAdmin = showTeeTimeAdmin;
window.showTeamAdmin = showTeamAdmin;
