document.addEventListener('DOMContentLoaded', () => {

  // Charger le cache des coordonnées de villes
  let cityCoords = {};
  fetch('/assets/city-coords.json')
    .then(r => r.json())
    .then(data => {
      cityCoords = data;
      console.log('City coords cache loaded:', Object.keys(cityCoords).length, 'cities');
    })
    .catch(err => console.warn('Could not load city coords cache:', err));

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

      // Charger les lieux via l'API relation
      fetch('/api/relation')
        .then(r => r.json())
        .then(relData => {
          // Gérer la structure de relation
          const relations = (relData.index && Array.isArray(relData.index)) ? relData.index : [];
          const relation = relations.find(r => r.id == id);
          
          console.log('Relation data:', relData);
          console.log('Current relation:', relation);
          
          if(!relation || !relation.datesLocations) {
            elLocations.textContent = "Aucun lieu répertorié";
            elLocations.style.display = "block";
            return;
          }

          // Extraire les lieux uniques
          const datesLocations = relation.datesLocations;
          const locationKeys = Object.keys(datesLocations);
          
          console.log('Location keys:', locationKeys);
          
          if(locationKeys.length === 0){
            elLocations.textContent = "Aucun lieu répertorié";
            elLocations.style.display = "block";
            return;
          }

          elLocations.style.display = "block";
          elLocations.textContent = `Lieux : ${locationKeys.length} lieu(x)`;

          // Géocodage et ajout des markers
          const geoPromises = locationKeys.map((locationKey, index) => {
            const [cityPart, countryPart] = (locationKey || '').split('-');
            const city = (cityPart || '').replace(/_/g,' ');
            const country = (countryPart || '').replace(/_/g,' ');
            const query = city + (country ? ', ' + country : '');
            
            console.log(`[${index}] Geocoding: "${query}" from key "${locationKey}"`);
            
            // Délai respectueux pour Nominatim
            return new Promise(resolve => {
              setTimeout(() => {
                fetch('/api/geocode?q=' + encodeURIComponent(query))
                  .then(res => {
                    console.log(`Response for "${query}":`, res.status);
                    return res.ok ? res.json() : [];
                  })
                  .then(arr => {
                    console.log(`Geocode result for "${query}":`, arr);
                    if (arr[0]) {
                      return { query, lat: +arr[0].lat, lon: +arr[0].lon };
                    }
                    return null;
                  })
                  .catch(err => {
                    console.error(`Error geocoding "${query}":`, err);
                    return null;
                  })
                  .then(result => {
                    // Essayer le cache avec la clé exacte
                    if(!result && cityCoords[locationKey]){
                      const c = cityCoords[locationKey];
                      console.log(`Using cached coords for "${locationKey}":`, c);
                      return resolve({ query, lat: c.lat, lon: c.lon });
                    }
                    // Essayer le cache avec juste le nom de ville
                    if(!result && cityCoords[city]){
                      const c = cityCoords[city];
                      console.log(`Using cached coords for city "${city}":`, c);
                      return resolve({ query, lat: c.lat, lon: c.lon });
                    }
                    console.log(`Final result for "${query}":`, result);
                    resolve(result);
                  });
              }, index * 500);
            });
          });

          Promise.all(geoPromises).then(results => {
            console.log('All geocode results:', results);
            const markers = [];
            results.forEach(r => {
              if(r && r.lat && r.lon){
                console.log(`Adding marker at [${r.lat}, ${r.lon}] for "${r.query}"`);
                L.marker([r.lat, r.lon]).addTo(map).bindPopup(r.query);
                markers.push([r.lat, r.lon]);
              }
            });
            console.log(`Total markers: ${markers.length}`);
            if(markers.length > 0) map.fitBounds(markers);
          });
        });

    });
});
