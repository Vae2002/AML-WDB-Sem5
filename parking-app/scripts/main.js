// main.js

document.addEventListener("DOMContentLoaded", function () {
    const locationInput = document.getElementById("location-input");
    const dropdownBtn = document.getElementById("dropdown-btn");
    const dropdownContent = document.getElementById("dropdown-content");
    const dropdown = document.getElementById("weekday-dropdown");

    // Standort eingeben -> Zeige Dropdown für Wochentage
    locationInput.addEventListener("input", function () {
        if (locationInput.value.trim() !== "") {
            dropdown.classList.remove("hidden");
        } else {
            dropdown.classList.add("hidden");
        }
    });

    // Öffnet/Schließt das Dropdown für Wochentage
    dropdownBtn.addEventListener("click", function () {
        dropdown.classList.toggle("active");
    });

    // Schließt Dropdown, wenn man außerhalb klickt
    document.addEventListener("click", function (event) {
        if (!dropdown.contains(event.target) && event.target !== dropdownBtn) {
            dropdown.classList.remove("active");
        }
    });
});



