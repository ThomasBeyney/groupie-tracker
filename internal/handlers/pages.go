package handlers

import (
	"html/template"
	"net/http"
)

type PageHandler struct {
	tmpl *template.Template
}

func NewPageHandler(tmpl *template.Template) *PageHandler {
	return &PageHandler{tmpl: tmpl}
}

func (h *PageHandler) Index(w http.ResponseWriter, r *http.Request) {
	data := struct {
		Title string
	}{Title: "Groupie Tracker — Accueil"}

	if err := h.tmpl.ExecuteTemplate(w, "index.html", data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func (h *PageHandler) Artists(w http.ResponseWriter, r *http.Request) {
	if err := h.tmpl.ExecuteTemplate(w, "artists.html", nil); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func (h *PageHandler) Artist(w http.ResponseWriter, r *http.Request) {
	if err := h.tmpl.ExecuteTemplate(w, "artist.html", nil); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func (h *PageHandler) Relation(w http.ResponseWriter, r *http.Request) {
	if err := h.tmpl.ExecuteTemplate(w, "relation.html", nil); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
