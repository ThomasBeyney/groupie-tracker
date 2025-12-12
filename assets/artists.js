// Fetch /api/artists and render a French-styled card list with a debounced search
(async function(){
  const container = document.getElementById('artists-list');
  const searchInput = document.getElementById('artist-search');
  if(!container) return;

  let artistsData = [];

  async function fetchArtists(){
    try {
      const resp = await fetch('/api/artists');
      if(!resp.ok) throw new Error('Erreur réseau');
      const data = await resp.json();
      if(!Array.isArray(data)) { 
        container.innerHTML = '<div class="big-panel">Réponse inattendue</div>'; 
        return;
      }

      artistsData = data;  // Pas de country donc on garde la liste telle quelle
      renderList(artistsData);

    } catch(err){
      container.innerHTML = `<div class="big-panel">Échec du chargement des artistes : ${err.message}</div>`;
    }
  }

  function renderList(items){
    if(!Array.isArray(items)){
      container.innerHTML = '<div class="big-panel">Réponse inattendue</div>';
      return;
    }

    const list = document.createElement('div');
    list.style.display = 'grid';
    list.style.gridTemplateColumns = 'repeat(auto-fit,minmax(320px,1fr))';
    list.style.gap = '1rem';

    items.forEach(artist => {
      const card = document.createElement('div');
      card.className = 'card';

      const id = artist.id || '';
      const link = document.createElement('a');
      link.href = '/artist?id=' + encodeURIComponent(id);
      link.style.textDecoration = 'none';
      link.style.color = 'inherit';

      const img = document.createElement('img');
      img.src = artist.image || '/assets/images/placeholder.svg';
      img.alt = artist.name || 'artiste';
      img.width = 120; img.height = 120;

      const body = document.createElement('div');
      body.className = 'card-body';

      const title = document.createElement('h4');
      title.className = 'card-title';
      title.textContent = artist.name || 'Nom inconnu';

      // ⚠️ La ligne "Pays :" a été retirée
      const meta = document.createElement('div');
      meta.className = 'card-meta';
      meta.innerHTML = `<strong>Début :</strong> ${artist.creationDate || 'N/A'}`;

      const members = document.createElement('div');
      members.className = 'card-meta';
      let count = Array.isArray(artist.members) ? artist.members.length : 0;
      let label = count <= 1 ? 'Membre' : 'Membres';

      members.innerHTML = `<strong>${label} :</strong> ${
        Array.isArray(artist.members) ? artist.members.join(', ') : (artist.members || 'N/A')
      }`;

      body.appendChild(title);
      body.appendChild(meta);
      body.appendChild(members);

      card.appendChild(img);
      card.appendChild(body);
      link.appendChild(card);
      list.appendChild(link);
    });

    container.innerHTML = '';
    container.appendChild(list);
  }

  function filterAndRender(q){
    if(!q) return renderList(artistsData);
    const ql = q.toLowerCase();
    const filtered = artistsData.filter(a => {
      if((a.name||'').toLowerCase().includes(ql)) return true;
      if(Array.isArray(a.members) && a.members.join(' ').toLowerCase().includes(ql)) return true;
      return false;
    });
    renderList(filtered);
  }

  function debounce(fn, wait){ 
    let t; 
    return function(...args){ 
      clearTimeout(t); 
      t = setTimeout(()=>fn.apply(this,args), wait); 
    } 
  }

  fetchArtists();

  if(searchInput){
    const handler = debounce(function(e){ filterAndRender(e.target.value); }, 180);
    searchInput.addEventListener('input', handler);
  }
})();
