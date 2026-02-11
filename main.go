package main // Déclare le package principal pour l’exécutable Go

import (
	"html/template"
	"io"
	"log"
	"net/http"
	"net/url"
	"time"
)

var tmpl *template.Template // Variable globale pour stocker les templates pré-parsés

func main() { // Point d’entrée de l’application
	// Parse templates from the templates/ directory
	var err error
	tmpl, err = template.ParseGlob("templates/*.html") // Parse tous les fichiers HTML dans templates/
	if err != nil {                                    // Vérifie si une erreur est survenue lors du parsing
		log.Fatalf("parsing templates: %v", err) // Log fatal et arrêt du programme si erreur
	}

	// Serve static assets from the assets/ directory at /assets/
	fs := http.FileServer(http.Dir("assets"))                 // Crée un FileServer pour servir les fichiers statiques
	http.Handle("/assets/", http.StripPrefix("/assets/", fs)) // Route pour les assets, enlève le préfixe pour accéder aux fichiers

	// Proxy API routes (server-side proxy to avoid CORS and centralize access)
	http.HandleFunc("/api/artists", proxyHandler("https://groupietrackers.herokuapp.com/api/artists"))     // Proxy GET /api/artists
	http.HandleFunc("/api/locations", proxyHandler("https://groupietrackers.herokuapp.com/api/locations")) // Proxy GET /api/locations
	http.HandleFunc("/api/dates", proxyHandler("https://groupietrackers.herokuapp.com/api/dates"))         // Proxy GET /api/dates
	http.HandleFunc("/api/relation", proxyHandler("https://groupietrackers.herokuapp.com/api/relation"))   // Proxy GET /api/relation

	// Geocoding proxy: performs a simple lookup using Nominatim (OpenStreetMap)
	http.HandleFunc("/api/geocode", geocodeHandler) // Handler spécifique pour la géolocalisation

	// Pages
	http.HandleFunc("/", indexHandler)              // Handler pour la page d'accueil
	http.HandleFunc("/artists", artistsPageHandler) // Handler pour la page liste d’artistes
	http.HandleFunc("/artist", artistPageHandler)   // Handler pour la page d’un artiste spécifique

	addr := ":8080"
	log.Printf("Starting server at http://localhost%s\n", addr)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

// proxyHandler returns a handler that proxies GET requests to the given remote URL.
func proxyHandler(remote string) http.HandlerFunc { // Fonction qui retourne un HandlerFunc pour faire du proxy
	client := &http.Client{Timeout: 10 * time.Second}     // Client HTTP avec timeout de 10 secondes
	return func(w http.ResponseWriter, r *http.Request) { // Fonction retournée pour chaque requête
		// Allow only GET for the proxy endpoints
		if r.Method != http.MethodGet { // Vérifie que la méthode est GET
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed) // Erreur 405 si autre méthode
			return
		}

		resp, err := client.Get(remote) // Envoie la requête GET vers le serveur distant
		if err != nil {                 // Vérifie les erreurs réseau
			http.Error(w, "failed to fetch remote data", http.StatusBadGateway) // Erreur 502 si échec
			return
		}
		defer resp.Body.Close() // Ferme la réponse à la fin de la fonction

		// Copy status code and headers (minimal)
		w.Header().Set("Content-Type", resp.Header.Get("Content-Type")) // Copie le type de contenu depuis la réponse distante
		w.WriteHeader(resp.StatusCode)                                  // Reproduit le code HTTP de la réponse distante
		if _, err := io.Copy(w, resp.Body); err != nil {                // Copie le corps de la réponse vers le client
			log.Printf("error copying response from %s: %v", remote, err) // Log si erreur lors de la copie
		}
	}
}

func indexHandler(w http.ResponseWriter, r *http.Request) { // Handler pour la page d’accueil
	data := struct { // Structure inline pour les données du template
		Title string
	}{Title: "Groupie Tracker — Accueil"} // Initialise le titre de la page

	if err := tmpl.ExecuteTemplate(w, "index.html", data); err != nil { // Exécute le template index.html
		http.Error(w, err.Error(), http.StatusInternalServerError) // Erreur 500 si problème d’exécution
	}
}

func artistsPageHandler(w http.ResponseWriter, r *http.Request) { // Handler pour la page liste d’artistes
	if err := tmpl.ExecuteTemplate(w, "artists.html", nil); err != nil { // Exécute le template artists.html
		http.Error(w, err.Error(), http.StatusInternalServerError) // Erreur 500 si problème d’exécution
	}
}

func artistPageHandler(w http.ResponseWriter, r *http.Request) { // Handler pour la page d’un artiste spécifique
	if err := tmpl.ExecuteTemplate(w, "artist.html", nil); err != nil { // Exécute le template artist.html
		http.Error(w, err.Error(), http.StatusInternalServerError) // Erreur 500 si problème d’exécution
	}
}

// geocodeHandler proxies a geocoding request to Nominatim and returns the JSON result.
func geocodeHandler(w http.ResponseWriter, r *http.Request) { // Handler pour la géolocalisation
	q := r.URL.Query().Get("q") // Récupère le paramètre de query "q"
	if q == "" {                // Vérifie si le paramètre est vide
		http.Error(w, "missing query param q", http.StatusBadRequest) // Erreur 400 si absent
		return
	}

	// Build Nominatim URL
	nomUrl := "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + url.QueryEscape(q) // Construit l’URL pour Nominatim avec encodage

	client := &http.Client{Timeout: 10 * time.Second}        // Client HTTP avec timeout
	req, err := http.NewRequest(http.MethodGet, nomUrl, nil) // Crée la requête GET
	if err != nil {                                          // Vérifie erreur de création
		http.Error(w, "failed to build request", http.StatusInternalServerError) // Erreur 500 si problème
		return
	}
	// Set a sensible User-Agent as required by Nominatim usage policy
	req.Header.Set("User-Agent", "GroupieTracker/1.0 (example@example.com)") // Nominatim exige un User-Agent identifiable

	resp, err := client.Do(req) // Exécute la requête
	if err != nil {             // Vérifie erreurs réseau
		http.Error(w, "failed to fetch geocode", http.StatusBadGateway) // Erreur 502 si échec
		return
	}
	defer resp.Body.Close() // Ferme la réponse à la fin

	w.Header().Set("Content-Type", resp.Header.Get("Content-Type")) // Copie le type de contenu du serveur Nominatim
	w.WriteHeader(resp.StatusCode)                                  // Copie le code HTTP
	if _, err := io.Copy(w, resp.Body); err != nil {                // Copie le corps JSON vers le client
		log.Printf("error copying geocode response: %v", err) // Log si problème lors de la copie
	}
}
