package api

import (
	"io"
	"net/http"
	"net/url"
	"time"

	"groupie-tracker/internal/cache"
)

type GeocodeService struct {
	client *http.Client
	cache  *cache.Cache
}

func NewGeocodeService(c *cache.Cache) *GeocodeService {
	return &GeocodeService{
		client: &http.Client{Timeout: 10 * time.Second},
		cache:  c,
	}
}

func (g *GeocodeService) Handler(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if q == "" {
		http.Error(w, "missing query param q", http.StatusBadRequest)
		return
	}

	cacheKey := "geocode:" + q

	// Check cache first
	if cached, found := g.cache.Get(cacheKey); found {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Cache", "HIT")
		w.Write(cached)
		return
	}

	// Build Nominatim URL
	nomUrl := "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + url.QueryEscape(q)

	req, err := http.NewRequest(http.MethodGet, nomUrl, nil)
	if err != nil {
		http.Error(w, "failed to build request", http.StatusInternalServerError)
		return
	}
	req.Header.Set("User-Agent", "GroupieTracker/1.0 (example@example.com)")

	resp, err := g.client.Do(req)
	if err != nil {
		http.Error(w, "failed to fetch geocode", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	// Read the response
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		http.Error(w, "failed to read response", http.StatusInternalServerError)
		return
	}

	// Cache successful responses for 7 days (geocoding rarely changes)
	if resp.StatusCode == http.StatusOK {
		g.cache.Set(cacheKey, data, 7*24*time.Hour)
	}

	w.Header().Set("Content-Type", resp.Header.Get("Content-Type"))
	w.Header().Set("X-Cache", "MISS")
	w.WriteHeader(resp.StatusCode)
	w.Write(data)
}
