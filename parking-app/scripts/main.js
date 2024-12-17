document.addEventListener("DOMContentLoaded", () => {
  // Initialisierung der Karte und Parkplatzfilter
  const map = L.map("map").setView([48.00649, 7.90586], 13); // Freiburg
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
  }).addTo(map);

  const dataPath = "data/private_parking_freiburg.json"; // JSON Pfad
  let allParkingData = []; // Speichert alle Parkplatzdaten
  let filteredData = []; // Speichert gefilterte Daten

  // Filter Eingabefelder
  const locationInput = document.getElementById("location");
  const priceInput = document.getElementById("price");
  const distanceInput = document.getElementById("distance");
  const startDateInput = document.getElementById("start-date");
  const endDateInput = document.getElementById("end-date");
  const filterForm = document.getElementById("filter-form");

  // Lade Parkplatzdaten
  fetch(dataPath)
    .then((response) => response.json())
    .then((data) => {
      allParkingData = data;
      filteredData = data;
      renderMarkers(filteredData);
    })
    .catch((error) => console.error("Fehler beim Laden der JSON-Daten:", error));

  // Funktion zum Rendern der Marker auf der Karte
  function renderMarkers(data) {
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    data.forEach((parking) => {
      const marker = L.marker([parking.latitude, parking.longitude]).addTo(map);
      marker.bindPopup(
        `<b>${parking.name}</b><br>
        Adresse: ${parking.address}<br>
        Preis: ${parking.price} €/Tag<br>
        Verfügbarkeit: ${parking.available_space} Plätze<br>
        Öffnungszeiten: ${parking.opening_time}<br>
        Besonderheiten: ${parking.special_access}`
      );
    });
  }

  // Filter anwenden
  filterForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const maxPrice = parseFloat(priceInput.value) || Infinity;
    const maxDistance = parseFloat(distanceInput.value) || Infinity;
    const searchLocation = locationInput.value.toLowerCase();
    const startDate = startDateInput.value ? new Date(startDateInput.value) : null;
    const endDate = endDateInput.value ? new Date(endDateInput.value) : null;

    filteredData = allParkingData.filter((parking) => {
      const priceMatches = parking.price <= maxPrice;
      const locationMatches = parking.address.toLowerCase().includes(searchLocation);

      let dateMatches = true;
      if (startDate && endDate) {
        const { startDate: parkingStartDate, endDate: parkingEndDate } = parseDateRange(parking.opening_time);
        if (startDate > parkingEndDate || endDate < parkingStartDate) {
          dateMatches = false;
        }
      }

      return priceMatches && locationMatches && dateMatches;
    });

    renderMarkers(filteredData);
  });

  // Konto erstellen
  const createAccountForm = document.getElementById("create-account-form");
  createAccountForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email-create").value;
    const password = document.getElementById("password-create").value;

    let users = JSON.parse(localStorage.getItem("users")) || [];
    if (users.find((user) => user.email === email)) {
      alert("Diese E-Mail-Adresse ist bereits registriert.");
      return;
    }

    users.push({ email, password });
    localStorage.setItem("users", JSON.stringify(users));
    alert("Konto erfolgreich erstellt.");
  });

  // Login
  const loginForm = document.getElementById("login-form");
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email-login").value;
    const password = document.getElementById("password-login").value;

    let users = JSON.parse(localStorage.getItem("users")) || [];
    const user = users.find((user) => user.email === email && user.password === password);

    if (user) {
      alert("Erfolgreich eingeloggt.");
    } else {
      alert("Ungültige E-Mail oder Passwort.");
    }
  });
});

// Öffnen und Schließen der Modal-Fenster für Login und Konto erstellen
const loginLink = document.getElementById('login-link');
const createAccountLink = document.getElementById('create-account-link');
const loginModal = document.getElementById('login-modal');
const createAccountModal = document.getElementById('create-account-modal');
const closeLogin = document.getElementById('close-login');
const closeCreateAccount = document.getElementById('close-create-account');

loginLink.onclick = () => {
  loginModal.style.display = "block";
};

createAccountLink.onclick = () => {
  createAccountModal.style.display = "block";
};

closeLogin.onclick = () => {
  loginModal.style.display = "none";
};

closeCreateAccount.onclick = () => {
  createAccountModal.style.display = "none";
};

// Schließen der Modal-Fenster, wenn der Benutzer außerhalb klickt
window.onclick = function(event) {
  if (event.target === loginModal) {
    loginModal.style.display = "none";
  }
  if (event.target === createAccountModal) {
    createAccountModal.style.display = "none";
  }
};
