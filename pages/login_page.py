from typing import Optional

from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By

from pages.base_page import BasePage
import config


class LoginPage(BasePage):
    URL: str = f"{config.BASE_URL}/login"
    
    USERNAME_INPUT = (By.ID, "username")
    PASSWORD_INPUT = (By.ID, "password")
    LOGIN_BUTTON = (By.XPATH, "//button[@type='submit']")
    ERROR_MESSAGE = (By.ID, "error-for-username")
    
    def __init__(self, driver: WebDriver) -> None:
        super().__init__(driver)
    
    def navigate_to_login(self) -> "LoginPage":
        self.navigate_to(self.URL)
        return self
    
    def enter_username(self, username: str) -> "LoginPage":
        element = self.wait_until_visible(self.USERNAME_INPUT)
        element.clear()
        element.send_keys(username)
        return self
    
    def enter_password(self, password: str) -> "LoginPage":
        element = self.wait_until_visible(self.PASSWORD_INPUT)
        element.clear()
        element.send_keys(password)
        return self
    
    def click_login_button(self) -> None:
        element = self.wait_until_clickable(self.LOGIN_BUTTON)
        element.click()
    
    def login(self, username: str, password: str) -> bool:
        login_url = self.get_current_url()
        
        self.enter_username(username)
        self.enter_password(password)
        self.click_login_button()
        
        url_changed = self.wait_for_url_change(login_url, timeout=15)
        
        if not url_changed:
            return False
        
        return self._is_login_successful()
    
    def _is_login_successful(self) -> bool:
        current_url = self.get_current_url()
        return "/login" not in current_url and "/checkpoint" not in current_url
    
    def get_error_message(self) -> Optional[str]:
        try:
            element = self.wait_until_visible(self.ERROR_MESSAGE)
            return element.text
        except Exception:
            return None
