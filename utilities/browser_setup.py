import platform
from typing import Optional

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.remote.webdriver import WebDriver
from webdriver_manager.chrome import ChromeDriverManager

import config


def get_operating_system() -> str:
    return platform.system().lower()


def get_driver_path() -> str:
    driver_path = ChromeDriverManager().install()
    return driver_path


def get_chrome_options(headless: Optional[bool] = None) -> Options:
    options = Options()
    current_os = get_operating_system()
    use_headless = headless if headless is not None else (current_os == "linux")
    
    if use_headless:
        options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
    
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-popup-blocking")
    options.add_argument("--start-maximized")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)
    
    return options


def initialize_driver(headless: Optional[bool] = None) -> WebDriver:
    current_os = get_operating_system()
    print(f"[INFO] Detected OS: {current_os}")
    
    options = get_chrome_options(headless=headless)
    
    print(f"[INFO] Setting up ChromeDriver in 'driver/' directory...")
    driver_path = get_driver_path()
    print(f"[INFO] ChromeDriver path: {driver_path}")
    
    service = Service(executable_path=driver_path)
    driver = webdriver.Chrome(service=service, options=options)
    
    driver.implicitly_wait(config.IMPLICIT_WAIT)
    driver.set_page_load_timeout(config.PAGE_LOAD_TIMEOUT)
    
    print("[INFO] WebDriver initialized successfully")
    
    return driver
