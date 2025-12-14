import time
from typing import List

from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC

from pages.base_page import BasePage
import config


class JobSearchPage(BasePage):
    URL: str = f"{config.BASE_URL}/jobs"
    
    SEARCH_KEYWORD_INPUT = (By.XPATH, "//input[contains(@aria-label, 'Search by title')]")
    SEARCH_LOCATION_INPUT = (By.XPATH, "//input[contains(@aria-label, 'City, state, or zip')]")
    SEARCH_BUTTON = (By.XPATH, "//button[contains(@class, 'jobs-search-box__submit-button')]")
    
    EASY_APPLY_FILTER = (By.XPATH, "//button[@aria-label='Easy Apply filter.']")
    DATE_POSTED_FILTER = (By.XPATH, "//button[@aria-label='Date posted filter.']")
    PAST_24_HOURS_OPTION = (By.XPATH, "//label[contains(text(), 'Past 24 hours')]")
    
    JOB_CARDS = (By.XPATH, "//div[contains(@class, 'job-card-container')]")
    JOB_TITLE_LINK = (By.XPATH, ".//a[contains(@class, 'job-card-list__title')]")
    EASY_APPLY_BADGE = (By.XPATH, ".//span[contains(text(), 'Easy Apply')]")
    
    RESULTS_CONTAINER = (By.XPATH, "//div[contains(@class, 'jobs-search-results')]")
    NEXT_PAGE_BUTTON = (By.XPATH, "//button[@aria-label='View next page']")
    
    def __init__(self, driver: WebDriver) -> None:
        super().__init__(driver)
    
    def navigate_to_jobs(self) -> "JobSearchPage":
        self.navigate_to(self.URL)
        return self
    
    def search_jobs(self, keyword: str, location: str = "") -> "JobSearchPage":
        keyword_input = self.wait_until_visible(self.SEARCH_KEYWORD_INPUT)
        keyword_input.clear()
        keyword_input.send_keys(keyword)
        
        if location:
            location_input = self.wait_until_visible(self.SEARCH_LOCATION_INPUT)
            location_input.clear()
            location_input.send_keys(location)
        
        keyword_input.send_keys(Keys.RETURN)
        self._wait_for_job_results()
        
        return self
    
    def _wait_for_job_results(self, timeout: int = 15) -> bool:
        try:
            self.wait.until(EC.presence_of_element_located(self.JOB_CARDS))
            time.sleep(1)
            return True
        except Exception:
            return False
    
    def apply_filters(self, easy_apply: bool = True) -> "JobSearchPage":
        if easy_apply:
            try:
                easy_apply_btn = self.wait_until_clickable(self.EASY_APPLY_FILTER)
                easy_apply_btn.click()
                self._wait_for_job_results()
                print("[INFO] Easy Apply filter applied successfully")
            except Exception as e:
                print(f"[WARNING] Could not apply Easy Apply filter: {e}")
        
        return self
    
    def get_job_cards(self) -> List[WebElement]:
        try:
            self.wait_until_present(self.JOB_CARDS)
            return self.find_elements(self.JOB_CARDS)
        except Exception:
            return []
    
    def get_easy_apply_job_links(self) -> List[str]:
        easy_apply_links: List[str] = []
        
        job_cards = self.get_job_cards()
        print(f"[INFO] Found {len(job_cards)} job cards on page")
        
        for card in job_cards:
            try:
                easy_apply_badges = card.find_elements(*self.EASY_APPLY_BADGE)
                
                if easy_apply_badges:
                    title_link = card.find_element(*self.JOB_TITLE_LINK)
                    job_url = title_link.get_attribute("href")
                    
                    if job_url:
                        easy_apply_links.append(job_url)
            except Exception:
                continue
        
        return easy_apply_links
    
    def go_to_next_page(self) -> bool:
        try:
            next_btn = self.wait_until_clickable(self.NEXT_PAGE_BUTTON)
            next_btn.click()
            self._wait_for_job_results()
            return True
        except Exception:
            return False
