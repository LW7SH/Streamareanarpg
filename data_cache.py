"""
Data caching service for periodic API data fetching.
Caches static game data locally and refreshes every hour.
"""

import json
import os
import time
import threading
import logging
from pathlib import Path
from datetime import datetime, timedelta
import requests

logger = logging.getLogger(__name__)

class DataCache:
    """
    Manages cached data with automatic hourly refresh.
    Stores data locally on disk to persist across server restarts.
    """
    
    def __init__(self, cache_dir='cache_data', refresh_interval=3600):
        """
        Initialize the data cache.
        
        Args:
            cache_dir: Directory to store cached data files
            refresh_interval: Time in seconds between refreshes (default: 3600 = 1 hour)
        """
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        self.refresh_interval = refresh_interval
        
        # In-memory cache with timestamps
        self.cache = {}
        self.cache_timestamps = {}
        
        # Lock for thread-safe cache access
        self.lock = threading.Lock()
        
        # Background refresh thread
        self.refresh_thread = None
        self.should_stop = threading.Event()
        
        # API configuration
        self.api_url = "https://streamarenarpg.com/portal/portal_api.php"
        self.token = os.environ.get("RPG_TOKEN")
        
        if not self.token:
            logger.warning("RPG_TOKEN not set - cache will not function")
    
    def _get_cache_file_path(self, key):
        """Get the file path for a cache key."""
        safe_key = key.replace('/', '_').replace(':', '_')
        return self.cache_dir / f"{safe_key}.json"
    
    def _load_from_disk(self, key):
        """Load cached data from disk."""
        file_path = self._get_cache_file_path(key)
        try:
            if file_path.exists():
                with open(file_path, 'r') as f:
                    data = json.load(f)
                    logger.info(f"Loaded {key} from disk cache")
                    return data
        except Exception as e:
            logger.error(f"Error loading {key} from disk: {e}")
        return None
    
    def _save_to_disk(self, key, data):
        """Save cached data to disk."""
        file_path = self._get_cache_file_path(key)
        try:
            with open(file_path, 'w') as f:
                json.dump(data, f)
                logger.info(f"Saved {key} to disk cache")
        except Exception as e:
            logger.error(f"Error saving {key} to disk: {e}")
    
    def _fetch_items(self):
        """Fetch game items from API."""
        payload = {
            "route": "get_game_items",
            "token": self.token,
        }
        try:
            r = requests.post(self.api_url, json=payload, timeout=15)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            logger.error(f"Error fetching items: {e}")
            return None
    
    def _fetch_shaders(self):
        """Fetch shader cosmetics from API."""
        payload = {
            "route": "get_shaders",
            "token": self.token,
        }
        try:
            r = requests.post(self.api_url, json=payload, timeout=15)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            logger.error(f"Error fetching shaders: {e}")
            return None
    
    def _fetch_backs(self):
        """Fetch back cosmetics from API."""
        payload = {
            "route": "get_backs",
            "token": self.token,
        }
        try:
            r = requests.post(self.api_url, json=payload, timeout=15)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            logger.error(f"Error fetching backs: {e}")
            return None
    
    def _fetch_chests(self):
        """Fetch chest cosmetics from API."""
        payload = {
            "route": "get_chests",
            "token": self.token,
        }
        try:
            r = requests.post(self.api_url, json=payload, timeout=15)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            logger.error(f"Error fetching chests: {e}")
            return None
    
    def _fetch_skills(self, class_name):
        """Fetch skills for a specific class from API."""
        payload = {
            "route": "get_skills",
            "token": self.token,
            "class": class_name
        }
        try:
            r = requests.post(self.api_url, json=payload, timeout=15)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            logger.error(f"Error fetching skills for {class_name}: {e}")
            return None
    
    def _fetch_listings(self, page=1, slot=None, class_=None):
        """Fetch marketplace listings from API."""
        payload = {
            "route": "get_listings",
            "token": self.token,
        }
        if slot:
            payload["slot"] = slot
        if class_:
            payload["class"] = class_
        
        try:
            r = requests.post(self.api_url, json=payload, timeout=15)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            logger.error(f"Error fetching listings: {e}")
            return None
    
    def _refresh_all_data(self):
        """Refresh all cached data."""
        logger.info("Starting data refresh cycle...")
        
        # List of all classes for skills caching
        classes = ['barbarian', 'mage', 'ranger', 'priest', 'necromancer']
        
        refreshed = []
        
        # Refresh items
        data = self._fetch_items()
        if data:
            self._set_cache('items', data)
            refreshed.append('items')
        
        # Refresh shaders
        data = self._fetch_shaders()
        if data:
            self._set_cache('shaders', data)
            refreshed.append('shaders')
        
        # Refresh backs
        data = self._fetch_backs()
        if data:
            self._set_cache('backs', data)
            refreshed.append('backs')
        
        # Refresh chests
        data = self._fetch_chests()
        if data:
            self._set_cache('chests', data)
            refreshed.append('chests')
        
        # Refresh skills for each class
        for class_name in classes:
            data = self._fetch_skills(class_name)
            if data:
                cache_key = f'skills:{class_name}'
                self._set_cache(cache_key, data)
                refreshed.append(cache_key)
        
        # Optionally refresh first page of listings (marketplace overview)
        # Note: You might want to skip this if listings change too frequently
        # or make this refresh more frequently than hourly
        data = self._fetch_listings(page=1)
        if data:
            self._set_cache('listings:page1', data)
            refreshed.append('listings:page1')
        
        logger.info(f"Data refresh complete. Refreshed: {', '.join(refreshed)}")
    
    def _set_cache(self, key, data):
        """Set cache data with timestamp."""
        with self.lock:
            self.cache[key] = data
            self.cache_timestamps[key] = time.time()
            self._save_to_disk(key, data)
    
    def get(self, key, max_age=None):
        """
        Get cached data by key.
        
        Args:
            key: Cache key
            max_age: Maximum age in seconds (None = use any cached data)
        
        Returns:
            Cached data or None if not available/expired
        """
        with self.lock:
            # Check in-memory cache first
            if key in self.cache:
                if max_age is None:
                    return self.cache[key]
                
                age = time.time() - self.cache_timestamps.get(key, 0)
                if age <= max_age:
                    return self.cache[key]
            
            # Try loading from disk if not in memory
            data = self._load_from_disk(key)
            if data:
                self.cache[key] = data
                self.cache_timestamps[key] = time.time()
                return data
        
        return None
    
    def _background_refresh_loop(self):
        """Background thread loop for periodic data refresh."""
        logger.info("Background refresh thread started")
        
        # Do initial refresh immediately
        try:
            self._refresh_all_data()
        except Exception as e:
            logger.error(f"Error in initial data refresh: {e}")
        
        # Then refresh every hour
        while not self.should_stop.is_set():
            # Wait for the refresh interval (or until stop is signaled)
            if self.should_stop.wait(timeout=self.refresh_interval):
                break
            
            try:
                self._refresh_all_data()
            except Exception as e:
                logger.error(f"Error in background refresh: {e}")
        
        logger.info("Background refresh thread stopped")
    
    def start(self):
        """Start the background refresh thread."""
        if self.refresh_thread is None or not self.refresh_thread.is_alive():
            self.should_stop.clear()
            self.refresh_thread = threading.Thread(
                target=self._background_refresh_loop,
                daemon=True,
                name="DataCacheRefresh"
            )
            self.refresh_thread.start()
            logger.info("Data cache background refresh started")
    
    def stop(self):
        """Stop the background refresh thread."""
        self.should_stop.set()
        if self.refresh_thread:
            self.refresh_thread.join(timeout=5)
            logger.info("Data cache background refresh stopped")
    
    def get_cache_stats(self):
        """Get statistics about the cache."""
        with self.lock:
            stats = {}
            for key in self.cache.keys():
                age = time.time() - self.cache_timestamps.get(key, 0)
                stats[key] = {
                    'age_seconds': round(age, 2),
                    'age_minutes': round(age / 60, 2),
                    'has_data': bool(self.cache.get(key))
                }
            return stats


# Global cache instance
_cache_instance = None

def get_cache():
    """Get the global cache instance."""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = DataCache()
    return _cache_instance
