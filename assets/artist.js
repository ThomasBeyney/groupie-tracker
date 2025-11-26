// Read ?id= from URL and display artist name (minimal detail page)
(function(){
  function getQueryParam(name){
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  const id = getQueryParam('id');
  const el = document.getElementById('artist-name');
  if(!el) return;
  if(!id){ el.textContent = 'Artiste non spécifié'; return }

  fetch('/api/artists')
    .then(r => { if(!r.ok) throw new Error('Erreur réseau'); return r.json() })
    .then(data => {
      if(!Array.isArray(data)){ el.textContent = 'Données inattendues'; return }
      const a = data.find(x => (x.id||x.ID||x._id||'')==id);
      if(!a){ el.textContent = 'Artiste non trouvé'; return }
      el.textContent = a.name || a.nom || 'Nom inconnu';
      // Show members if present
      const membersEl = document.getElementById('artist-members');
      if(membersEl){
        const members = Array.isArray(a.members) ? a.members.join(', ') : (a.members || 'N/A');
        membersEl.textContent = 'Membres : ' + members;
      }
      // Fetch locations index and display them on a Leaflet map for this artist
      const locationsEl = document.getElementById('artist-locations');
      const mapEl = document.getElementById('artist-map');
      if(mapEl){
        // show/hide fallback text
        if(locationsEl) locationsEl.style.display = 'none';
        // initialize map
        let map;
        try { map = L.map('artist-map'); } catch (err) { map = null; }
        if(map){
          // add tile layer
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
          }).addTo(map);

          // get the locations index and geocode each place via our server proxy
          fetch('/api/locations')
            .then(r2 => { if(!r2.ok) throw new Error('Erreur réseau (locations)'); return r2.json() })
            .then(locData => {
              const idx = Array.isArray(locData.index) ? locData.index : locData;
              const entry = (Array.isArray(idx) && idx.find(it => (it.id||'')==a.id)) || null;
              if(!entry || !Array.isArray(entry.locations) || entry.locations.length===0){
                if(locationsEl) locationsEl.textContent = 'Lieux : aucun lieu répertorié';
                return;
              }

              const geocodePromises = entry.locations.map(loc => {
                // turn 'city-country' into a readable query
                const parts = (loc||'').split('-');
                const city = (parts[0]||'').replace(/_/g,' ');
                const country = (parts[1]||'').replace(/_/g,' ');
                const query = country ? `${city}, ${country}` : city;
                return fetch('/api/geocode?q=' + encodeURIComponent(query))
                  .then(rg => { if(!rg.ok) throw new Error('geocode fail'); return rg.json() })
                  .then(arr => ({ query, result: Array.isArray(arr) && arr.length>0 ? arr[0] : null }))
                  .catch(() => ({ query, result: null }));
              });

              Promise.all(geocodePromises).then(results => {
                const markers = [];
                results.forEach(res => {
                  if(res && res.result && res.result.lat && res.result.lon){
                    const lat = parseFloat(res.result.lat);
                    const lon = parseFloat(res.result.lon);
                    const m = L.marker([lat, lon]).addTo(map).bindPopup(res.query + '<br/>' + (res.result.display_name||''));
                    markers.push(m);
                  }
                });
                if(markers.length===0){
                  if(locationsEl) locationsEl.textContent = 'Lieux : pas de coordonnées trouvées';
                  return;
                }
                const group = L.featureGroup(markers);
                map.fitBounds(group.getBounds(), { padding: [40,40] });
              });
            })
            .catch(err2 => { if(locationsEl) locationsEl.textContent = 'Erreur chargement lieux: '+err2.message });
        } else {
          if(locationsEl) locationsEl.textContent = 'Lieux : impossible d\'initialiser la carte';
        }
      }
    })
    .catch(err => { el.textContent = 'Erreur: '+err.message });
})();
