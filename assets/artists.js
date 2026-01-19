// Fetch /api/artists and render with tag-based filters
(async function(){
  const container = document.getElementById('artists-list');
  const searchInput = document.getElementById('artist-search');
  const applyBtn = document.getElementById('apply-filters');
  const clearBtn = document.getElementById('clear-filters');
  
  if(!container) return;

  let artistsData = [];
  let selectedFilters = {
    creation: new Set(),
    album: new Set(),
    members: new Set()
  };

  async function fetchData(){
    try {
      const artistsResp = await fetch('/api/artists');
      
      if(!artistsResp.ok) throw new Error('Erreur réseau');
      
      const artists = await artistsResp.json();
      
      if(!Array.isArray(artists)) { 
        container.innerHTML = '<div class="big-panel">Réponse inattendue</div>'; 
        return;
      }

      artistsData = artists;
      
      initFilters();
      renderList(artistsData);

    } catch(err){
      container.innerHTML = `<div class="big-panel">Échec du chargement : ${err.message}</div>`;
    }
  }

  function initFilters(){
    console.log('artistsData:', artistsData);
    
    // Creation years - essayer différentes propriétés
    const creationYears = [...new Set(artistsData.map(a => a.creationDate || a.begin_year || a.creation).filter(y => y))].sort((a,b) => a-b);
    console.log('creationYears:', creationYears);
    const creationContainer = document.getElementById('creation-filters');
    if(creationContainer){
      creationYears.forEach(year => {
        const tag = createFilterTag(year.toString(), () => toggleFilter('creation', year));
        creationContainer.appendChild(tag);
      });
    }

    // First album years
    const albumYears = [...new Set(
      artistsData
        .map(a => {
          const album = a.firstAlbum || a.first_album || a.firstAlbumDate;
          if(!album) return null;
          // Extraire l'année (peut être DD-MM-YYYY ou YYYY-MM-DD)
          if(typeof album === 'string'){
            const parts = album.split('-');
            // Si le premier segment a 4 chiffres, c'est l'année (format YYYY-MM-DD)
            if(parts[0] && parts[0].length === 4){
              return parts[0];
            }
            // Sinon, l'année est le dernier segment (format DD-MM-YYYY)
            if(parts[2] && parts[2].length === 4){
              return parts[2];
            }
            // Sinon utiliser le dernier élément
            return parts[parts.length - 1];
          }
          return album;
        })
        .filter(y => y)
    )].sort((a,b) => parseInt(a) - parseInt(b));
    console.log('albumYears:', albumYears);
    const albumContainer = document.getElementById('album-filters');
    if(albumContainer){
      albumYears.forEach(year => {
        const tag = createFilterTag(year, () => toggleFilter('album', year));
        albumContainer.appendChild(tag);
      });
    }

    // Number of members
    const memberCounts = [...new Set(
      artistsData
        .map(a => Array.isArray(a.members) ? a.members.length : 0)
        .filter(c => c > 0)
    )].sort((a,b) => a-b);
    console.log('memberCounts:', memberCounts);
    const membersContainer = document.getElementById('members-filters');
    if(membersContainer){
      memberCounts.forEach(count => {
        const label = count + ' membre' + (count > 1 ? 's' : '');
        const tag = createFilterTag(label, () => toggleFilter('members', count));
        membersContainer.appendChild(tag);
      });
    }

  }

  function createFilterTag(text, onClick){
    const tag = document.createElement('button');
    tag.className = 'filter-tag';
    tag.textContent = text;
    tag.onclick = function(){
      this.classList.toggle('active');
      onClick();
    };
    return tag;
  }

  function toggleFilter(type, value){
    if(selectedFilters[type].has(value)){
      selectedFilters[type].delete(value);
    } else {
      selectedFilters[type].add(value);
    }
  }

  function applyFilters(){
    let filtered = [...artistsData];

    // Filter by creation year
    if(selectedFilters.creation.size > 0){
      filtered = filtered.filter(a => {
        const year = a.creationDate || a.begin_year || a.creation;
        return selectedFilters.creation.has(year);
      });
    }

    // Filter by first album year
    if(selectedFilters.album.size > 0){
      filtered = filtered.filter(a => {
        const album = a.firstAlbum || a.first_album || a.firstAlbumDate;
        if(!album) return false;
        let year = album;
        if(typeof album === 'string' && album.includes('-')){
          const parts = album.split('-');
          // Si le premier segment a 4 chiffres, c'est l'année (format YYYY-MM-DD)
          if(parts[0] && parts[0].length === 4){
            year = parts[0];
          }
          // Sinon, l'année est le dernier segment (format DD-MM-YYYY)
          else if(parts[2] && parts[2].length === 4){
            year = parts[2];
          }
          else {
            year = parts[parts.length - 1];
          }
        }
        return selectedFilters.album.has(year);
      });
    }

    // Filter by members count
    if(selectedFilters.members.size > 0){
      filtered = filtered.filter(a => {
        const count = Array.isArray(a.members) ? a.members.length : 0;
        return selectedFilters.members.has(count);
      });
    }

    // Apply search
    const query = searchInput.value.toLowerCase().trim();
    if(query){
      filtered = filtered.filter(a => {
        if((a.name||'').toLowerCase().includes(query)) return true;
        if(Array.isArray(a.members) && a.members.join(' ').toLowerCase().includes(query)) return true;
        return false;
      });
    }

    renderList(filtered);
  }

  function clearFilters(){
    selectedFilters = {
      creation: new Set(),
      album: new Set(),
      members: new Set()
    };
    document.querySelectorAll('.filter-tag').forEach(tag => tag.classList.remove('active'));
    searchInput.value = '';
    renderList(artistsData);
  }

  function renderList(items){
    if(!Array.isArray(items)){
      container.innerHTML = '<div class="big-panel">Réponse inattendue</div>';
      return;
    }

    if(items.length === 0){
      container.innerHTML = '<div class="big-panel">Aucun artiste trouvé.</div>';
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

      const yearDiv = document.createElement('div');
      yearDiv.className = 'card-meta';
      const creationYear = artist.creationDate || artist.begin_year || artist.creation || 'N/A';
      yearDiv.innerHTML = `<strong>Début :</strong> ${creationYear}`;

      const albumDiv = document.createElement('div');
      albumDiv.className = 'card-meta';
      const firstAlbum = artist.firstAlbum || artist.first_album || artist.firstAlbumDate || 'N/A';
      albumDiv.innerHTML = `<strong>1er album :</strong> ${firstAlbum}`;

      const members = document.createElement('div');
      members.className = 'card-meta';
      let count = Array.isArray(artist.members) ? artist.members.length : 0;
      let label = count <= 1 ? 'Membre' : 'Membres';

      members.innerHTML = `<strong>${label} :</strong> ${
        Array.isArray(artist.members) ? artist.members.join(', ') : (artist.members || 'N/A')
      }`;

      body.appendChild(title);
      body.appendChild(yearDiv);
      body.appendChild(albumDiv);
      body.appendChild(members);

      card.appendChild(img);
      card.appendChild(body);
      link.appendChild(card);
      list.appendChild(link);
    });

    container.innerHTML = '';
    container.appendChild(list);
  }

  function debounce(fn, wait){ 
    let t; 
    return function(...args){ 
      clearTimeout(t); 
      t = setTimeout(()=>fn.apply(this,args), wait); 
    } 
  }

  fetchData();

  if(applyBtn) applyBtn.addEventListener('click', applyFilters);
  if(clearBtn) clearBtn.addEventListener('click', clearFilters);
  if(searchInput){
    const handler = debounce(() => applyFilters(), 180);
    searchInput.addEventListener('input', handler);
  }
})();
