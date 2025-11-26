// Fetch /api/dates and render a simple list
(function(){
  const container = document.getElementById('dates-list');
  if(!container) return;

  fetch('/api/dates')
    .then(r => { if(!r.ok) throw new Error('Network error'); return r.json() })
    .then(data => {
      if(!Array.isArray(data)) { container.textContent = 'Unexpected response'; return }
      const ul = document.createElement('ul');
      data.forEach(d => {
        const li = document.createElement('li');
        li.textContent = `${d.date || 'N/A'} — artist: ${d.artist_id || d.artist || 'N/A'} — type: ${d.type || ''}`;
        ul.appendChild(li);
      });
      container.innerHTML = ''; container.appendChild(ul);
    })
    .catch(err => { container.textContent = 'Failed to load dates: '+err.message });
})();
