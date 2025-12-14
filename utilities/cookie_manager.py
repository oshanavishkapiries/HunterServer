import json
import os
from typing import List, Dict, Optional

from selenium.webdriver.remote.webdriver import WebDriver

import config


def load_cookies_from_file(file_path: Optional[str] = None) -> List[Dict]:
    path = file_path or config.COOKIE_FILE_PATH
    
    if not os.path.exists(path):
        raise FileNotFoundError(f"Cookie file not found: {path}")
    
    with open(path, 'r', encoding='utf-8') as f:
        cookies = json.load(f)
    
    return cookies


def save_cookies_to_file(driver: WebDriver, file_path: Optional[str] = None) -> str:
    path = file_path or config.COOKIE_FILE_PATH
    cookies = driver.get_cookies()
    
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(cookies, f, indent=2)
    
    print(f"[INFO] Saved {len(cookies)} cookies to {path}")
    return path


def add_cookies_to_driver(driver: WebDriver, cookies: List[Dict]) -> int:
    added_count = 0
    
    for cookie in cookies:
        try:
            cookie_to_add = {
                'name': cookie['name'],
                'value': cookie['value'],
                'domain': cookie.get('domain', '.linkedin.com'),
            }
            
            if 'path' in cookie:
                cookie_to_add['path'] = cookie['path']
            if 'secure' in cookie:
                cookie_to_add['secure'] = cookie['secure']
            if 'httpOnly' in cookie:
                cookie_to_add['httpOnly'] = cookie['httpOnly']
            
            driver.add_cookie(cookie_to_add)
            added_count += 1
            
        except Exception as e:
            print(f"[WARNING] Could not add cookie '{cookie.get('name', 'unknown')}': {e}")
    
    return added_count


def login_with_cookies(driver: WebDriver, cookie_file: Optional[str] = None) -> bool:
    path = cookie_file or config.COOKIE_FILE_PATH
    
    try:
        driver.get(config.BASE_URL)
        
        print(f"[INFO] Loading cookies from: {path}")
        cookies = load_cookies_from_file(path)
        print(f"[INFO] Found {len(cookies)} cookies in file")
        
        added = add_cookies_to_driver(driver, cookies)
        print(f"[INFO] Added {added} cookies to browser")
        
        driver.refresh()
        driver.get(f"{config.BASE_URL}/feed")
        
        current_url = driver.current_url
        if "/login" in current_url or "/authwall" in current_url:
            print("[WARNING] Cookie login failed - redirected to login page")
            return False
        
        print("[INFO] Cookie login successful!")
        return True
        
    except FileNotFoundError:
        print(f"[ERROR] Cookie file not found: {path}")
        return False
    except Exception as e:
        print(f"[ERROR] Cookie login failed: {e}")
        return False


def cookies_exist(file_path: Optional[str] = None) -> bool:
    path = file_path or config.COOKIE_FILE_PATH
    return os.path.exists(path)
