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
    html += `<hr><h3>Settings</h3><div id='settingsSection'></div>`;
    document.getElementById('groupAdminContent').innerHTML = html;
    await loadEventsAdmin(groupId, adminCode);
    await loadSubscribersAdmin(groupId, adminCode);
    await loadSettingsSection(groupId, adminCode);
    document.getElementById('createEventBtn').onclick = () => showCreateEventForm(groupId, adminCode);
  } catch (err) {
    document.getElementById('groupAdminContent').innerHTML = '<p>Group not found.</p>';
  }
}

async function loadEventsAdmin(groupId, adminCode) {
  const res = await fetch(`/api/events/group/${groupId}`);
  const events = await res.json();
  let html = '';
  for (const event of events) {
    html += `<div class='event-block'><b>${event.name}</b> (${new Date(event.date).toLocaleString()}) [${event.type}] <button onclick="deleteEvent('${event._id}','${adminCode}')">Delete</button><br>`;
    html += `<div>${event.description || ''}</div>`;
    if (event.type === 'teeTime') {
      html += `<button onclick="showTeeTimeAdmin('${event._id}','${adminCode}')">Manage Tee Times</button>`;
    } else if (event.type === 'team') {
      html += `<button onclick="showTeamAdmin('${event._id}','${adminCode}')">Manage Teams</button>`;
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

async function deleteEvent(eventId, adminCode) {
  if (!confirm('Delete this event?')) return;
  const res = await fetch(`/api/events/${eventId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminCode })
  });
  if (res.ok) loadGroupAdmin();
  else alert('Delete failed: ' + (await res.json()).error);
}

async function showTeeTimeAdmin(eventId, adminCode) {
  // Fetch event
  const res = await fetch(`/api/events/group/${getParams().groupId}`);
  const events = await res.json();
  const event = events.find(ev => ev._id === eventId);
  if (!event) return alert('Event not found');
  let html = `<h4>Tee Times</h4><ul>`;
  event.teeTimes.forEach((tt, idx) => {
    html += `<li>${tt.time} (${tt.slots.length}/${tt.maxPlayers}) <button onclick="movePlayerTeeTime('${eventId}',${idx},'${adminCode}')">Move Player</button></li>`;
  });
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
    // Add new tee time to event and update via PUT
    event.teeTimes.push({ time: form.time.value, maxPlayers: Number(form.maxPlayers.value), slots: [] });
    const res = await fetch(`/api/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminCode, teeTimes: event.teeTimes })
    });
    if (res.ok) showTeeTimeAdmin(eventId, adminCode);
    else document.getElementById('teeTimeError').textContent = (await res.json()).error;
  };
}

async function showTeamAdmin(eventId, adminCode) {
  // Fetch event
  const res = await fetch(`/api/events/group/${getParams().groupId}`);
  const events = await res.json();
  const event = events.find(ev => ev._id === eventId);
  if (!event) return alert('Event not found');
  let html = `<h4>Teams</h4><ul>`;
  event.teams.forEach((team, idx) => {
    html += `<li>${team.name} (${team.players.length}/${team.maxPlayers}) <button onclick="movePlayerTeam('${eventId}',${idx},'${adminCode}')">Move Player</button></li>`;
  });
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
    // Add new team to event and update via PUT
    event.teams.push({ name: form.name.value, maxPlayers: Number(form.maxPlayers.value), players: [] });
    const res = await fetch(`/api/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminCode, teams: event.teams })
    });
    if (res.ok) showTeamAdmin(eventId, adminCode);
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

async function loadSettingsSection(groupId, adminCode) {
  const section = document.getElementById('settingsSection');
  section.innerHTML = '<h3>Group Settings</h3><div>Loading...</div>';
  try {
    let settings = null;
    try {
      const res = await fetch(`/api/settings/${groupId}`);
      if (res.ok) settings = await res.json();
    } catch {}
    if (!settings) settings = { notificationsEnabled: true, weatherEnabled: false };
    section.innerHTML = `<form id='settingsForm'>
      <label><input type='checkbox' name='notificationsEnabled' ${settings.notificationsEnabled ? 'checked' : ''}> Enable Notifications</label><br>
      <label><input type='checkbox' name='weatherEnabled' ${settings.weatherEnabled ? 'checked' : ''}> Enable Weather</label><br>
      <button type='submit'>Save Settings</button>
      <span id='settingsMsg' style='margin-left:1em;color:green;'></span>
    </form>`;
    document.getElementById('settingsForm').onsubmit = async function(e) {
      e.preventDefault();
      const form = e.target;
      const body = {
        adminCode,
        notificationsEnabled: form.notificationsEnabled.checked,
        weatherEnabled: form.weatherEnabled.checked
      };
      const res = await fetch(`/api/settings/${groupId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        document.getElementById('settingsMsg').textContent = 'Saved!';
      } else {
        document.getElementById('settingsMsg').textContent = 'Error saving.';
      }
    };
  } catch {
    section.innerHTML = '<div>Error loading settings.</div>';
  }
}

// Patch loadGroupAdmin to call loadSettingsSection after rendering main content
const origLoadGroupAdmin = loadGroupAdmin;
window.loadGroupAdmin = async function() {
  await origLoadGroupAdmin();
  const { groupId, adminCode } = getParams();
  if (groupId && adminCode) loadSettingsSection(groupId, adminCode);
};

window.loadGroupAdmin = loadGroupAdmin;
window.showTeeTimeAdmin = showTeeTimeAdmin;
window.showTeamAdmin = showTeamAdmin;
