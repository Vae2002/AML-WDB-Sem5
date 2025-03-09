document.addEventListener("DOMContentLoaded", () => {
  const filterBtn = document.getElementById("filter-btn");
  const filterPopup = document.getElementById("filter-popup");
  const closeFilter = document.getElementById("close-filter");

  // Zeige das Filter-Pop-up an und verstecke den Button
  filterBtn.addEventListener("click", () => {
    filterPopup.style.display = "block";
    filterBtn.style.display = "none";
  });

  // Schließe das Filter-Pop-up und zeige den Button wieder an
  closeFilter.addEventListener("click", () => {
    filterPopup.style.display = "none";
    filterBtn.style.display = "block";
  });

  // Karte initialisieren und laden
  initMap();
});

function initMap() {
  const map = L.map("map").setView([51.1657, 10.4515], 6); // Deutschland-Zentrum

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  loadParkingData(map);
}

async function loadParkingData(map) {
  try {
    // Hole die Daten von der Flask-Route
    const response = await fetch('/recommend');
    if (!response.ok) {
      throw new Error("Fehler beim Laden der Parkdaten");
    }

    const data = await response.json();

    // Verarbeite die Daten und zeige sie in der Sidebar an
    updateSidebar(data.top15_private, data.top1_public);

    // Füge Marker für die Parkplätze hinzu
    const markers = addParkingMarkers(map, data.top15_private, "red", "Privater Parkplatz");
    markers.push(...addParkingMarkers(map, data.top1_public, "blue", "Öffentlicher Parkplatz"));

  } catch (error) {
    console.error("Fehler beim Laden der Parkdaten:", error);
  }
}

function addParkingMarkers(map, data, color, type) {
  const markers = [];
  data.forEach(parking => {
    const { latitude, longitude, name, address, city, price_per_hour, capacity, available_space, opening_time, closing_time, open_days } = parking;

    let popupContent = `
      <b>${name}</b><br>
      <b>Typ:</b> ${type}<br>
      <b>Adresse:</b> ${address}, ${city}<br>
      <b>Preis/h:</b> ${price_per_hour ? price_per_hour + " €" : "Kostenlos"}<br>
      <b>Kapazität:</b> ${capacity}<br>
      <b>Freie Plätze:</b> ${available_space}<br>
      <b>Öffnungszeiten:</b> ${opening_time} - ${closing_time}<br>
      <b>Geöffnet an:</b> ${open_days ? open_days.join(", ") : "Jeden Tag"}<br>
    `;

    const marker = L.marker([latitude, longitude], { icon: createIcon(color) })
      .addTo(map)
      .bindPopup(popupContent);

    // Event-Listener für Klick auf Marker
    marker.on("click", () => {
      showParkingDetails(parking);
    });

    markers.push({ marker, parking });
  });
  return markers;
}

function updateSidebar(privateParkingData, publicParkingData) {
  const privateParkingList = document.getElementById("private-parking-list");
  const publicParkingList = document.getElementById("public-parking-list");

  privateParkingList.innerHTML = "";
  publicParkingList.innerHTML = "";

  privateParkingData.forEach(parking => {
    const parkingItem = document.createElement("li");
    parkingItem.textContent = `${parking.name} - ${parking.address} (${parking.calc_distance} km)`;
    privateParkingList.appendChild(parkingItem);
  });

  publicParkingData.forEach(parking => {
    const parkingItem = document.createElement("li");
    parkingItem.textContent = `${parking.name} - ${parking.address} (${parking.calc_distance} km)`;
    publicParkingList.appendChild(parkingItem);
  });
}

function showParkingDetails(parking) {
  const detailsContent = document.getElementById("details-content");
  const detailsTitle = document.getElementById("details-title");
  const parkingDetails = document.getElementById("parking-details");
  const parkingList = document.getElementById("parking-list");

  // Detailansicht erstellen
  detailsTitle.textContent = parking.name;
  detailsContent.innerHTML = `
    <p><b>Adresse:</b> ${parking.address}, ${parking.city}</p>
    <p><b>Preis/h:</b> ${parking.price_per_hour} €</p>
    <p><b>Kapazität:</b> ${parking.capacity}</p>
    <p><b>Freie Plätze:</b> ${parking.available_space}</p>
    <p><b>Öffnungszeiten:</b> ${parking.opening_time} - ${parking.closing_time}</p>
    <p><b>Geöffnet an:</b> ${parking.open_days ? parking.open_days.join(", ") : "Jeden Tag"}</p>
  `;

  // Detailansicht anzeigen und Liste ausblenden
  parkingList.classList.add("hidden");
  parkingDetails.classList.remove("hidden");
}

function createIcon(color) {
  return L.icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
}