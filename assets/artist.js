// Read ?id= from URL and display all artist details including relations
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

  // Parse ID as number for comparison with relations API
  const artistIdNum = parseInt(id, 10);

  // Fetch artist data
  fetch('/api/artists')
    .then(r => { if(!r.ok) throw new Error('Erreur réseau (artistes)'); return r.json() })
    .then(artistsData => {
      if(!Array.isArray(artistsData)){ 
        const el = document.getElementById('artist-name');
        if(el) el.textContent = 'Données inattendues';
        return;
      }
      
      const artist = artistsData.find(x => {
        const aid = x.id || x.ID || x._id || '';
        return aid == id || aid == artistIdNum;
      });
      
      if(!artist){ 
        const el = document.getElementById('artist-name');
        if(el) el.textContent = 'Artiste non trouvé';
        return;
      }

      // Display basic artist info
      const nameEl = document.getElementById('artist-name');
      if(nameEl) nameEl.textContent = artist.name || artist.nom || 'Nom inconnu';

      const imgEl = document.getElementById('artist-image');
      if(imgEl && artist.image) {
        imgEl.src = artist.image;
        imgEl.alt = artist.name || 'Artiste';
      }

      const creationDateEl = document.getElementById('artist-creation-date');
      if(creationDateEl) {
        const date = artist.creationDate || artist.creation_date || artist.begin_year || artist.firstAlbum;
        creationDateEl.textContent = date || 'N/A';
      }

      const firstAlbumEl = document.getElementById('artist-first-album');
      if(firstAlbumEl) {
        const album = artist.firstAlbum || artist.first_album || 'N/A';
        firstAlbumEl.textContent = album;
      }

      const countryEl = document.getElementById('artist-country');
      if(countryEl) {
        countryEl.textContent = artist.country || 'N/A';
      }

      const membersEl = document.getElementById('artist-members');
      if(membersEl){
        const members = Array.isArray(artist.members) ? artist.members.join(', ') : (artist.members || 'N/A');
        membersEl.innerHTML = '<strong style="color:#ffd24d">Membres :</strong> ' + members;
      }

      // Fetch and display relations (dates and locations)
      fetch('/api/relation')
        .then(r2 => { if(!r2.ok) throw new Error('Erreur réseau (relations)'); return r2.json() })
        .then(relData => {
          const relations = (relData.index && Array.isArray(relData.index)) ? relData.index : [];
          const relation = relations.find(r => (r.id || 0) == artistIdNum || (r.id || 0) == id);
          
          const datesLocationsEl = document.getElementById('artist-dates-locations');
          if(!relation || !relation.datesLocations) {
            if(datesLocationsEl) datesLocationsEl.textContent = 'Aucune date de concert disponible';
            return;
          }

          const datesLocations = relation.datesLocations;
          const locationKeys = Object.keys(datesLocations);
          
          if(locationKeys.length === 0) {
            if(datesLocationsEl) datesLocationsEl.textContent = 'Aucune date de concert disponible';
            return;
          }

          // Create list of dates and locations
          let html = '<div style="display:grid;gap:1rem">';
          locationKeys.forEach(locationKey => {
            const dates = datesLocations[locationKey];
            if(Array.isArray(dates) && dates.length > 0) {
              // Format location key: "city-country" -> "City, Country"
              const parts = locationKey.split('-');
              const city = (parts[0] || '').replace(/_/g, ' ');
              const country = (parts[1] || '').replace(/_/g, ' ');
              const locationName = country ? `${city}, ${country}` : city;

              html += '<div style="padding:0.75rem;background:rgba(255,255,255,0.02);border-radius:8px;border:1px solid rgba(255,255,255,0.05)">';
              html += `<div style="color:#ffd24d;font-weight:600;margin-bottom:0.5rem">${locationName}</div>`;
              html += `<div style="font-size:0.9rem">`;
              if(dates.length === 1) {
                html += `Date : ${dates[0]}`;
              } else {
                html += `<strong>Dates (${dates.length}) :</strong> ${dates.slice(0, 10).join(', ')}${dates.length > 10 ? '...' : ''}`;
              }
              html += '</div></div>';
            }
          });
          html += '</div>';
          
          if(datesLocationsEl) datesLocationsEl.innerHTML = html;

          // Initialize map with locations
          const mapEl = document.getElementById('artist-map');
          const locationsEl = document.getElementById('artist-locations');
          
          if(mapEl){
            if(locationsEl) locationsEl.style.display = 'none';
            
            let map;
            try { 
              map = L.map('artist-map'); 
            } catch (err) { 
              console.error('Leaflet error:', err);
              if(locationsEl) locationsEl.textContent = 'Lieux : impossible d\'initialiser la carte';
              return;
            }
            
            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);

            // Geocode locations from relations
            const geocodePromises = locationKeys.map(locationKey => {
              const parts = locationKey.split('-');
              const city = (parts[0] || '').replace(/_/g, ' ');
              const country = (parts[1] || '').replace(/_/g, ' ');
              const query = country ? `${city}, ${country}` : city;
              
              return fetch('/api/geocode?q=' + encodeURIComponent(query))
                .then(rg => { if(!rg.ok) throw new Error('geocode fail'); return rg.json() })
                .then(arr => ({ 
                  query, 
                  locationKey,
                  dates: datesLocations[locationKey],
                  result: Array.isArray(arr) && arr.length > 0 ? arr[0] : null 
                }))
                .catch(() => ({ query, locationKey, dates: datesLocations[locationKey], result: null }));
            });

            Promise.all(geocodePromises).then(results => {
              const markers = [];
              results.forEach(res => {
                if(res && res.result && res.result.lat && res.result.lon){
                  const lat = parseFloat(res.result.lat);
                  const lon = parseFloat(res.result.lon);
                  
                  // Create popup content with dates
                  const dates = Array.isArray(res.dates) ? res.dates : [];
                  const datesText = dates.length > 0 ? '<br/><strong>Dates:</strong> ' + dates.slice(0, 5).join(', ') + (dates.length > 5 ? '...' : '') : '';
                  const popupContent = `<strong>${res.query}</strong>${datesText}`;
                  
                  const m = L.marker([lat, lon])
                    .addTo(map)
                    .bindPopup(popupContent);
                  markers.push(m);
                }
              });
              
              if(markers.length === 0){
                if(locationsEl) {
                  locationsEl.style.display = 'block';
                  locationsEl.textContent = 'Lieux : pas de coordonnées trouvées';
                }
                return;
              }
              
              const group = L.featureGroup(markers);
              map.fitBounds(group.getBounds(), { padding: [50, 50] });
            })
            .catch(err2 => { 
              console.error('Map error:', err2);
              if(locationsEl) {
                locationsEl.style.display = 'block';
                locationsEl.textContent = 'Erreur chargement carte: ' + err2.message;
              }
            });
          }
        })
        .catch(err => {
          console.error('Relations error:', err);
          const datesLocationsEl = document.getElementById('artist-dates-locations');
          if(datesLocationsEl) datesLocationsEl.textContent = 'Erreur lors du chargement des dates et lieux';
        });
    })
    .catch(err => { 
      console.error('Artist error:', err);
      const el = document.getElementById('artist-name');
      if(el) el.textContent = 'Erreur: ' + err.message;
    });
})();
