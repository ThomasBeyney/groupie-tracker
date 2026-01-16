package cache

import (
	"sync"
	"time"
)

type CacheItem struct {
	Data      []byte
	ExpiresAt time.Time
}

type Cache struct {
	mu    sync.RWMutex
	items map[string]CacheItem
}

func New() *Cache {
	return &Cache{
		items: make(map[string]CacheItem),
	}
}

func (c *Cache) Get(key string) ([]byte, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	item, found := c.items[key]
	if !found || time.Now().After(item.ExpiresAt) {
		return nil, false
	}

	return item.Data, true
}

func (c *Cache) Set(key string, data []byte, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.items[key] = CacheItem{
		Data:      data,
		ExpiresAt: time.Now().Add(ttl),
	}
}

func (c *Cache) CleanExpired() {
	c.mu.Lock()
	defer c.mu.Unlock()

	now := time.Now()
	for key, item := range c.items {
		if now.After(item.ExpiresAt) {
			delete(c.items, key)
		}
	}
}
