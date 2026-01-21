// Fetch /api/locations and render a simple list
(function(){
  const container = document.getElementById('locations-list');
  if(!container) return;

  fetch('/api/locations')
    .then(r => { if(!r.ok) throw new Error('Network error'); return r.json() })
    .then(data => {
      if(!Array.isArray(data)) { container.textContent = 'Unexpected response'; return }
      const ul = document.createElement('ul');
      data.forEach(loc => {
        const li = document.createElement('li');
        li.textContent = `${loc.venue || loc.name || 'Venue'} — ${loc.city || ''}, ${loc.country || ''}`;
        ul.appendChild(li);
      });
      container.innerHTML = ''; container.appendChild(ul);
    })
    .catch(err => { container.textContent = 'Failed to load locations: '+err.message });
})();
