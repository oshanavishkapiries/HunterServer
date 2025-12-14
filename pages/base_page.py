from typing import List, Tuple

from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By

import config


class BasePage:
    def __init__(self, driver: WebDriver) -> None:
        self.driver: WebDriver = driver
        self.wait: WebDriverWait = WebDriverWait(driver, config.EXPLICIT_WAIT)
    
    def wait_until_visible(self, locator: Tuple[By, str]) -> WebElement:
        return self.wait.until(EC.visibility_of_element_located(locator))
    
    def wait_until_clickable(self, locator: Tuple[By, str]) -> WebElement:
        return self.wait.until(EC.element_to_be_clickable(locator))
    
    def wait_until_present(self, locator: Tuple[By, str]) -> WebElement:
        return self.wait.until(EC.presence_of_element_located(locator))
    
    def wait_for_url_change(self, current_url: str, timeout: int = 15) -> bool:
        try:
            WebDriverWait(self.driver, timeout).until(
                lambda d: d.current_url != current_url
            )
            return True
        except Exception:
            return False
    
    def find_element(self, locator: Tuple[By, str]) -> WebElement:
        return self.wait_until_visible(locator)
    
    def find_elements(self, locator: Tuple[By, str]) -> List[WebElement]:
        return self.driver.find_elements(*locator)
    
    def click_element(self, locator: Tuple[By, str]) -> None:
        element = self.wait_until_clickable(locator)
        element.click()
    
    def enter_text(self, locator: Tuple[By, str], text: str) -> None:
        element = self.wait_until_visible(locator)
        element.clear()
        element.send_keys(text)
    
    def get_current_url(self) -> str:
        return self.driver.current_url
    
    def navigate_to(self, url: str) -> None:
        self.driver.get(url)
