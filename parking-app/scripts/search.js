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
  const map = L.map("map").setView([47.9926652764847, 7.8601410291949465], 13); // Deutschland-Zentrum

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  loadParkingData(map);
}

async function loadParkingData(map) {
  const privateParkingPath = "../../database_generator/private_parking.json";
  const publicParkingPath = "../../database_generator/public_parking.json";
  const landlordDataPath = "../../database_generator/landlord_data.json";

  try {
    const [privateResponse, publicResponse, landlordResponse] = await Promise.all([
      fetch(privateParkingPath),
      fetch(publicParkingPath),
      fetch(landlordDataPath)
    ]);

    if (!privateResponse.ok || !publicResponse.ok || !landlordResponse.ok) {
      throw new Error("Fehler beim Laden der JSON-Dateien");
    }

    let privateParking = await privateResponse.json();
    let publicParking = await publicResponse.json();
    const landlordData = await landlordResponse.json();

    privateParking = privateParking.slice(0, 10);
    publicParking = publicParking.slice(0, 10);

    const allParkingData = [...privateParking, ...publicParking];

    const markers = addParkingMarkers(map, privateParking, "red", "Privater Parkplatz");
    markers.push(...addParkingMarkers(map, publicParking, "blue", "Öffentlicher Parkplatz"));

    // Initiale Anzeige der Sidebar
    updateSidebar(allParkingData, markers, landlordData);

    // Event-Listener für Sortierbuttons
    const sortPriceButton = document.getElementById("sort-price");
    const sortCapacityButton = document.getElementById("sort-capacity");

    let priceSortOrder = "asc"; // Standard: Aufsteigend
    let capacitySortOrder = "asc"; // Standard: Aufsteigend

    sortPriceButton.addEventListener("click", () => {
      priceSortOrder = priceSortOrder === "asc" ? "desc" : "asc";
      const sortedData = sortParkingData(allParkingData, `price-${priceSortOrder}`);
      updateSidebar(sortedData, markers, landlordData);
    });

    sortCapacityButton.addEventListener("click", () => {
      capacitySortOrder = capacitySortOrder === "asc" ? "desc" : "asc";
      const sortedData = sortParkingData(allParkingData, `capacity-${capacitySortOrder}`);
      updateSidebar(sortedData, markers, landlordData);
    });

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

function updateSidebar(parkingData, markers, landlordData) {
  const parkingList = document.getElementById("parking-list");
  parkingList.innerHTML = "";

  parkingData.forEach((parking, index) => {
    const parkingItem = document.createElement("div");
    parkingItem.classList.add("parking-item");
    parkingItem.innerHTML = `
      <h3>${parking.name}</h3>
      <p><b>Preis/h:</b> ${parking.price_per_hour} €</p>
      <p><b>Kapazität:</b> ${parking.capacity}</p>
      <p><b>Typ:</b> ${parking.private_id ? "Privat" : "Öffentlich"}</p>
    `;

    // Event-Listener für Klick auf Parkplatz in der Sidebar
    parkingItem.addEventListener("click", () => {
      showParkingDetails(parking, landlordData);
    });

    parkingList.appendChild(parkingItem);
  });

  // Zurück-Button für die Detailansicht
  const backButton = document.getElementById("back-to-list");
  backButton.addEventListener("click", () => {
    document.getElementById("parking-details").classList.add("hidden");
    parkingList.classList.remove("hidden");
    document.querySelector(".sort-container").style.display = "block"; // Sortieroptionen wieder anzeigen
  });
}

function showParkingDetails(parking, landlordData) {
  const detailsContent = document.getElementById("details-content");
  const detailsTitle = document.getElementById("details-title");
  const parkingDetails = document.getElementById("parking-details");
  const parkingList = document.getElementById("parking-list");

  // Vermieterdaten für private Parkplätze
  let landlordInfo = "";
  if (parking.private_id) {
    const landlord = landlordData.find(landlord => landlord.landlord_id === parking.landlord_id);
    if (landlord) {
      landlordInfo = `
        <h3>Vermieterinformationen</h3>
        <p><b>Name:</b> ${landlord.name}</p>
        <p><b>Kontakt:</b> ${landlord.contact_info}</p>
      `;
    }
  }

  // Detailansicht erstellen
  detailsTitle.textContent = parking.name;
  detailsContent.innerHTML = `
    <p><b>Adresse:</b> ${parking.address}, ${parking.city}</p>
    <p><b>Preis/h:</b> ${parking.price_per_hour} €</p>
    <p><b>Kapazität:</b> ${parking.capacity}</p>
    <p><b>Freie Plätze:</b> ${parking.available_space}</p>
    <p><b>Öffnungszeiten:</b> ${parking.opening_time} - ${parking.closing_time}</p>
    <p><b>Geöffnet an:</b> ${parking.open_days ? parking.open_days.join(", ") : "Jeden Tag"}</p>
    <h3>Wie erreiche ich den Parkplatz?</h3>
    <p>Der Parkplatz ist gut mit öffentlichen Verkehrsmitteln erreichbar. Die nächste Haltestelle ist "Hauptbahnhof".</p>
    ${landlordInfo}
  `;

  // Detailansicht anzeigen und Liste ausblenden
  parkingList.classList.add("hidden");
  parkingDetails.classList.remove("hidden");
  document.querySelector(".sort-container").style.display = "none"; // Sortieroptionen ausblenden
}

function sortParkingData(data, sortBy) {
  return data.sort((a, b) => {
    switch (sortBy) {
      case "price-asc":
        return a.price_per_hour - b.price_per_hour;
      case "price-desc":
        return b.price_per_hour - a.price_per_hour;
      case "capacity-asc":
        return a.capacity - b.capacity;
      case "capacity-desc":
        return b.capacity - a.capacity;
      default:
        return 0;
    }
  });
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


