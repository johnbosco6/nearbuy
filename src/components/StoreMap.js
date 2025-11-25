import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function StoreMap(elementId, lat, lng, stores = []) {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Clear existing map if any
    element.innerHTML = '';

    // Create clean, simple map
    const map = L.map(elementId, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: true,
        scrollWheelZoom: true
    });

    // Standard OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // User location marker (standard blue)
    const userMarker = L.marker([lat, lng]).addTo(map);
    userMarker.bindPopup(`
        <div class="map-popup-simple">
            <strong>📍 Twoja lokalizacja</strong>
        </div>
    `).openPopup();

    // Store markers (standard red)
    stores.forEach((store) => {
        if (store.lat && store.lon) {
            const storeName = store.tags?.name || 'Sklep';
            const storeBrand = store.tags?.brand || '';

            const marker = L.marker([store.lat, store.lon]).addTo(map);

            marker.bindPopup(`
                <div class="map-popup-simple">
                    <strong>🏪 ${storeName}</strong>
                    ${storeBrand ? `<p>${storeBrand}</p>` : ''}
                    <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lon}', '_blank')" class="map-nav-btn">
                        🧭 Nawiguj
                    </button>
                </div>
            `);
        }
    });

    // Fit bounds to show all markers
    if (stores.length > 0) {
        const bounds = L.latLngBounds([[lat, lng]]);
        stores.forEach(store => {
            if (store.lat && store.lon) {
                bounds.extend([store.lat, store.lon]);
            }
        });
        map.fitBounds(bounds, { padding: [50, 50] });
    }

    return map;
}
