# Groupie Tracker

Géolocalisation d'artistes et de concerts — projet personnel/étude

---

## À propos

Groupie Tracker est une application web qui liste des artistes et leurs concerts tout en affichant les lieux sur une carte interactive. Le projet est écrit en Go côté serveur, consomme l'API Groupie Tracker, et utilise Leaflet pour la carte côté frontend.

L'objectif est d'avoir un projet simple et fonctionnel, avec un backend solide et un frontend léger et lisible, tout en respectant la contrainte "standard library only" côté Go.

---

## Objectifs

1. Fournir un backend Go qui récupère les données des artistes et concerts.
2. Convertir les adresses des concerts en coordonnées géographiques pour une carte interactive.
3. Construire un frontend simple pour afficher les artistes, leurs concerts et leur géolocalisation.
4. Proposer des tests unitaires pour assurer la qualité et la stabilité du code.

---

## Architecture

### Backend (Go)

- `main.go` : point d'entrée, routes HTTP et rendu des templates.
- Package `api` : client pour récupérer artistes, relations et lieux depuis l'API Groupie Tracker.
- Package `geo` : géocodage d'adresses via un service REST + cache mémoire.
- Package `web` : templates HTML, handlers pour pages et endpoints JSON (`/artists`, `/concerts`, `/geodata`).

### Frontend

- Templates HTML pour afficher listes d'artistes et de concerts.
- JS qui charge `/geodata` pour afficher les markers sur la carte Leaflet.
- CSS dédié aux listes, cartes, boutons et états d'erreur.

---

## Installation et lancement

1. Cloner le projet :

```bash
git clone https://github.com/ThomasBeyney/groupie-tracker.git
cd groupie-tracker
```

2. Installer Go (si nécessaire) : [https://go.dev/doc/install](https://go.dev/doc/install)

3. Lancer le serveur :

```bash
go run main.go
```

4. Ouvrir dans le navigateur :

```
http://localhost:8080
```

---

## Fonctionnalités

- Liste des artistes avec informations principales.
- Détails d'un artiste : concerts, membres, dates.
- Carte interactive avec markers pour chaque concert.
- Filtres pour rechercher par ville, date ou style musical.
- Animations légères et effets "neon" pour les boutons et markers.
- Pages d'erreur personnalisées (404 / 500).
- Tests unitaires pour : parsing JSON, géocodage (mocks `httptest`), handlers principaux.

---

## Structure du projet

```
groupie-tracker/
├─ main.go                     # point d’entrée Go
├─ go.mod                      # module Go
├─ README.md                   # documentation du projet
├─ assets/                     # ressources front (JS + CSS)
│  ├─ artist.js
│  ├─ artists.js
│  ├─ cities.js
│  ├─ dates(non utilisé).js
│  ├─ locations(non utilisé).js
│  ├─ relation(non utilisé).js
│  ├─ neon.css
│  └─ style.css
├─ templates/                  # fichiers HTML
│  ├─ index.html
│  ├─ artist.html
│  ├─ artists.html
│  ├─ dates(non utilisé).html
│  ├─ locations(non utilisé).html
│  └─ relation(non utilisé).html
├─ docs/                       # documentation additionnelle
└─ data(non utilisé)/          # données non utilisées
```

---

## Tests

Lancer tous les tests :

```bash
go test ./...
```

Tests inclus :
- Validation du parsing JSON.
- Géocodage avec mock HTTP.
- Endpoints principaux (`/artists`, `/geodata`, etc.).

---

## Limites

- Dépendance à l'API Groupie Tracker : indisponibilité ou lenteur peut impacter le chargement.
- Géocodage limité par quotas externes (géré par cache et backoff).
- Frontend minimaliste, pas de framework JS lourd.

---

## Références

- Cahier des charges officiel « Groupie Tracker Geolocalization » [source](file://Groupie_Tracker_Geolocalization%20(1).pdf)
- Leaflet : h