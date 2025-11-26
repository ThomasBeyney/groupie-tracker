// Fetch /api/relation and render a simple list
(function(){
  const container = document.getElementById('relation-list');
  if(!container) return;

  fetch('/api/relation')
    .then(r => { if(!r.ok) throw new Error('Network error'); return r.json() })
    .then(data => {
      if(!Array.isArray(data)) { container.textContent = 'Unexpected response'; return }
      const ul = document.createElement('ul');
      data.forEach(rel => {
        const li = document.createElement('li');
        li.textContent = `artist_id: ${rel.artist_id || 'N/A'} — date_id: ${rel.date_id || 'N/A'} — location_id: ${rel.location_id || 'N/A'}`;
        ul.appendChild(li);
      });
      container.innerHTML = ''; container.appendChild(ul);
    })
    .catch(err => { container.textContent = 'Failed to load relations: '+err.message });
})();
