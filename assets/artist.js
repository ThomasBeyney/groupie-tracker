(function(){
  function getQueryParam(name){
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  const id = getQueryParam('id');
  if(!id){ 
    const el = document.getElementById('artist-name');
    if(el) el.textContent = 'Artiste non spécifié';
    return;
  }

  const artistIdNum = parseInt(id, 10);

  fetch('/api/artists')
    .then(r => { if(!r.ok) throw new Error('Erreur réseau (artistes)'); return r.json() })
    .then(artistsData => {
      if(!Array.isArray(artistsData)){
        document.getElementById('artist-name').textContent = 'Données inattendues';
        return;
      }

      const artist = artistsData.find(x => (x.id || x.ID || x._id) == id || (x.id || x.ID || x._id) == artistIdNum);
      if(!artist){
        document.getElementById('artist-name').textContent = 'Artiste non trouvé';
        return;
      }

      // Infos principales
      const nameEl = document.getElementById('artist-name');
      const imgEl = document.getElementById('artist-image');
      const creationDateEl = document.getElementById('artist-creation-date');
      const firstAlbumEl = document.getElementById('artist-first-album');
      const countryEl = document.getElementById('artist-country');
      const membersEl = document.getElementById('artist-members');

      if(nameEl) nameEl.textContent = artist.name || artist.nom || 'Nom inconnu';
      if(imgEl && artist.image){ imgEl.src = artist.image; imgEl.alt = artist.name || 'Artiste'; }
      if(creationDateEl) creationDateEl.textContent = artist.creationDate || artist.creation_date || artist.begin_year || 'N/A';
      if(firstAlbumEl) firstAlbumEl.textContent = artist.firstAlbum || artist.first_album || 'N/A';
      if(countryEl) countryEl.textContent = artist.country || 'N/A';
      if(membersEl){
        const members = Array.isArray(artist.members) ? artist.members.join(', ') : (artist.members || 'N/A');
        membersEl.innerHTML = '<strong style="color:#ffd24d">Membres :</strong> ' + members;
      }

      const map = L.map('artist-map').setView([20,0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      const datesLocationsEl = document.getElementById('artist-dates-locations');
      const locationsEl = document.getElementById('artist-locations');
      if(locationsEl) locationsEl.style.display = 'none';

      fetch('/api/relation')
        .then(r => { if(!r.ok) throw new Error('Erreur réseau (relations)'); return r.json() })
        .then(relData => {
          const relations = (relData.index && Array.isArray(relData.index)) ? relData.index : [];
          const relation = relations.find(r => (r.id || 0) == artistIdNum || (r.id || 0) == id);

          if(!relation || !relation.datesLocations){
            if(datesLocationsEl) datesLocationsEl.textContent = 'Aucune date de concert disponible';
            return;
          }

          const datesLocations = relation.datesLocations;
          const locationKeys = Object.keys(datesLocations);
          if(locationKeys.length === 0){
            if(datesLocationsEl) datesLocationsEl.textContent = 'Aucune date de concert disponible';
            return;
          }

          // Affichage des dates et lieux
          let html = '<div style="display:grid;gap:1rem">';
          locationKeys.forEach(locationKey => {
            const dates = datesLocations[locationKey];
            if(Array.isArray(dates) && dates.length > 0){
              const parts = locationKey.split('-');
              const city = (parts[0] || '').replace(/_/g,' ');
              const country = (parts[1] || '').replace(/_/g,' ');
              const locationName = country ? `${city}, ${country}` : city;

              html += `<div style="padding:0.75rem;background:rgba(255,255,255,0.02);border-radius:8px;border:1px solid rgba(255,255,255,0.05)">`;
              html += `<div style="color:#ffd24d;font-weight:600;margin-bottom:0.5rem">${locationName}</div>`;
              html += `<div style="font-size:0.9rem">`;
              html += dates.length === 1 ? `Date : ${dates[0]}` : `<strong>Dates (${dates.length}) :</strong> ${dates.slice(0,10).join(', ')}${dates.length>10?'...':''}`;
              html += `</div></div>`;
            }
          });
          html += '</div>';
          if(datesLocationsEl) datesLocationsEl.innerHTML = html;

          // --- Partie carte qui marche ---
          const geoPromises = locationKeys.map(locationKey => {
            const parts = locationKey.split('-');
            const city = (parts[0] || '').replace(/_/g,' ');
            const country = (parts[1] || '').replace(/_/g,' ');
            const query = country ? `${city}, ${country}` : city;

            return fetch('/api/geocode?q=' + encodeURIComponent(query))
              .then(rg => rg.ok ? rg.json() : [])
              .then(arr => arr[0] ? { query, lat: +arr[0].lat, lon: +arr[0].lon, dates: datesLocations[locationKey] } : null)
              .catch(() => null)
              .then(result => {
                if(!result && window.CITY_COORDS && locationKey in window.CITY_COORDS){
                  const c = window.CITY_COORDS[locationKey];
                  return { query, lat: c.lat, lon: c.lon, dates: datesLocations[locationKey] };
                }
                return result;
              });
          });

          Promise.all(geoPromises).then(results => {
            const markers = [];
            results.forEach(r => {
              if(r && r.lat && r.lon){
                const datesText = r.dates.length ? '<br/><strong>Dates:</strong> ' + r.dates.slice(0,5).join(', ') + (r.dates.length>5?'...':'') : '';
                L.marker([r.lat,r.lon]).addTo(map).bindPopup(`<strong>${r.query}</strong>${datesText}`);
                markers.push([r.lat,r.lon]);
              }
            });
            if(markers.length > 0) map.fitBounds(markers);
          });
          // --- fin de la partie carte ---
        })
        .catch(() => {
          if(datesLocationsEl) datesLocationsEl.textContent = 'Erreur lors du chargement des dates et lieux';
        });

    })
    .catch(err => {
      document.getElementById('artist-name').textContent = 'Erreur: ' + err.message;
      console.error('Artist error:', err);
    });

})();
