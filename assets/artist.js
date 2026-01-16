(function() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) return document.getElementById('artist-name').textContent = 'Artiste non spécifié';
  const artistIdNum = parseInt(id, 10);

  const map = L.map('artist-map').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Fonction pour créer les cartes de concerts
  function createConcertCard(locationName, dates) {
    const card = document.createElement('div');
    card.className = 'concert-card';

    const loc = document.createElement('div');
    loc.className = 'concert-location';
    loc.textContent = locationName;

    const dateEl = document.createElement('div');
    dateEl.className = 'concert-dates';
    dateEl.textContent = dates.length === 1 ? `Date : ${dates[0]}` : `Dates (${dates.length}) : ${dates.slice(0, 10).join(', ')}${dates.length > 10 ? '...' : ''}`;

    card.appendChild(loc);
    card.appendChild(dateEl);
    return card;
  }

  fetch('/api/artists')
    .then(r => r.ok ? r.json() : Promise.reject('Erreur réseau (artistes)'))
    .then(artistsData => {
      const artist = artistsData.find(a => (a.id || a.ID || a._id) == id || (a.id || a.ID || a._id) == artistIdNum);
      if (!artist) return document.getElementById('artist-name').textContent = 'Artiste non trouvé';

      // Affichage infos principales
      document.getElementById('artist-name').textContent = artist.name || artist.nom || 'Nom inconnu';
      if (artist.image) {
        const img = document.getElementById('artist-image');
        img.src = artist.image;
        img.alt = artist.name || 'Artiste';
      }
      document.getElementById('artist-creation-date').textContent = artist.creationDate || artist.creation_date || artist.begin_year || 'N/A';
      document.getElementById('artist-first-album').textContent = artist.firstAlbum || artist.first_album || 'N/A';
      document.getElementById('artist-country').textContent = artist.country || 'N/A';
      const membersEl = document.getElementById('artist-members');
      const members = Array.isArray(artist.members) ? artist.members.join(', ') : (artist.members || 'N/A');
      membersEl.innerHTML = `<strong>Membres :</strong> ${members}`;

      // FETCH RELATIONS
      fetch('/api/relation')
        .then(r => r.ok ? r.json() : Promise.reject('Erreur réseau (relations)'))
        .then(relData => {
          const relations = relData.index || [];
          const relation = relations.find(r => (r.id || 0) == artistIdNum || (r.id || 0) == id);
          const datesLocationsEl = document.getElementById('artist-dates-locations');
          if (!relation || !relation.datesLocations) return datesLocationsEl.textContent = 'Aucune date de concert disponible';

          const datesLocations = relation.datesLocations;
          const locationKeys = Object.keys(datesLocations);
          if (locationKeys.length === 0) return datesLocationsEl.textContent = 'Aucune date de concert disponible';

          // Affichage cartes concerts
          datesLocationsEl.innerHTML = '';
          const markers = [];
          locationKeys.forEach(locationKey => {
            const parts = locationKey.split('-');
            const city = (parts[0] || '').replace(/_/g, ' ');
            const country = (parts[1] || '').replace(/_/g, ' ');
            const locationName = country ? `${city}, ${country}` : city;
            const dates = datesLocations[locationKey];

            datesLocationsEl.appendChild(createConcertCard(locationName, dates));

            // Géocodage pour Leaflet
            let geoPromise = fetch('/api/geocode?q=' + encodeURIComponent(locationName))
              .then(rg => rg.ok ? rg.json() : [])
              .then(arr => arr[0] ? { lat: +arr[0].lat, lon: +arr[0].lon } : null)
              .catch(() => null);

            if (window.CITY_COORDS && locationKey in window.CITY_COORDS) {
              geoPromise = Promise.resolve(window.CITY_COORDS[locationKey]);
            }

            geoPromise.then(coords => {
              if (!coords) return;
              const marker = L.marker([coords.lat, coords.lon]).addTo(map)
                .bindPopup(`<strong>${locationName}</strong><br/><strong>Dates:</strong> ${dates.slice(0,5).join(', ')}${dates.length > 5 ? '...' : ''}`);
              markers.push([coords.lat, coords.lon]);
              if (markers.length > 0) map.fitBounds(markers);
            });
          });
        })
        .catch(() => document.getElementById('artist-dates-locations').textContent = 'Erreur lors du chargement des dates et lieux');
    })
    .catch(err => {
      document.getElementById('artist-name').textContent = 'Erreur: ' + err;
      console.error(err);
    });
})();
