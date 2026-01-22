// Fetch /api/artists and render with tag-based filters
(async function(){ // IIFE asynchrone pour encapsuler le code et permettre l'usage de await
  const container = document.getElementById('artists-list'); // Conteneur principal où la liste des artistes sera rendue
  const searchInput = document.getElementById('artist-search'); // Champ de recherche textuelle pour filtrer les artistes
  const applyBtn = document.getElementById('apply-filters'); // Bouton pour appliquer manuellement les filtres
  const clearBtn = document.getElementById('clear-filters'); // Bouton pour réinitialiser tous les filtres
  
  if(!container) return; // Stoppe le script si le conteneur principal n'existe pas dans le DOM

  let artistsData = []; // Stocke les données complètes des artistes récupérées depuis l'API
  let selectedFilters = { // Objet contenant les filtres actifs, organisés par type
    creation: new Set(), // Années de création sélectionnées
    album: new Set(), // Années de premier album sélectionnées
    members: new Set() // Nombre de membres sélectionné
  };

  async function fetchData(){ // Fonction responsable du chargement initial des données
    try {
      const artistsResp = await fetch('/api/artists'); // Requête HTTP vers l'API des artistes
      
      if(!artistsResp.ok) throw new Error('Erreur réseau'); // Déclenche une erreur si la réponse HTTP n'est pas valide
      
      const artists = await artistsResp.json(); // Parse la réponse JSON
      
      if(!Array.isArray(artists)) {  // Vérifie que la réponse est bien un tableau
        container.innerHTML = '<div class="big-panel">Réponse inattendue</div>'; // Message d'erreur utilisateur
        return; // Stoppe le traitement
      }

      artistsData = artists; // Stocke les données pour un usage ultérieur (filtres, recherche)
      
      initFilters(); // Initialise dynamiquement les filtres à partir des données
      renderList(artistsData); // Affiche la liste complète des artistes au chargement

    } catch(err){
      container.innerHTML = `<div class="big-panel">Échec du chargement : ${err.message}</div>`; // Affiche une erreur lisible en cas d'échec
    }
  }

  function initFilters(){ // Initialise les tags de filtres à partir des données artistes
    console.log('artistsData:', artistsData); // Log debug des données brutes
    
    // Creation years - essayer différentes propriétés
    const creationYears = [...new Set(artistsData.map(a => a.creationDate || a.begin_year || a.creation).filter(y => y))].sort((a,b) => a-b); // Extrait, déduplique et trie les années de création
    console.log('creationYears:', creationYears); // Log debug des années de création
    const creationContainer = document.getElementById('creation-filters'); // Conteneur DOM des filtres de création
    if(creationContainer){ // Vérifie l'existence du conteneur
      creationYears.forEach(year => { // Crée un tag par année
        const tag = createFilterTag(year.toString(), () => toggleFilter('creation', year)); // Tag cliquable qui toggle le filtre
        creationContainer.appendChild(tag); // Ajoute le tag au DOM
      });
    }

    // First album years
    const albumYears = [...new Set( // Déduplique les années de premier album
      artistsData
        .map(a => { // Transforme chaque artiste en année de premier album
          const album = a.firstAlbum || a.first_album || a.firstAlbumDate; // Gère les variations de nom de propriété
          if(!album) return null; // Ignore les artistes sans album
          // Extraire l'année (peut être DD-MM-YYYY ou YYYY-MM-DD)
          if(typeof album === 'string'){ // Vérifie que la date est une chaîne
            const parts = album.split('-'); // Découpe la date par tirets
            // Si le premier segment a 4 chiffres, c'est l'année (format YYYY-MM-DD)
            if(parts[0] && parts[0].length === 4){
              return parts[0]; // Retourne l'année
            }
            // Sinon, l'année est le dernier segment (format DD-MM-YYYY)
            if(parts[2] && parts[2].length === 4){
              return parts[2]; // Retourne l'année
            }
            // Sinon utiliser le dernier élément
            return parts[parts.length - 1]; // Fallback générique
          }
          return album; // Retourne directement si déjà un nombre
        })
        .filter(y => y) // Supprime les valeurs nulles ou invalides
    )].sort((a,b) => parseInt(a) - parseInt(b)); // Trie les années numériquement
    console.log('albumYears:', albumYears); // Log debug des années d'album
    const albumContainer = document.getElementById('album-filters'); // Conteneur DOM des filtres d'album
    if(albumContainer){ // Vérifie l'existence du conteneur
      albumYears.forEach(year => { // Crée un tag par année
        const tag = createFilterTag(year, () => toggleFilter('album', year)); // Tag cliquable lié au filtre album
        albumContainer.appendChild(tag); // Ajoute le tag au DOM
      });
    }

    // Number of members
    const memberCounts = [...new Set( // Déduplique les nombres de membres
      artistsData
        .map(a => Array.isArray(a.members) ? a.members.length : 0) // Calcule le nombre de membres par artiste
        .filter(c => c > 0) // Ignore les valeurs invalides ou nulles
    )].sort((a,b) => a-b); // Trie par nombre croissant
    console.log('memberCounts:', memberCounts); // Log debug des nombres de membres
    const membersContainer = document.getElementById('members-filters'); // Conteneur DOM des filtres de membres
    if(membersContainer){ // Vérifie l'existence du conteneur
      memberCounts.forEach(count => { // Crée un tag par nombre de membres
        const label = count + ' membre' + (count > 1 ? 's' : ''); // Génère un label grammaticalement correct
        const tag = createFilterTag(label, () => toggleFilter('members', count)); // Tag cliquable lié au filtre membres
        membersContainer.appendChild(tag); // Ajoute le tag au DOM
      });
    }

  }

  function createFilterTag(text, onClick){ // Crée un bouton de filtre réutilisable
    const tag = document.createElement('button'); // Élément bouton
    tag.className = 'filter-tag'; // Classe CSS du tag
    tag.textContent = text; // Texte affiché sur le tag
    tag.onclick = function(){ // Gestionnaire de clic
      this.classList.toggle('active'); // Active/désactive visuellement le tag
      onClick(); // Met à jour l'état du filtre correspondant
    };
    return tag; // Retourne le tag prêt à être inséré
  }

  function toggleFilter(type, value){ // Ajoute ou retire une valeur d'un filtre
    if(selectedFilters[type].has(value)){ // Vérifie si la valeur est déjà sélectionnée
      selectedFilters[type].delete(value); // Supprime la valeur du filtre
    } else {
      selectedFilters[type].add(value); // Ajoute la valeur au filtre
    }
  }

  function applyFilters(){ // Applique tous les filtres actifs à la liste
    let filtered = [...artistsData]; // Clone les données originales

    // Filter by creation year
    if(selectedFilters.creation.size > 0){ // Vérifie si au moins un filtre est actif
      filtered = filtered.filter(a => { // Filtre les artistes
        const year = a.creationDate || a.begin_year || a.creation; // Récupère l'année de création
        return selectedFilters.creation.has(year); // Vérifie l'appartenance au filtre
      });
    }

    // Filter by first album year
    if(selectedFilters.album.size > 0){ // Vérifie si un filtre album est actif
      filtered = filtered.filter(a => { // Filtre les artistes
        const album = a.firstAlbum || a.first_album || a.firstAlbumDate; // Récupère la date du premier album
        if(!album) return false; // Exclut si aucune date
        let year = album; // Initialise l'année
        if(typeof album === 'string' && album.includes('-')){ // Si format texte avec séparateurs
          const parts = album.split('-'); // Découpe la date
          // Si le premier segment a 4 chiffres, c'est l'année (format YYYY-MM-DD)
          if(parts[0] && parts[0].length === 4){
            year = parts[0]; // Année au début
          }
          // Sinon, l'année est le dernier segment (format DD-MM-YYYY)
          else if(parts[2] && parts[2].length === 4){
            year = parts[2]; // Année à la fin
          }
          else {
            year = parts[parts.length - 1]; // Fallback générique
          }
        }
        return selectedFilters.album.has(year); // Vérifie si l'année est sélectionnée
      });
    }

    // Filter by members count
    if(selectedFilters.members.size > 0){ // Vérifie si un filtre membres est actif
      filtered = filtered.filter(a => { // Filtre les artistes
        const count = Array.isArray(a.members) ? a.members.length : 0; // Calcule le nombre de membres
        return selectedFilters.members.has(count); // Vérifie l'appartenance au filtre
      });
    }

    // Apply search
    const query = searchInput.value.toLowerCase().trim(); // Récupère et normalise la recherche texte
    if(query){ // Applique la recherche seulement si non vide
      filtered = filtered.filter(a => { // Filtre les artistes
        if((a.name||'').toLowerCase().includes(query)) return true; // Recherche dans le nom
        if(Array.isArray(a.members) && a.members.join(' ').toLowerCase().includes(query)) return true; // Recherche dans les membres
        return false; // Sinon exclu
      });
    }

    renderList(filtered); // Met à jour l'affichage avec la liste filtrée
  }

  function clearFilters(){ // Réinitialise tous les filtres et la recherche
    selectedFilters = { // Réinitialise l'état interne des filtres
      creation: new Set(),
      album: new Set(),
      members: new Set()
    };
    document.querySelectorAll('.filter-tag').forEach(tag => tag.classList.remove('active')); // Désactive visuellement tous les tags
    searchInput.value = ''; // Vide le champ de recherche
    renderList(artistsData); // Réaffiche la liste complète
  }

  function renderList(items){ // Affiche la liste d'artistes sous forme de cartes
    if(!Array.isArray(items)){ // Vérifie la validité des données
      container.innerHTML = '<div class="big-panel">Réponse inattendue</div>'; // Message d'erreur
      return;
    }

    if(items.length === 0){ // Cas où aucun artiste ne correspond aux filtres
      container.innerHTML = '<div class="big-panel">Aucun artiste trouvé.</div>'; // Message utilisateur
      return;
    }

    const list = document.createElement('div'); // Conteneur de la grille
    list.style.display = 'grid'; // Affichage en grille CSS
    list.style.gridTemplateColumns = 'repeat(auto-fit,minmax(320px,1fr))'; // Colonnes responsives
    list.style.gap = '1rem'; // Espacement entre les cartes

    items.forEach(artist => { // Boucle sur chaque artiste
      const card = document.createElement('div'); // Carte individuelle
      card.className = 'card'; // Classe CSS de la carte

      const id = artist.id || ''; // Identifiant de l'artiste
      const link = document.createElement('a'); // Lien vers la page artiste
      link.href = '/artist?id=' + encodeURIComponent(id); // URL avec id encodé
      link.style.textDecoration = 'none'; // Supprime le soulignement
      link.style.color = 'inherit'; // Hérite de la couleur du texte

      const img = document.createElement('img'); // Image de l'artiste
      img.src = artist.image || '/assets/images/placeholder.svg'; // Image ou placeholder
      img.alt = artist.name || 'artiste'; // Texte alternatif
      img.width = 120; img.height = 120; // Dimensions fixes pour la mise en page

      const body = document.createElement('div'); // Corps de la carte
      body.className = 'card-body'; // Classe CSS du corps

      const title = document.createElement('h4'); // Titre de la carte
      title.className = 'card-title'; // Classe CSS du titre
      title.textContent = artist.name || 'Nom inconnu'; // Nom de l'artiste

      const yearDiv = document.createElement('div'); // Bloc année de création
      yearDiv.className = 'card-meta'; // Classe CSS des métadonnées
      const creationYear = artist.creationDate || artist.begin_year || artist.creation || 'N/A'; // Année de création avec fallback
      yearDiv.innerHTML = `<strong>Début :</strong> ${creationYear}`; // Injection HTML formatée

      const albumDiv = document.createElement('div'); // Bloc premier album
      albumDiv.className = 'card-meta'; // Classe CSS des métadonnées
      const firstAlbum = artist.firstAlbum || artist.first_album || artist.firstAlbumDate || 'N/A'; // Date du premier album
      albumDiv.innerHTML = `<strong>1er album :</strong> ${firstAlbum}`; // Injection HTML formatée

      const members = document.createElement('div'); // Bloc membres
      members.className = 'card-meta'; // Classe CSS des métadonnées
      let count = Array.isArray(artist.members) ? artist.members.length : 0; // Nombre de membres
      let label = count <= 1 ? 'Membre' : 'Membres'; // Label singulier/pluriel

      members.innerHTML = `<strong>${label} :</strong> ${
        Array.isArray(artist.members) ? artist.members.join(', ') : (artist.members || 'N/A')
      }`; // Liste des membres ou fallback

      body.appendChild(title); // Ajoute le titre au corps
      body.appendChild(yearDiv); // Ajoute l'année de création
      body.appendChild(albumDiv); // Ajoute le premier album
      body.appendChild(members); // Ajoute les membres

      card.appendChild(img); // Ajoute l'image à la carte
      card.appendChild(body); // Ajoute le corps à la carte
      link.appendChild(card); // Rend la carte cliquable
      list.appendChild(link); // Ajoute la carte à la grille
    });

    container.innerHTML = ''; // Vide le conteneur précédent
    container.appendChild(list); // Insère la nouvelle liste
  }

  function debounce(fn, wait){  // Implémentation classique du debounce pour limiter les appels
    let t;  // Timer interne
    return function(...args){  // Fonction retournée avec fermeture (closure)
      clearTimeout(t);  // Annule le timer précédent
      t = setTimeout(()=>fn.apply(this,args), wait);  // Retarde l'exécution de la fonction
    } 
  }

  // Collapsible filter sections
  function initCollapsible(){ // Initialise les sections de filtres repliables
    const collapsibles = document.querySelectorAll('.filter-label.collapsible'); // Sélectionne les labels repliables
    collapsibles.forEach(label => { // Parcourt chaque label
      // Start collapsed by default
      label.classList.add('collapsed'); // État replié par défaut
      const initialContent = label.nextElementSibling; // Récupère le contenu associé
      if(initialContent && initialContent.classList.contains('filter-content')){ // Vérifie la structure attendue
        initialContent.classList.add('collapsed'); // Replie le contenu
      }

      const toggle = () => { // Fonction de bascule ouverture/fermeture
        label.classList.toggle('collapsed'); // Bascule l'état du label
        const content = label.nextElementSibling; // Récupère le contenu associé
        if(content && content.classList.contains('filter-content')){ // Vérifie la structure
          content.classList.toggle('collapsed'); // Bascule l'état du contenu
        }
      };

      label.addEventListener('click', toggle); // Active la bascule au clic sur le label

      const icon = label.querySelector('.toggle-icon'); // Sélectionne l'icône éventuelle
      if(icon){
        icon.addEventListener('click', (e) => { // Gestion du clic sur l'icône
          e.stopPropagation(); // Empêche la propagation vers le label
          toggle(); // Déclenche manuellement la bascule
        });
      }
    });
  }

  fetchData(); // Lance le chargement initial des artistes
  initCollapsible(); // Initialise les sections repliables des filtres

  if(applyBtn) applyBtn.addEventListener('click', applyFilters); // Lie le bouton "appliquer" à la fonction de filtrage
  if(clearBtn) clearBtn.addEventListener('click', clearFilters); // Lie le bouton "réinitialiser" à la fonction de reset
  if(searchInput){
    const handler = debounce(() => applyFilters(), 180); // Crée un handler debounced pour la recherche
    searchInput.addEventListener('input', handler); // Applique le filtrage pendant la saisie
  }
})(); // Fin de l'IIFE
