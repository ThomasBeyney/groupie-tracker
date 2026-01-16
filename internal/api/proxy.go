package api

import (
	"io"
	"net/http"
	"time"

	"groupie-tracker/internal/cache"
)

type ProxyService struct {
	client *http.Client
	cache  *cache.Cache
}

func NewProxyService(c *cache.Cache) *ProxyService {
	return &ProxyService{
		client: &http.Client{Timeout: 10 * time.Second},
		cache:  c,
	}
}

func (p *ProxyService) Handler(remote string, cacheTTL time.Duration) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Check cache first
		if cached, found := p.cache.Get(remote); found {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Cache", "HIT")
			w.Write(cached)
			return
		}

		// Fetch from remote
		resp, err := p.client.Get(remote)
		if err != nil {
			http.Error(w, "failed to fetch remote data", http.StatusBadGateway)
			return
		}
		defer resp.Body.Close()

		// Read the response body
		data, err := io.ReadAll(resp.Body)
		if err != nil {
			http.Error(w, "failed to read response", http.StatusInternalServerError)
			return
		}

		// Cache successful responses
		if resp.StatusCode == http.StatusOK {
			p.cache.Set(remote, data, cacheTTL)
		}

		w.Header().Set("Content-Type", resp.Header.Get("Content-Type"))
		w.Header().Set("X-Cache", "MISS")
		w.WriteHeader(resp.StatusCode)
		w.Write(data)
	}
}
