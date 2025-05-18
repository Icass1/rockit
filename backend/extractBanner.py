from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options

# 1) Inicialización del WebDriver (ajustar el path a chromedriver)
service = Service('chromedriver')
options = Options()
options.add_argument("--headless")
driver = webdriver.Chrome(service=service, options=options)

try:
    artist_id = "3YQKmKGau1PzlVlkL1iodx"
    url = f"https://open.spotify.com/artist/{artist_id}"
    
    # 2) Cargar la página
    driver.get(url)
    
    # 3) Ejecutar el JavaScript para extraer la URL del banner
    js = '''
    const bannerDiv = document.querySelector('div[data-testid="background-image"]');
    if (!bannerDiv) return null;
    return bannerDiv.style.backgroundImage.slice(5, -2);
    '''
    banner_url = driver.execute_script(js)
    
    print("Banner URL:", banner_url)
finally:
    driver.quit()
