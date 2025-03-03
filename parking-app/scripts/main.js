document.addEventListener("DOMContentLoaded", () => {
    const privateParkingPath = "../../database_generator/private_parking.json";
    const publicParkingPath = "../../database_generator/public_parking.json";

    function initMap() {
        const map = L.map("map").setView([51.1657, 10.4515], 6); // Deutschland-Zentrum

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors"
        }).addTo(map);

        loadParkingData(map);
    }

    async function loadParkingData(map) {
        try {
            const privateResponse = await fetch(privateParkingPath);
            const publicResponse = await fetch(publicParkingPath);

            if (!privateResponse.ok || !publicResponse.ok) {
                throw new Error("Fehler beim Laden der JSON-Dateien");
            }

            let privateParking = await privateResponse.json();
            let publicParking = await publicResponse.json();

            // Zeige nur die Top 10 Einträge aus beiden Listen an
            privateParking = privateParking.slice(0, 10);
            publicParking = publicParking.slice(0, 10);

            addParkingMarkers(map, privateParking, "red", "Privater Parkplatz");
            addParkingMarkers(map, publicParking, "blue", "Öffentlicher Parkplatz");

            // Falls alle Parkplätze angezeigt werden sollen, entferne die Kommentare:
            // addParkingMarkers(map, privateParking, "red", "Privater Parkplatz");
            // addParkingMarkers(map, publicParking, "blue", "Öffentlicher Parkplatz");

        } catch (error) {
            console.error("Fehler beim Laden der Parkdaten:", error);
        }
    }

    function addParkingMarkers(map, data, color, type) {
        data.forEach(parking => {
            const {
                latitude, 
                longitude, 
                name, 
                address, 
                city, 
                price_per_hour, 
                capacity, 
                available_space, 
                opening_time, 
                closing_time, 
                open_days, 
                special_access, 
                note_area, 
                key_access_info
            } = parking;

            // Erstelle die Popup-Nachricht mit allen relevanten Informationen
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

            // Falls spezielle Zugangsinfos vorhanden sind, hinzufügen
            if (special_access) {
                popupContent += `<b>Besonderer Zugang:</b> ${special_access}<br>`;
            }
            if (note_area) {
                popupContent += `<b>Hinweis:</b> ${note_area}<br>`;
            }
            if (key_access_info) {
                popupContent += `<b>Schlüssel-Info:</b> ${key_access_info}<br>`;
            }

            L.marker([latitude, longitude], { icon: createIcon(color) })
                .addTo(map)
                .bindPopup(popupContent);
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

    initMap();
});
