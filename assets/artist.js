(function(){
  function getQueryParam(name){
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  const id = getQueryParam('id');

  const elName = document.getElementById('artist-name');
  const elMembers = document.getElementById('artist-members');
  const elCreation = document.getElementById('artist-creation');
  const elPhoto = document.getElementById('artist-photo');
  const elLocations = document.getElementById('artist-locations');
  const mapEl = document.getElementById('artist-map');

  if(!id){
    elName.textContent = 'Artiste non spécifié';
    return;
  }

  // 1) Charger les artistes pour trouver celui qui correspond
  fetch('/api/artists')
    .then(r => r.json())
    .then(data => {
      const artist = data.find(x => x.id == id);
      if(!artist){
        elName.textContent = 'Artiste non trouvé';
        return;
      }

      // Remplir les infos
      elName.textContent = artist.name;
      elPhoto.src = artist.image;

      elCreation.textContent = 'Création : ' + (artist.creationDate || 'N/A');

      // Membres (singulier/pluriel)
      if(Array.isArray(artist.members)){
        let count = artist.members.length;
        let label = count > 1 ? 'Membres' : 'Membre';
        elMembers.textContent = label + ' : ' + artist.members.join(', ');
      } else {
        elMembers.textContent = 'Membres : N/A';
      }

      // 2) Initialiser la carte Leaflet
      let map = L.map('artist-map');
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // 3) Charger toutes les locations
      fetch('/api/locations')
        .then(r2 => r2.json())
        .then(locData => {

          const idx = Array.isArray(locData.index) ? locData.index : locData;
          const entry = idx.find(l => l.id == artist.id);

          if(!entry || !entry.locations || entry.locations.length === 0){
            elLocations.textContent = "Aucun lieu répertorié";
            elLocations.style.display = "block";
            return;
          }

          // Convertir les lieux en coordonnées via "/api/geocode"
          const geocodePromises = entry.locations.map(loc => {
            const parts = loc.split('-');
            const city = parts[0].replace(/_/g, ' ');
            const country = parts[1]?.replace(/_/g, ' ') || '';
            const query = city + (country ? ', ' + country : '');

            return fetch('/api/geocode?q=' + encodeURIComponent(query))
              .then(r => r.json())
              .then(arr => ({ query, result: arr[0] || null }))
              .catch(() => ({ query, result: null }));
          });

          Promise.all(geocodePromises).then(results => {
            const markers = [];

            results.forEach(item => {
              if(item.result && item.result.lat && item.result.lon){
                const m = L.marker([item.result.lat, item.result.lon])
                  .addTo(map)
                  .bindPopup(item.query);
                markers.push(m);
              }
            });

            if(markers.length > 0){
              const group = L.featureGroup(markers);
              map.fitBounds(group.getBounds(), { padding: [30,30] });
            } else {
              elLocations.textContent = "Pas de coordonnées trouvées";
              elLocations.style.display = "block";
            }
          });
        });
    })
})();
