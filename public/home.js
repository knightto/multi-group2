document.getElementById('accessForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const code = document.getElementById('accessCode').value.trim().toUpperCase();
  const errorDiv = document.getElementById('error');
  errorDiv.textContent = '';
  if (!code) return;
  try {
    const res = await fetch('/api/groups/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode: code })
    });
    const data = await res.json();
    if (res.ok && data.groupId) {
      window.location.href = `/group.html?groupId=${data.groupId}`;
    } else {
      errorDiv.textContent = data.error || 'Invalid access code.';
    }
  } catch (err) {
    errorDiv.textContent = 'Server error. Please try again.';
  }
});
