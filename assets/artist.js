(function() { // IIFE : encapsule tout le script pour éviter de polluer le scope global
  const params = new URLSearchParams(window.location.search); // Analyse les paramètres de l'URL (?id=...)
  const id = params.get('id'); // Récupère la valeur du paramètre "id" dans l'URL
  if (!id) return document.getElementById('artist-name').textContent = 'Artiste non spécifié'; // Si aucun id n'est fourni, affiche un message et stoppe l'exécution
  const artistIdNum = parseInt(id, 10); // Convertit l'id en nombre pour comparer avec des IDs numériques

  // Initialiser la carte
  const map = L.map('artist-map', { // Crée une carte Leaflet attachée à l'élément DOM #artist-map
    minZoom: 2,    // plus petit zoom (ne pas voir tout le vide)
    maxZoom: 10,   // zoom max si tu veux limiter
    maxBounds: [   // limite la zone dans laquelle l'utilisateur peut déplacer la carte
      [-90, -180], // coin sud-ouest du globe (latitude, longitude)
      [90, 180]    // coin nord-est du globe (latitude, longitude)
    ],
    maxBoundsViscosity: 1.0   // empêche totalement de sortir des limites définies
  }).setView([20, 0], 2); // Positionne la vue initiale (centre + niveau de zoom)

  const neonMarker = L.divIcon({ // Crée une icône Leaflet personnalisée basée sur du HTML/CSS
    className: 'neon-marker', // Classe CSS utilisée pour le style du marker
    html: '<div class="dot"></div>', // Contenu HTML du marker (permet un effet néon via CSS)
    iconSize: [18, 18], // Taille totale de l'icône
    iconAnchor: [9, 9], // Point d'ancrage centré (moitié de la taille)
  });

  // Ajouter les tuiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { // Définit la source des tuiles OpenStreetMap
    attribution: '&copy; OpenStreetMap contributors' // Attribution légale obligatoire
  }).addTo(map); // Ajoute la couche de tuiles à la carte


  // Fonction pour créer les cartes de concerts
  function createConcertCard(locationName, dates) { // Génère dynamiquement une carte HTML pour un lieu de concert
    const card = document.createElement('div'); // Crée le conteneur principal de la carte
    card.className = 'concert-card'; // Applique la classe CSS de la carte

    const loc = document.createElement('div'); // Élément affichant le nom du lieu
    loc.className = 'concert-location'; // Classe CSS pour le style du lieu
    loc.textContent = locationName; // Injecte le nom du lieu dans le DOM

    const dateEl = document.createElement('div'); // Élément affichant les dates de concert
    dateEl.className = 'concert-dates'; // Classe CSS pour le style des dates
    dateEl.textContent = dates.length === 1 ? `Date : ${dates[0]}` : `Dates (${dates.length}) : ${dates.slice(0, 10).join(', ')}${dates.length > 10 ? '...' : ''}`; // Affiche une ou plusieurs dates avec limitation et ellipsis

    card.appendChild(loc); // Ajoute le bloc lieu à la carte
    card.appendChild(dateEl); // Ajoute le bloc dates à la carte
    return card; // Retourne la carte prête à être insérée dans le DOM
  }

  fetch('/api/artists') // Appel API pour récupérer la liste des artistes
    .then(r => r.ok ? r.json() : Promise.reject('Erreur réseau (artistes)')) // Vérifie la réponse HTTP avant parsing JSON
    .then(artistsData => { // Traite les données des artistes
      const artist = artistsData.find(a => (a.id || a.ID || a._id) == id || (a.id || a.ID || a._id) == artistIdNum); // Recherche l'artiste par id (string ou number)
      if (!artist) return document.getElementById('artist-name').textContent = 'Artiste non trouvé'; // Si aucun artiste trouvé, affiche un message

      // Affichage infos principales
      document.getElementById('artist-name').textContent = artist.name || artist.nom || 'Nom inconnu'; // Affiche le nom de l'artiste avec fallback
      if (artist.image) { // Vérifie si une image est disponible
        const img = document.getElementById('artist-image'); // Sélectionne l'élément image
        img.src = artist.image; // Définit la source de l'image
        img.alt = artist.name || 'Artiste'; // Définit le texte alternatif
      }
      document.getElementById('artist-creation-date').textContent = artist.creationDate || artist.creation_date || artist.begin_year || 'N/A'; // Affiche l'année de création avec compatibilité des champs
      document.getElementById('artist-first-album').textContent = artist.firstAlbum || artist.first_album || 'N/A'; // Affiche le premier album
      const membersEl = document.getElementById('artist-members'); // Récupère le conteneur des membres
      const members = Array.isArray(artist.members) ? artist.members.join(', ') : (artist.members || 'N/A'); // Normalise les membres en chaîne
      if(membersEl){ // Vérifie que l'élément existe dans le DOM
        const membersArray = Array.isArray(artist.members) ? artist.members : (artist.members || '').split(','); // Convertit les membres en tableau
        const html = `<strong>Membres :</strong> <div class="artist-members">` +
                    membersArray.map(m => `<span>${m.trim()}</span>`).join('') +
                    `</div>`; // Génère le HTML structuré pour les membres
        membersEl.innerHTML = html; // Injecte le HTML dans le DOM
      }

      // FETCH RELATIONS
      fetch('/api/relation') // Appel API pour récupérer les relations artistes/concerts
        .then(r => r.ok ? r.json() : Promise.reject('Erreur réseau (relations)')) // Vérifie et parse la réponse JSON
        .then(relData => { // Traite les données de relations
          const relations = relData.index || []; // Récupère le tableau de relations (ou tableau vide)
          const relation = relations.find(r => (r.id || 0) == artistIdNum || (r.id || 0) == id); // Trouve la relation correspondant à l'artiste
          const datesLocationsEl = document.getElementById('artist-dates-locations'); // Sélectionne le conteneur des concerts
          if (!relation || !relation.datesLocations) return datesLocationsEl.textContent = 'Aucune date de concert disponible'; // Aucun concert trouvé

          const datesLocations = relation.datesLocations; // Objet associant lieux → dates
          const locationKeys = Object.keys(datesLocations); // Liste des lieux
          if (locationKeys.length === 0) return datesLocationsEl.textContent = 'Aucune date de concert disponible'; // Aucun lieu disponible

          // Affichage cartes concerts
          datesLocationsEl.innerHTML = ''; // Vide le conteneur avant remplissage
          const markers = []; // Tableau des coordonnées pour ajuster la vue de la carte
          locationKeys.forEach(locationKey => { // Boucle sur chaque lieu de concert
            const locationName = (typeof window.formatLocationName === 'function') 
              ? window.formatLocationName(locationKey) 
              : locationKey.replace(/_/g,' '); // Formate le nom du lieu de manière lisible

            const dates = datesLocations[locationKey]; // Récupère les dates associées au lieu

            datesLocationsEl.appendChild(createConcertCard(locationName, dates)); // Ajoute la carte de concert au DOM

            // Géocodage pour Leaflet
            let geoPromise = fetch('/api/geocode?q=' + encodeURIComponent(locationName)) // Appel API de géocodage pour le lieu
              .then(rg => rg.ok ? rg.json() : []) // Parse la réponse ou retourne un tableau vide
              .then(arr => arr[0] ? { lat: +arr[0].lat, lon: +arr[0].lon } : null) // Extrait latitude et longitude si disponibles
              .catch(() => null); // Gère les erreurs de géocodage

            if (window.CITY_COORDS && locationKey in window.CITY_COORDS) { // Vérifie si des coordonnées statiques sont disponibles
              geoPromise = Promise.resolve(window.CITY_COORDS[locationKey]); // Priorise les coordonnées locales connues
            }

            geoPromise.then(coords => { // Traite les coordonnées finales
              if (!coords) return; // Ignore si aucune coordonnée valide

              const marker = L.marker(
                [coords.lat, coords.lon],
                { icon: neonMarker }
              )
              .addTo(map) // Ajoute le marker à la carte
              .bindPopup(` // Associe une popup HTML au marker
                <div class="map-popup">
                  <div class="map-popup-title">${locationName}</div>
                  <div class="map-popup-dates">
                    <span class="label">Dates :</span>
                    ${dates.slice(0, 5).join(', ')}${dates.length > 5 ? '...' : ''}
                  </div>
                </div>
              `);

              markers.push([coords.lat, coords.lon]); // Ajoute les coordonnées au tableau
              if (markers.length > 0) map.fitBounds(markers); // Ajuste automatiquement la vue pour inclure tous les markers
            });
          });
        })
        .catch(err => {
          console.error("Erreur chargement concerts :", err); // log réel de l'erreur
          document.getElementById('artist-dates-locations').textContent = 'Erreur lors du chargement des dates et lieux'; // Message utilisateur en cas d'erreur
        });
    })
    .catch(err => {
      document.getElementById('artist-name').textContent = 'Erreur: ' + err; // Affiche l'erreur principale côté utilisateur
      console.error(err); // Log technique de l'erreur
    });
})(); // Fin de l'IIFE
