import sys
from typing import List, Optional

from selenium.webdriver.remote.webdriver import WebDriver

import config
from utilities.browser_setup import initialize_driver, get_operating_system
from utilities.cookie_manager import login_with_cookies, cookies_exist
from pages.login_page import LoginPage
from pages.job_search_page import JobSearchPage


def authenticate(driver: WebDriver) -> bool:
    print(f"[INFO] Authentication method: {config.AUTH_METHOD}")
    
    if config.AUTH_METHOD == "cookie":
        if not cookies_exist():
            print(f"[ERROR] Cookie file not found: {config.COOKIE_FILE_PATH}")
            return False
        
        print(f"[INFO] Using cookie file: {config.COOKIE_FILE_PATH}")
        return login_with_cookies(driver)
    
    elif config.AUTH_METHOD == "credentials":
        if not config.LINKEDIN_USERNAME or not config.LINKEDIN_PASSWORD:
            print("[ERROR] LINKEDIN_USERNAME and LINKEDIN_PASSWORD must be set in .env")
            return False
        
        print(f"[INFO] Logging in as: {config.LINKEDIN_USERNAME}")
        login_page = LoginPage(driver)
        login_page.navigate_to_login()
        
        success = login_page.login(
            username=config.LINKEDIN_USERNAME,
            password=config.LINKEDIN_PASSWORD
        )
        
        if not success:
            error = login_page.get_error_message()
            print(f"[ERROR] Login failed: {error or 'Unknown error'}")
        
        return success
    
    else:
        print(f"[ERROR] Invalid AUTH_METHOD: {config.AUTH_METHOD}")
        print("[INFO] Valid options: 'cookie' or 'credentials'")
        return False


def run_job_automation() -> List[str]:
    driver: Optional[WebDriver] = None
    easy_apply_links: List[str] = []
    
    try:
        print("=" * 50)
        print("LinkedIn Job Automator")
        print("=" * 50)
        print(f"[INFO] Operating System: {get_operating_system()}")
        
        print("\n[STEP 1] Initializing WebDriver...")
        driver = initialize_driver()
        
        print("\n[STEP 2] Authenticating to LinkedIn...")
        if not authenticate(driver):
            raise Exception("Authentication failed")
        print("[INFO] Authentication successful!")
        
        job_search_page = JobSearchPage(driver)
        
        print("\n[STEP 3] Navigating to job search page...")
        job_search_page.navigate_to_jobs()
        
        print(f"[INFO] Searching for: '{config.DEFAULT_JOB_KEYWORDS}' in '{config.DEFAULT_JOB_LOCATION}'")
        job_search_page.search_jobs(
            keyword=config.DEFAULT_JOB_KEYWORDS,
            location=config.DEFAULT_JOB_LOCATION
        )
        
        print("\n[STEP 4] Applying Easy Apply filter...")
        job_search_page.apply_filters(easy_apply=True)
        
        print("\n[STEP 5] Extracting Easy Apply job links...")
        easy_apply_links = job_search_page.get_easy_apply_job_links()
        
        print(f"\n[SUCCESS] Found {len(easy_apply_links)} Easy Apply jobs!")
        print("-" * 50)
        
        for i, link in enumerate(easy_apply_links, 1):
            print(f"  {i}. {link}")
        
        print("-" * 50)
        
        return easy_apply_links
    
    except Exception as e:
        print(f"\n[ERROR] Automation failed: {str(e)}")
        raise
    
    finally:
        if driver:
            print("\n[CLEANUP] Closing browser...")
            try:
                driver.quit()
                print("[CLEANUP] Browser closed successfully")
            except Exception as cleanup_error:
                print(f"[CLEANUP] Warning: {cleanup_error}")


def main() -> int:
    try:
        job_links = run_job_automation()
        print(f"\n[COMPLETE] Total jobs found: {len(job_links)}")
        return 0
    
    except KeyboardInterrupt:
        print("\n[INFO] Cancelled by user")
        return 130
    
    except Exception as e:
        print(f"\n[FATAL] {str(e)}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
