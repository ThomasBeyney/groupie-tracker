document.addEventListener('DOMContentLoaded', () => {

  function getQueryParam(name){
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  const id = getQueryParam('id');

  const elName = document.getElementById('artist-name');
  const elFirstAlbum = document.getElementById('artist-first-album');
  const elMembers = document.getElementById('artist-members');
  const elCreation = document.getElementById('artist-creation');
  const elPhoto = document.getElementById('artist-photo');
  const elLocations = document.getElementById('artist-locations');

  if(!id){
    elName.textContent = 'Artiste non spécifié';
    return;
  }

  // Charger l'artiste
  fetch('/api/artists')
    .then(res => res.json())
    .then(data => {
      const artist = data.find(a => a.id == id);
      if(!artist){
        elName.textContent = 'Artiste non trouvé';
        return;
      }

      // Infos principales
      elName.textContent = artist.name;
      elPhoto.src = artist.image;
      elCreation.textContent = 'Création : ' + (artist.creationDate || 'N/A');
      elFirstAlbum.textContent = 'Premier album : ' + (artist.firstAlbum || 'N/A');

      // Membres
      if(Array.isArray(artist.members)){
        const label = artist.members.length > 1 ? 'Membres' : 'Membre';
        elMembers.textContent = `${label} : ${artist.members.join(', ')}`;
      } else {
        elMembers.textContent = 'Membres : N/A';
      }

      // Initialiser la carte
      const map = L.map('artist-map').setView([20,0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Charger les lieux
      fetch('/api/locations')
        .then(r => r.json())
        .then(locData => {
          const idx = Array.isArray(locData.index) ? locData.index : locData;
          const entry = idx.find(l => l.id == artist.id);

          if(!entry || !entry.locations || entry.locations.length === 0){
            elLocations.textContent = "Aucun lieu répertorié";
            elLocations.style.display = "block";
            return;
          }

          elLocations.style.display = "block";
          elLocations.textContent = `Lieux : ${entry.locations.join(', ')}`;

          // Géocodage et ajout des markers
          const geoPromises = entry.locations.map(loc => {
            const [cityPart, countryPart] = (loc || '').split('-');
            const city = (cityPart || '').replace(/_/g,' ');
            const country = (countryPart || '').replace(/_/g,' ');
            const query = city + (country ? ', ' + country : '');
            return fetch('/api/geocode?q=' + encodeURIComponent(query))
              .then(res => res.ok ? res.json() : [])
              .then(arr => arr[0] ? { query, lat: +arr[0].lat, lon: +arr[0].lon } : null)
              .catch(() => null)
              .then(result => {
                if(!result && window.CITY_COORDS && loc in window.CITY_COORDS){
                  const c = window.CITY_COORDS[loc];
                  return { query, lat: c.lat, lon: c.lon };
                }
                return result;
              });
          });

          Promise.all(geoPromises).then(results => {
            const markers = [];
            results.forEach(r => {
              if(r && r.lat && r.lon){
                L.marker([r.lat, r.lon]).addTo(map).bindPopup(r.query);
                markers.push([r.lat, r.lon]);
              }
            });
            if(markers.length > 0) map.fitBounds(markers);
          });
        });

    });
});
