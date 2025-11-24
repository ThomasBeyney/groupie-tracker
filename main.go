package main

import (
	"html/template"
	"log"
	"net/http"
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

	// Routes
	http.HandleFunc("/", indexHandler)

	addr := ":8080"
	log.Printf("Starting server at http://localhost%s\n 🚀", addr)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

func indexHandler(w http.ResponseWriter, r *http.Request) {
	data := struct{
		Title string
	}{Title: "Groupie Tracker — Accueil"}

	if err := tmpl.ExecuteTemplate(w, "index.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}