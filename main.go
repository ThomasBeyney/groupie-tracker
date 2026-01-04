package main

import (
	"html/template"
	"io"
	"log"
	"net/http"
	"net/url"
	"time"
)

var tmpl *template.Template

func main() {
	// Parse templates from the templates/ directory
	var err error
	tmpl, err = template.ParseGlob("templates/*.html")
	if err != nil {
		log.Fatalf("parsing templates: %v", err)
	}

	// Serve static assets from the assets/ directory at /assets/
	fs := http.FileServer(http.Dir("assets"))
	http.Handle("/assets/", http.StripPrefix("/assets/", fs))

	// Proxy API routes (server-side proxy to avoid CORS and centralize access)
	http.HandleFunc("/api/artists", proxyHandler("https://groupietrackers.herokuapp.com/api/artists"))
	http.HandleFunc("/api/locations", proxyHandler("https://groupietrackers.herokuapp.com/api/locations"))
	http.HandleFunc("/api/dates", proxyHandler("https://groupietrackers.herokuapp.com/api/dates"))
	http.HandleFunc("/api/relation", proxyHandler("https://groupietrackers.herokuapp.com/api/relation"))

	// Geocoding proxy: performs a simple lookup using Nominatim (OpenStreetMap)
	http.HandleFunc("/api/geocode", geocodeHandler)

	// Pages
	http.HandleFunc("/", indexHandler)
	http.HandleFunc("/artists", artistsPageHandler)
	http.HandleFunc("/artist", artistPageHandler)
	http.HandleFunc("/relation", relationPageHandler)

	addr := ":8080"
	log.Printf("Starting server at http://localhost%s\n", addr)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

// proxyHandler returns a handler that proxies GET requests to the given remote URL.
func proxyHandler(remote string) http.HandlerFunc {
	client := &http.Client{Timeout: 10 * time.Second}
	return func(w http.ResponseWriter, r *http.Request) {
		// Allow only GET for the proxy endpoints
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		resp, err := client.Get(remote)
		if err != nil {
			http.Error(w, "failed to fetch remote data", http.StatusBadGateway)
			return
		}
		defer resp.Body.Close()

		// Copy status code and headers (minimal)
		w.Header().Set("Content-Type", resp.Header.Get("Content-Type"))
		w.WriteHeader(resp.StatusCode)
		if _, err := io.Copy(w, resp.Body); err != nil {
			log.Printf("error copying response from %s: %v", remote, err)
		}
	}
}

func indexHandler(w http.ResponseWriter, r *http.Request) {
	data := struct {
		Title string
	}{Title: "Groupie Tracker — Accueil"}

	if err := tmpl.ExecuteTemplate(w, "index.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func artistsPageHandler(w http.ResponseWriter, r *http.Request) {
	if err := tmpl.ExecuteTemplate(w, "artists.html", nil); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func artistPageHandler(w http.ResponseWriter, r *http.Request) {
	if err := tmpl.ExecuteTemplate(w, "artist.html", nil); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func relationPageHandler(w http.ResponseWriter, r *http.Request) {
	if err := tmpl.ExecuteTemplate(w, "relation.html", nil); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// geocodeHandler proxies a geocoding request to Nominatim and returns the JSON result.
func geocodeHandler(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if q == "" {
		http.Error(w, "missing query param q", http.StatusBadRequest)
		return
	}

	// Build Nominatim URL
	nomUrl := "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + url.QueryEscape(q)

	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest(http.MethodGet, nomUrl, nil)
	if err != nil {
		http.Error(w, "failed to build request", http.StatusInternalServerError)
		return
	}
	// Set a sensible User-Agent as required by Nominatim usage policy
	req.Header.Set("User-Agent", "GroupieTracker/1.0 (example@example.com)")

	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "failed to fetch geocode", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", resp.Header.Get("Content-Type"))
	w.WriteHeader(resp.StatusCode)
	if _, err := io.Copy(w, resp.Body); err != nil {
		log.Printf("error copying geocode response: %v", err)
	}
}
