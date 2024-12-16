// Karte initialisieren
document.addEventListener("DOMContentLoaded", () => {
    const map = L.map('map').setView([48.00649, 7.90586], 13); // Freiburg
  
    // OpenStreetMap-Kachel hinzufügen
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
  
    // JSON-Daten laden
    const dataPath = "data/private_parking_freiburg.json"; // Relativer Pfad
  
    fetch(dataPath)
      .then((response) => {
        if (!response.ok) throw new Error(`Fehler beim Laden der Datei: ${response.statusText}`);
        return response.json();
      })
      .then((parkingData) => {
        // Marker für jeden Parkplatz hinzufügen
        parkingData.forEach((parking) => {
          const marker = L.marker([parking.latitude, parking.longitude]).addTo(map);
  
          // Popup für den Marker hinzufügen
          marker.bindPopup(`
            <b>${parking.name}</b><br>
            Adresse: ${parking.address}<br>
            Preis: ${parking.price} €/Tag<br>
            Verfügbarkeit: ${parking.available_space} Plätze<br>
            Öffnungszeiten: ${parking.opening_time}<br>
            Besonderheiten: ${parking.special_access}
          `);
        });
      })
      .catch((error) => console.error("Fehler beim Verarbeiten der JSON-Daten:", error));
  });
  