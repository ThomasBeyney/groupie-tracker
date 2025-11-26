# groupie-tracker

## Groupie Tracker Geolocalization — Plan d’action

### 1. Objectifs généraux
- Construire un backend Go qui consomme l’API Groupie Tracker et expose les données d’artistes, concerts et dates.
- Convertir les adresses de concerts en coordonnées géographiques pour alimenter une carte interactive.
- Respecter la contrainte “standard library only”, gérer les erreurs HTTP et fournir une base de tests unitaires.

### 2. Architecture proposée
- **Serveur Go**
  - `main.go` orchestre les routes HTTP et le rendu des templates.
  - Package `api` : client Groupie Tracker (fetch artistes, relations, lieux).
  - Package `geo` : géocodage d’adresses via un service REST (ex. Nominatim) + cache mémoire.
  - Package `web` : gestion des templates, handlers HTML et endpoints JSON (`/artists`, `/concerts`, `/geodata`).
- **Frontend**
  - Templates HTML pour lister artistes/concerts.
  - Script JS léger chargeant `/geodata` et plaçant des marqueurs sur une carte (Leaflet + tuiles OSM).
  - Styles CSS dédiés aux listes, cartes et états d’erreur.

### 3. Étapes détaillées
1. **Initialisation & qualité**
   - Définir les structs : `Artist`, `Concert`, `Location`, `GeoPoint`.
   - Ajouter un logger commun et des pages d’erreurs personnalisées (404/500).
2. **Intégration API Groupie Tracker**
   - Créer un client HTTP avec timeout, parsing JSON, validation des champs.
   - Mettre en place une couche de cache (en mémoire) pour limiter les appels répétés.
3. **Géocodage**
   - Implémenter une fonction `Geocode(address string) (GeoPoint, error)` utilisant uniquement `net/http` et `encoding/json`.
   - Gérer la politique de rate limit (mise en file et backoff simple).
4. **Endpoints & logique serveur**
   - `/` : page d’accueil avec liste d’artistes.
   - `/artists/{id}` : détails, dates et lieux.
   - `/geodata/{id}` : JSON des points géolocalisés pour l’artiste.
   - Sérialiser les données côté serveur et préparer les structures pour le front.
5. **Frontend & carte**
   - Étendre `index.html` pour afficher tableaux/listes.
   - Ajouter un template dédié à la carte avec Leaflet (JS + CSS).
   - Consommer `/geodata` pour placer les markers, afficher info-bulles (ville, date).
6. **Tests & validation**
   - Tests unitaires sur le parsing JSON de l’API, le géocodage (mocks via `httptest`), et les handlers principaux.
   - Script `go test ./...` documenté dans le README.

### 4. Livrables
- Backend Go opérationnel (serveur, packages `api`, `geo`, `web`).
- Pages HTML/CSS/JS prêtes pour la démo (liste + carte interactive).
- Documentation:
  - `README.md` complet (setup, run, tests, limites API externes).
  - `PLAN.md` (présent fichier) pour le suivi des étapes.

### 5. Références
- Cahier des charges officiel « Groupie Tracker Geolocalization » [source](file://Groupie_Tracker_Geolocalization%20(1).pdf).

