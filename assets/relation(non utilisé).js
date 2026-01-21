// Fetch /api/relation and render relations with dates and locations
(function(){
  const container = document.getElementById('relation-list');
  if(!container) {
    console.error('Container #relation-list not found');
    return;
  }

  fetch('/api/relation')
    .then(r => { 
      if(!r.ok) {
        throw new Error(`Erreur HTTP: ${r.status} ${r.statusText}`); 
      }
      return r.json();
    })
    .then(data => {
      console.log('API response:', data);
      
      // Handle the API format: { "index": [...] }
      const relations = (data.index && Array.isArray(data.index)) ? data.index : (Array.isArray(data) ? data : []);
      
      console.log('Parsed relations:', relations);
      console.log('Number of relations:', relations.length);
      
      if(relations.length === 0) {
        container.innerHTML = '<div class="big-panel">Aucune relation trouvée</div>';
        return;
      }

      const list = document.createElement('div');
      list.style.display = 'grid';
      list.style.gridTemplateColumns = 'repeat(auto-fit, minmax(320px, 1fr))';
      list.style.gap = '1rem';

      relations.forEach(rel => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.flexDirection = 'column';
        card.style.alignItems = 'flex-start';

        const title = document.createElement('h4');
        title.className = 'card-title';
        title.textContent = `Artiste ID: ${rel.id || 'N/A'}`;

        const body = document.createElement('div');
        body.className = 'card-body';
        body.style.width = '100%';

        // Parse datesLocations object
        const datesLocations = rel.datesLocations || {};
        const locationKeys = Object.keys(datesLocations);
        
        if(locationKeys.length === 0) {
          const emptyMsg = document.createElement('p');
          emptyMsg.className = 'card-meta';
          emptyMsg.textContent = 'Aucune date/location disponible';
          body.appendChild(emptyMsg);
        } else {
          locationKeys.forEach(locationKey => {
            const dates = datesLocations[locationKey];
            if(Array.isArray(dates) && dates.length > 0) {
              // Format location key: "city-country" -> "City, Country"
              const parts = locationKey.split('-');
              const city = (parts[0] || '').replace(/_/g, ' ');
              const country = (parts[1] || '').replace(/_/g, ' ');
              const locationName = country ? `${city}, ${country}` : city;

              const locationDiv = document.createElement('div');
              locationDiv.style.marginBottom = '0.75rem';
              locationDiv.style.paddingBottom = '0.75rem';
              locationDiv.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

              const locationTitle = document.createElement('strong');
              locationTitle.style.color = '#ffd24d';
              locationTitle.textContent = locationName;

              const datesList = document.createElement('div');
              datesList.className = 'card-meta';
              datesList.style.marginTop = '0.35rem';
              datesList.style.fontSize = '0.9rem';
              
              if(dates.length === 1) {
                datesList.textContent = `Date: ${dates[0]}`;
              } else {
                datesList.innerHTML = `<strong>Dates (${dates.length}):</strong> ${dates.slice(0, 5).join(', ')}${dates.length > 5 ? '...' : ''}`;
              }

              locationDiv.appendChild(locationTitle);
              locationDiv.appendChild(datesList);
              body.appendChild(locationDiv);
            }
          });
        }

        card.appendChild(title);
        card.appendChild(body);
        list.appendChild(card);
      });

      container.innerHTML = '';
      container.appendChild(list);
      console.log('Relations rendered successfully');
    })
    .catch(err => { 
      console.error('Error loading relations:', err);
      container.innerHTML = `<div class="big-panel">Échec du chargement des relations : ${err.message}<br><small>Ouvrez la console du navigateur (F12) pour plus de détails.</small></div>`; 
    });
})();