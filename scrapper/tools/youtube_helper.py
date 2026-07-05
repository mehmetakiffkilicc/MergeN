import os
import random
import glob
from pathlib import Path

class YoutubeHelper:
    def __init__(self, base_dir=None):
        if base_dir is None:
            self.base_dir = Path(__file__).parent.parent.resolve()
        else:
            self.base_dir = Path(base_dir).resolve()
            
        self.proxies = self._load_proxies()
        self.cookie_files = self._load_cookie_files()
        self.banned_proxies = set()
        
        print(f"[YoutubeHelper] Loaded {len(self.proxies)} proxies and {len(self.cookie_files)} cookie files.")

    def _load_proxies(self):
        proxies = []
        # 1. Try YOUTUBE_PROXY_POOL from env
        pool = os.getenv("YOUTUBE_PROXY_POOL")
        if pool:
            # support comma or semicolon separation
            sep = ";" if ";" in pool else ","
            for p in pool.split(sep):
                p_str = p.strip()
                if p_str:
                    proxies.append(p_str)
                    
        # 2. Try youtube_proxies.txt or proxies.txt in base_dir or root
        root_dir = self.base_dir.parent
        for d in [self.base_dir, root_dir]:
            for filename in ["youtube_proxies.txt", "proxies.txt"]:
                file_path = d / filename
                if file_path.exists():
                    try:
                        with open(file_path, "r", encoding="utf-8") as f:
                            for line in f:
                                p_str = line.strip()
                                if p_str and not p_str.startswith("#"):
                                    proxies.append(p_str)
                    except Exception as e:
                        print(f"[YoutubeHelper] Error reading {filename}: {e}")
                    
        # 3. Fallback to YOUTUBE_PROXY
        yt_proxy = os.getenv("YOUTUBE_PROXY")
        if yt_proxy and yt_proxy not in proxies:
            proxies.append(yt_proxy.strip())
            
        # Deduplicate while preserving order
        unique_proxies = []
        for p in proxies:
            # normalize proxy url format
            if p and not p.startswith(("http://", "https://", "socks5://")):
                p = f"http://{p}"
            if p not in unique_proxies:
                unique_proxies.append(p)
                
        return unique_proxies

    def _load_cookie_files(self):
        cookie_files = []
        
        # Look for youtube_cookies*.txt in base_dir and root
        paths_to_check = [
            self.base_dir,
            self.base_dir / "tools",
            self.base_dir.parent,
            Path(".")
        ]
        
        seen_paths = set()
        for p in paths_to_check:
            if not p.exists():
                continue
            for pattern in ["youtube_cookies.txt", "youtube_cookies_*.txt"]:
                for match in glob.glob(str(p / pattern)):
                    abs_path = os.path.abspath(match)
                    if abs_path not in seen_paths:
                        seen_paths.add(abs_path)
                        cookie_files.append(abs_path)
                        
        return cookie_files

    def get_proxy(self):
        active_proxies = [p for p in self.proxies if p not in self.banned_proxies]
        if not active_proxies:
            # If all proxies are banned, reset ban list to retry them
            if self.proxies:
                print("[YoutubeHelper] All proxies are banned! Resetting ban list to retry.")
                self.banned_proxies.clear()
                return random.choice(self.proxies)
            return None
        return random.choice(active_proxies)

    def get_cookie_file(self):
        if not self.cookie_files:
            return None
        return random.choice(self.cookie_files)

    def ban_proxy(self, proxy):
        if proxy and proxy in self.proxies:
            self.banned_proxies.add(proxy)
            print(f"[YoutubeHelper] Proxy banned due to error/rate limit: {proxy}")
            
    def unban_proxy(self, proxy):
        if proxy in self.banned_proxies:
            self.banned_proxies.remove(proxy)
