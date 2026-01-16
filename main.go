package main

import (
	"html/template"
	"log"
	"net/http"
	"time"

	"groupie-tracker/internal/api"
	"groupie-tracker/internal/cache"
	"groupie-tracker/internal/handlers"
)

func main() {
	// Parse templates
	tmpl, err := template.ParseGlob("templates/*.html")
	if err != nil {
		log.Fatalf("parsing templates: %v", err)
	}

	// Initialize cache
	appCache := cache.New()
	
	// Clean expired cache entries every hour
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			appCache.CleanExpired()
		}
	}()

	// Initialize services
	proxyService := api.NewProxyService(appCache)
	geocodeService := api.NewGeocodeService(appCache)
	pageHandler := handlers.NewPageHandler(tmpl)

	// Serve static assets
	fs := http.FileServer(http.Dir("assets"))
	http.Handle("/assets/", http.StripPrefix("/assets/", fs))

	// API routes with caching (5 minutes TTL for API data)
	http.HandleFunc("/api/artists", proxyService.Handler("https://groupietrackers.herokuapp.com/api/artists", 5*time.Minute))
	http.HandleFunc("/api/locations", proxyService.Handler("https://groupietrackers.herokuapp.com/api/locations", 5*time.Minute))
	http.HandleFunc("/api/dates", proxyService.Handler("https://groupietrackers.herokuapp.com/api/dates", 5*time.Minute))
	http.HandleFunc("/api/relation", proxyService.Handler("https://groupietrackers.herokuapp.com/api/relation", 5*time.Minute))
	http.HandleFunc("/api/geocode", geocodeService.Handler)

	// Page routes
	http.HandleFunc("/", pageHandler.Index)
	http.HandleFunc("/artists", pageHandler.Artists)
	http.HandleFunc("/artist", pageHandler.Artist)
	http.HandleFunc("/relation", pageHandler.Relation)

	addr := ":8080"
	log.Printf("Starting server at http://localhost%s\n", addr)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
