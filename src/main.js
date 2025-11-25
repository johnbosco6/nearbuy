import './styles/style.css';
import { registerSW } from 'virtual:pwa-register';
import NavBar from './components/NavBar.js';
import Scanner from './components/Scanner.js';
import ProductCard from './components/ProductCard.js';
import StoreMap from './components/StoreMap.js';
import { getProduct } from './services/api.js';
import { getUserLocation, getNearbyStores, geocodeCity } from './services/location.js';
import { addToHistory, getHistory, clearHistory, getUserProfile, saveUserProfile } from './services/storage.js';
import { getAllDeals, getDealsByCity, getDealsByStore } from './services/deals.js';

// Register Service Worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Nowa wersja dostępna. Odświeżyć?')) {
      updateSW(true);
    }
  },
});

const app = document.querySelector('#app');

// State
let currentState = 'home';
let currentProduct = null;
let mapInstance = null;

function render() {
  let content = '';
  const profile = getUserProfile();

  if (currentState === 'home') {
    const history = getHistory().slice(0, 3);
    const historyHtml = history.length > 0
      ? history.map(h => `
          <div class="history-item" onclick="window.location.hash = '#product:${h.barcode}'">
            <div class="history-info">
                <span class="history-name">${h.name || 'Nieznany produkt'}</span>
                <span class="history-date">${new Date(h.date).toLocaleDateString()}</span>
            </div>
            <span>➡️</span>
          </div>
        `).join('')
      : '<p style="color: var(--text-light); text-align: center;">Brak historii skanowania.</p>';

    content = `
      <div id="home-view" class="fade-in">
        <div class="hero">
            <h2>Cześć, ${profile.name || 'Gościu'}! 👋</h2>
            <p>Znajdź najlepsze produkty i sklepy w Twojej okolicy.</p>
            <button class="scan-btn-large" data-target="scan">📷 Zeskanuj teraz</button>
        </div>

        <div class="category-section">
            <div class="category-title">🛒 Retail & Supermarkets</div>
            <div class="store-grid">
                <a href="https://www.biedronka.pl" target="_blank" class="store-logo" style="background: #e30613;">Biedronka</a>
                <a href="https://www.lidl.pl" target="_blank" class="store-logo" style="background: #0050aa;">Lidl</a>
                <a href="https://www.zabka.pl" target="_blank" class="store-logo" style="background: #006837;">Żabka</a>
                <a href="https://www.auchan.pl" target="_blank" class="store-logo" style="background: #e01e37;">Auchan</a>
                <a href="https://www.carrefour.pl" target="_blank" class="store-logo" style="background: #0071ce;">Carrefour</a>
                <a href="https://www.allegro.pl" target="_blank" class="store-logo" style="background: #ff6600;">Allegro</a>
            </div>
        </div>

        <div class="category-section">
            <div class="category-title">👕 Fashion & Clothing</div>
            <div class="store-grid">
                <a href="https://www.zara.com/pl" target="_blank" class="store-logo" style="background: #000;">Zara</a>
                <a href="https://www2.hm.com/pl_pl" target="_blank" class="store-logo" style="background: #e4002b;">H&M</a>
                <a href="https://www.reserved.com/pl" target="_blank" class="store-logo" style="background: #1e1e1e;">Reserved</a>
                <a href="https://www.c-and-a.com/pl" target="_blank" class="store-logo" style="background: #00539f;">C&A</a>
                <a href="https://www.pullandbear.com/pl" target="_blank" class="store-logo" style="background: #8b4513;">Pull&Bear</a>
            </div>
        </div>

        <div class="category-section">
            <div class="category-title">📱 Electronics & Tech</div>
            <div class="store-grid">
                <a href="https://www.mediamarkt.pl" target="_blank" class="store-logo" style="background: #e30613;">MediaMarkt</a>
                <a href="https://www.euro.com.pl" target="_blank" class="store-logo" style="background: #0066cc;">RTV Euro AGD</a>
                <a href="https://www.x-kom.pl" target="_blank" class="store-logo" style="background: #ff6600;">x-kom</a>
                <a href="https://www.mediaexpert.pl" target="_blank" class="store-logo" style="background: #000;">Media Expert</a>
                <a href="https://www.samsung.com/pl" target="_blank" class="store-logo" style="background: #0071ce;">Samsung</a>
            </div>
        </div>

        <div class="category-section">
            <div class="category-title">🏬 Malls & Shopping Centers</div>
            <div class="store-grid">
                <a href="https://www.galeriakrakowska.pl" target="_blank" class="store-logo" style="background: #d4af37;">Galeria Krakowska</a>
                <a href="https://arkadia.com.pl" target="_blank" class="store-logo" style="background: #c41e3a;">Arkadia</a>
                <a href="https://www.zlotetarasy.pl" target="_blank" class="store-logo" style="background: #003366;">Złote Tarasy</a>
            </div>
        </div>

        <h3 class="section-title">Co chcesz zrobić?</h3>
        <div class="features-grid">
            <div class="feature-card" data-target="scan">
                <span class="feature-icon">🔍</span>
                Skanuj
            </div>
            <div class="feature-card" data-target="map">
                <span class="feature-icon">🗺️</span>
                Mapa
            </div>
            <div class="feature-card" data-target="profile">
                <span class="feature-icon">👤</span>
                Profil
            </div>
        </div>

        <div class="recent-scans">
            <h3 class="section-title">Ostatnie skany</h3>
            ${historyHtml}
        </div>
      </div>
    `;
  } else if (currentState === 'deals') {
    const allDeals = getAllDeals();
    const cities = [...new Set(allDeals.map(d => d.city))];
    const stores = [...new Set(allDeals.map(d => d.store))];

    content = `
      <div id="deals-view" class="fade-in">
        <h2 class="section-title">🎟️ Oferty i Kupony</h2>
        
        <div class="product-card" style="text-align: left; margin-bottom: 1.5rem;">
          <div class="form-group">
            <label>Filtruj po mieście</label>
            <select id="city-filter" class="form-input">
              <option value="">Wszystkie miasta</option>
              ${cities.map(city => `<option value="${city}">${city}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Filtruj po sklepie</label>
            <select id="store-filter" class="form-input">
              <option value="">Wszystkie sklepy</option>
              ${stores.map(store => `<option value="${store}">${store}</option>`).join('')}
            </select>
          </div>
        </div>

        <div id="deals-container">
          ${allDeals.map(deal => `
            <div class="deal-card">
              <div class="deal-header">
                <span class="deal-store">${deal.store}</span>
                <span class="deal-discount">${deal.discount}</span>
              </div>
              <h3 class="deal-product">${deal.product}</h3>
              <div class="deal-details">
                <span class="deal-price">💰 ${deal.price}</span>
                <span class="deal-city">📍 ${deal.city}</span>
              </div>
              <div class="deal-validity">Ważne do: ${deal.validUntil}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (currentState === 'scan') {
    content = `
      <div id="scan-view" class="fade-in">
        <h3 class="section-title">Skanowanie...</h3>
        <div id="interactive" class="viewport"></div>
        <button class="btn-secondary" style="margin-top: 1rem;" data-target="home">Anuluj</button>
      </div>
    `;
  } else if (currentState === 'map') {
    content = `
      <div id="map-view" class="fade-in" style="height: 100%;">
        <button class="map-close-btn" data-target="home">✕</button>
        <div class="map-container">
            <div class="map-search-bar">
                <input type="text" id="map-search-input" class="map-search-input" placeholder="Szukaj produktu (np. buty) lub sklepu...">
                <button id="map-search-btn" class="map-search-btn">🔍</button>
            </div>
            <div id="full-map" style="height: 100%; width: 100%;"></div>
        </div>
      </div>
    `;
  } else if (currentState === 'product') {
    content = `
      <div id="product-view" class="fade-in">
        <button class="back-btn" data-target="home">← Wróć</button>
        ${currentProduct ? ProductCard(currentProduct) : '<p>Ładowanie produktu...</p>'}
        <h3 class="section-title" style="margin-top: 1.5rem;">Dostępność w pobliżu</h3>
        <div id="map" style="height: 300px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);"></div>
      </div>
    `;
  } else if (currentState === 'profile') {
    const history = getHistory();
    const historyHtml = history.length > 0
      ? history.map(h => `
          <div class="history-item" onclick="window.location.hash = '#product:${h.barcode}'">
            <div class="history-info">
                <span class="history-name">${h.name || 'Nieznany produkt'}</span>
                <span class="history-date">${new Date(h.date).toLocaleDateString()}</span>
            </div>
          </div>
        `).join('')
      : '<p>Brak historii.</p>';

    content = `
      <div id="profile-view" class="fade-in">
        <h2 class="section-title">Twój Profil</h2>
        
        <div class="product-card" style="text-align: left;">
            <div class="form-group">
                <label>Imię</label>
                <input type="text" id="profile-name" class="form-input" value="${profile.name || ''}" placeholder="Wpisz swoje imię">
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="profile-email" class="form-input" value="${profile.email || ''}" placeholder="twoj@email.com">
            </div>
            <div class="form-group">
                <label>Lokalizacja (Miasto)</label>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="profile-city" class="form-input" value="${profile.location?.name || ''}" placeholder="np. Warszawa">
                    <button id="detect-location" class="btn-secondary" style="width: auto; margin: 0;">📍</button>
                </div>
                <small style="color: var(--text-light);">Zostaw puste, aby używać GPS.</small>
            </div>
            <button id="save-profile" class="btn-primary">Zapisz zmiany</button>
        </div>

        <h3 class="section-title">Pełna historia</h3>
        <div class="history-list">
            ${historyHtml}
        </div>
        
        <button id="clear-history" class="btn-secondary" style="margin-top: 2rem; color: #ff4757;">Wyczyść historię</button>
      </div>
    `;
  }

  app.innerHTML = `
    <div class="app-container">
      <header class="app-header">
        <div class="header-content">
          <div class="app-logo">📍</div>
          <h1>NearBuY</h1>
        </div>
      </header>
      <main id="main-content">
        ${content}
      </main>
      <nav id="bottom-nav">
        ${NavBar(currentState)}
      </nav>
    </div>
  `;

  // Post-render logic
  if (currentState === 'scan') {
    Scanner('interactive', onBarcodeDetected);
  } else if (currentState === 'product' && currentProduct) {
    initMap('map');
  } else if (currentState === 'map') {
    initFullMap();
    document.getElementById('map-search-btn').addEventListener('click', handleMapSearch);
    document.getElementById('map-search-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleMapSearch();
    });
  } else if (currentState === 'deals') {
    // Add filter event listeners
    document.getElementById('city-filter').addEventListener('change', filterDeals);
    document.getElementById('store-filter').addEventListener('change', filterDeals);
  } else if (currentState === 'profile') {
    document.getElementById('save-profile').addEventListener('click', async () => {
      const name = document.getElementById('profile-name').value;
      const email = document.getElementById('profile-email').value;
      const city = document.getElementById('profile-city').value;

      let location = null;
      if (city) {
        const geocoded = await geocodeCity(city);
        if (geocoded) {
          location = geocoded;
        } else {
          alert('Nie znaleziono miasta. Spróbuj ponownie.');
          return;
        }
      }

      saveUserProfile({ name, email, location });
      alert('Profil zapisany!');
      render();
    });

    document.getElementById('detect-location').addEventListener('click', async () => {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        // Reverse geocoding could go here, but for now we just clear the manual entry to use GPS
        document.getElementById('profile-city').value = '';
        alert('Używam GPS (zapisz profil, aby potwierdzić).');
      } catch (e) {
        alert('Błąd GPS: ' + e.message);
      }
    });

    document.getElementById('clear-history').addEventListener('click', () => {
      if (confirm('Czy na pewno chcesz wyczyścić historię?')) {
        clearHistory();
        render();
      }
    });
  }

  attachEvents();
}

function attachEvents() {
  document.querySelectorAll('[data-target]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.currentTarget.dataset.target;
      navigateTo(target);
    });
  });
}

function navigateTo(state) {
  currentState = state;
  render();
}

async function onBarcodeDetected(code) {
  console.log('Barcode detected:', code);
  currentState = 'product';
  currentProduct = null;
  render();

  const product = await getProduct(code);
  if (product) {
    currentProduct = product;
    addToHistory(product);
    render();
  } else {
    alert('Produkt nie znaleziony w bazach danych.');
    navigateTo('home');
  }
}

async function initMap(elementId) {
  try {
    const location = await getUserLocation();
    const stores = await getNearbyStores(location.lat, location.lng);
    StoreMap(elementId, location.lat, location.lng, stores);
  } catch (error) {
    console.error('Location error:', error);
    const el = document.getElementById(elementId);
    if (el) el.innerHTML = '<p>Nie można pobrać lokalizacji.</p>';
  }
}

async function initFullMap() {
  try {
    const location = await getUserLocation();
    // Default to supermarkets if no search
    const stores = await getNearbyStores(location.lat, location.lng);
    mapInstance = StoreMap('full-map', location.lat, location.lng, stores);
  } catch (error) {
    console.error('Map error:', error);
  }
}

async function handleMapSearch() {
  const query = document.getElementById('map-search-input').value;
  if (!query) return;

  try {
    const location = await getUserLocation();
    const stores = await getNearbyStores(location.lat, location.lng, query);

    // Re-init map with new stores (simple approach)
    if (mapInstance) {
      mapInstance.remove(); // Leaflet remove
    }
    mapInstance = StoreMap('full-map', location.lat, location.lng, stores);
  } catch (error) {
    console.error('Search error:', error);
    alert('Błąd wyszukiwania.');
  }
}

function filterDeals() {
  const cityFilter = document.getElementById('city-filter').value;
  const storeFilter = document.getElementById('store-filter').value;

  let deals = getAllDeals();

  if (cityFilter) {
    deals = getDealsByCity(cityFilter);
  }

  if (storeFilter) {
    deals = deals.filter(d => d.store === storeFilter);
  }

  const container = document.getElementById('deals-container');
  container.innerHTML = deals.map(deal => `
    <div class="deal-card">
      <div class="deal-header">
        <span class="deal-store">${deal.store}</span>
        <span class="deal-discount">${deal.discount}</span>
      </div>
      <h3 class="deal-product">${deal.product}</h3>
      <div class="deal-details">
        <span class="deal-price">💰 ${deal.price}</span>
        <span class="deal-city">📍 ${deal.city}</span>
      </div>
      <div class="deal-validity">Ważne do: ${deal.validUntil}</div>
    </div>
  `).join('');
}

window.addEventListener('hashchange', () => {
  const hash = window.location.hash;
  if (hash.startsWith('#product:')) {
    const barcode = hash.split(':')[1];
    onBarcodeDetected(barcode);
    history.replaceState(null, null, ' ');
  }
});

render();
