let adminCode = '';

function showError(msg) {
  document.getElementById('adminError').textContent = msg;
}

async function loadGroups() {
  const res = await fetch(`/api/groups?adminCode=${encodeURIComponent(adminCode)}`);
  const data = await res.json();
  if (!res.ok) {
    showError(data.error || 'Failed to load groups');
    return;
  }
  let html = `<h2>Groups</h2><table><tr><th>Logo</th><th>Name</th><th>Template</th><th>Created</th><th>Active</th><th>Admin Access Code</th><th>Actions</th></tr>`;
  for (const g of data) {
    html += `<tr>
      <td>${g.logoUrl ? `<img src="${g.logoUrl}" alt="logo" style="max-width:48px;max-height:48px;border-radius:6px;">` : ''}</td>
      <td>${g.name}</td>
      <td>${g.template}</td>
      <td>${new Date(g.createdAt).toLocaleDateString()}</td>
      <td>${g.isActive ? 'Yes' : 'No'}</td>
      <td><code>${g.accessCode || ''}</code></td>
      <td><button onclick="editGroup('${g._id}')">Edit</button></td>
    </tr>`;
  }
  html += '</table>';
  html += `<button onclick="showCreateGroup()">Create New Group</button>`;
  document.getElementById('adminContent').innerHTML = html;
}

function showCreateGroup() {
  document.getElementById('adminContent').innerHTML = `
    <h2>Create Group</h2>
    <form id="createGroupForm">
      <input name="name" placeholder="Name" required><br>
      <input name="description" placeholder="Description"><br>
      <select name="template">
        <option value="golf">Golf</option>
        <option value="default">Default</option>
        <option value="social">Social</option>
      </select><br>
      <input name="logoUrl" placeholder="Logo URL (or upload below)"><br>
      <input type="file" id="logoFileInput" accept="image/*" style="margin-bottom:1em;"><br>
      <button type="submit">Create</button>
      <button type="button" onclick="loadGroups()">Cancel</button>
    </form>
    <div id="formError" class="error"></div>
  `;
  document.getElementById('createGroupForm').onsubmit = async function(e) {
    e.preventDefault();
    const form = e.target;
    let logoUrl = form.logoUrl.value;
    const fileInput = document.getElementById('logoFileInput');
    if (fileInput && fileInput.files && fileInput.files[0]) {
      const fileData = new FormData();
      fileData.append('logo', fileInput.files[0]);
      const uploadRes = await fetch('/api/upload-logo', {
        method: 'POST',
        body: fileData
      });
      const uploadJson = await uploadRes.json();
      if (uploadRes.ok && uploadJson.url) {
        logoUrl = uploadJson.url;
      } else {
        document.getElementById('formError').textContent = uploadJson.error || 'Logo upload failed';
        return;
      }
    }
    const body = {
      adminCode,
      name: form.name.value,
      description: form.description.value,
      template: form.template.value,
      logoUrl
    };
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) {
      loadGroups();
    } else {
      // Show specific error for duplicate group name or access code
      if (res.status === 409 && data.error) {
        document.getElementById('formError').textContent = data.error;
      } else {
        document.getElementById('formError').textContent = data.error || 'Error creating group';
      }
    }
  };
}


async function editGroup(id) {
  // Fetch group details
  const res = await fetch(`/api/groups/${id}`);
  if (!res.ok) return alert('Group not found');
  const group = await res.json();
  document.getElementById('adminContent').innerHTML = `
    <h2>Edit Group</h2>
    <form id='editGroupForm'>
      <input name='name' value='${group.name}' required><br>
      <input name='description' value='${group.description || ''}'><br>
      <select name='template'>
        <option value='golf' ${group.template === 'golf' ? 'selected' : ''}>Golf</option>
        <option value='default' ${group.template === 'default' ? 'selected' : ''}>Default</option>
        <option value='social' ${group.template === 'social' ? 'selected' : ''}>Social</option>
      </select><br>
      <input name='logoUrl' value='${group.logoUrl || ''}'><br>
      <label><input type='checkbox' name='isActive' ${group.isActive ? 'checked' : ''}> Active</label><br>
      <button type='submit'>Save</button>
      <button type='button' onclick='loadGroups()'>Cancel</button>
    </form>
    <button id='deleteGroupBtn'>Delete Group</button>
    <div id='editFormError' class='error'></div>
  `;
  document.getElementById('editGroupForm').onsubmit = async function(e) {
    e.preventDefault();
    const form = e.target;
    const body = {
      adminCode,
      name: form.name.value,
      description: form.description.value,
      template: form.template.value,
      logoUrl: form.logoUrl.value,
      isActive: form.isActive.checked
    };
    const res = await fetch(`/api/groups/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (res.ok) loadGroups();
    else document.getElementById('editFormError').textContent = (await res.json()).error;
  };
  document.getElementById('deleteGroupBtn').onclick = async function() {
    if (!confirm('Delete this group?')) return;
    const res = await fetch(`/api/groups/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminCode })
    });
    if (res.ok) loadGroups();
    else alert('Delete failed: ' + (await res.json()).error);
  };
}

// --- Global Settings ---
async function loadGlobalSettings() {
  const res = await fetch(`/api/global-settings?adminCode=${encodeURIComponent(adminCode)}`);
  if (!res.ok) return;
  const settings = await res.json();
  let html = `<h2>Global Settings</h2>
    <form id='globalSettingsForm'>
      <label><input type='checkbox' name='notificationsEnabled' ${settings.notificationsEnabled ? 'checked' : ''}> Notifications Enabled</label><br>
      <input name='defaultReminderTime' type='number' value='${settings.defaultReminderTime}' min='1' max='168'> Default Reminder Time (hours before event)<br>
      <button type='submit'>Save</button>
    </form>
    <button onclick='loadGroups()'>Back to Groups</button>
    <div id='globalSettingsError' class='error'></div>`;
  document.getElementById('adminContent').innerHTML = html;
  document.getElementById('globalSettingsForm').onsubmit = async function(e) {
    e.preventDefault();
    const form = e.target;
    const body = {
      adminCode,
      notificationsEnabled: form.notificationsEnabled.checked,
      defaultReminderTime: form.defaultReminderTime.value
    };
    const res = await fetch('/api/global-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (res.ok) loadGroups();
    else document.getElementById('globalSettingsError').textContent = (await res.json()).error;
  };
}

// Add global settings button to group list
const origLoadGroups = loadGroups;
loadGroups = async function() {
  await origLoadGroups();
  const btn = document.createElement('button');
  btn.textContent = 'Global Settings';
  btn.onclick = function() {
    console.log('[Admin] Global Settings button clicked');
    loadGlobalSettings();
  };
  document.getElementById('adminContent').appendChild(btn);
};

// Add logging to loadGlobalSettings
async function loadGlobalSettings() {
  console.log('[Admin] loadGlobalSettings called');
  const res = await fetch(`/api/global-settings?adminCode=${encodeURIComponent(adminCode)}`);
  if (!res.ok) return;
  const settings = await res.json();
  let html = `<h2>Global Settings</h2>
    <form id='globalSettingsForm'>
      <label><input type='checkbox' name='notificationsEnabled' ${settings.notificationsEnabled ? 'checked' : ''}> Notifications Enabled</label><br>
      <input name='defaultReminderTime' type='number' value='${settings.defaultReminderTime}' min='1' max='168'> Default Reminder Time (hours before event)<br>
      <button type='submit'>Save</button>
    </form>
    <button onclick='loadGroups()'>Back to Groups</button>
    <div id='globalSettingsError' class='error'></div>`;
  document.getElementById('adminContent').innerHTML = html;
  document.getElementById('globalSettingsForm').onsubmit = async function(e) {
    e.preventDefault();
    const form = e.target;
    const body = {
      adminCode,
      notificationsEnabled: form.notificationsEnabled.checked,
      defaultReminderTime: form.defaultReminderTime.value
    };
    const res = await fetch('/api/global-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (res.ok) loadGroups();
    else document.getElementById('globalSettingsError').textContent = (await res.json()).error;
  };
}

document.getElementById('adminLoginBtn').onclick = function() {
  adminCode = document.getElementById('adminCodeInput').value;
  if (!adminCode) return showError('Enter admin code');
  document.getElementById('adminError').textContent = '';
  document.getElementById('adminAuth').style.display = 'none';
  document.getElementById('adminContent').style.display = '';
  loadGroups();
};
