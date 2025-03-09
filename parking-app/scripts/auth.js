document.addEventListener("DOMContentLoaded", () => {
  let currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const userDataPath = "user_data.json";

  // Funktion zum Laden der Benutzerdaten
  const loadUsers = async () => {
    try {
      const response = await fetch(userDataPath);
      if (!response.ok) throw new Error("Fehler beim Laden der Benutzerdaten.");
      return await response.json();
    } catch (error) {
      console.error(error);
      return [];
    }
  };

  // Funktion zum Speichern der Benutzerdaten in localStorage
  const saveUsersToLocalStorage = (users) => {
    localStorage.setItem("users", JSON.stringify(users));
  };

  // Funktion zum Laden der Benutzerdaten aus localStorage
  const loadUsersFromLocalStorage = () => {
    return JSON.parse(localStorage.getItem("users")) || [];
  };

  // Benutzerdaten beim Laden der Seite in localStorage speichern, wenn noch keine Benutzer vorhanden sind
  (async () => {
    if (!localStorage.getItem("users")) {
      const users = await loadUsers();
      saveUsersToLocalStorage(users);
    }
  })();

  // DOM-Elemente
  const authModal = document.getElementById("auth-modal");
  const authLink = document.getElementById("auth-link");
  const closeAuth = document.getElementById("close-auth");
  const authForm = document.getElementById("auth-form");
  const authModalTitle = document.getElementById("auth-modal-title");
  const authSubmitButton = document.getElementById("auth-submit-button");
  const switchAuthModeButton = document.getElementById("switch-auth-mode");
  const loginFields = document.getElementById("login-fields");
  const createAccountFields = document.getElementById("create-account-fields");
  const welcomeMessage = document.getElementById("welcome-message"); // Neues Element für die Willkommensnachricht

  let isLoginMode = true;

  // RegEx für Adresse: Straße Hausnummer, Stadt
  const validateAddress = (address) => {
    const addressPattern = /^[A-Za-zÄÖÜäöüß]+\s[0-9]+\s*,\s*[A-Za-zÄÖÜäöüß\s]+$/;
    return addressPattern.test(address);
  };

  // Funktion zur Aktualisierung der UI basierend auf dem Anmeldezustand
  // nachher diese (${currentUser.username} | ${currentUser.user_id} | ${currentUser.address}) einfach raus nehemen
  const updateAuthUI = () => {
    if (currentUser) {
      authLink.textContent = `Abmelden`; // Zeige username, user_id und Adresse an
      welcomeMessage.textContent = `Willkommen ${currentUser.name}`; // Zeige den Namen des Benutzers an
    } else {
      authLink.textContent = "Anmelden";
      welcomeMessage.textContent = ""; // Leere die Willkommensnachricht, wenn niemand angemeldet ist
    }
  };  
  updateAuthUI();

  // Event-Listener für den Anmelden/Abmelden-Button
  authLink.addEventListener("click", () => {
    if (currentUser) {
      // Abmelden
      localStorage.removeItem("currentUser");
      currentUser = null;
      alert("Erfolgreich abgemeldet.");
      updateAuthUI();
    } else {
      // Anmelden
      authModal.style.display = "block";
    }
  });

  // Modal schließen
  closeAuth.addEventListener("click", () => {
    authModal.style.display = "none";
  });

  // Modal schließen bei Klick außerhalb
  window.addEventListener("click", (event) => {
    if (event.target === authModal) {
      authModal.style.display = "none";
    }
  });

  // Wechsel zwischen Login und Konto erstellen
  switchAuthModeButton.addEventListener("click", () => {
    isLoginMode = !isLoginMode;
    authModalTitle.textContent = isLoginMode ? "Login" : "Konto erstellen";
    authSubmitButton.textContent = isLoginMode ? "Einloggen" : "Konto erstellen";
    switchAuthModeButton.textContent = isLoginMode ? "Konto erstellen" : "Login";
    loginFields.classList.toggle("hidden", !isLoginMode);
    createAccountFields.classList.toggle("hidden", isLoginMode);
  });

  // Formular absenden
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const users = loadUsersFromLocalStorage();

    if (isLoginMode) {
      // Login-Logik
      const email = document.getElementById("email-login").value;
      const password = document.getElementById("password-login").value;

      const user = users.find((user) => user.email === email && user.password === password);

      if (user) {
        currentUser = user;
        localStorage.setItem("currentUser", JSON.stringify(user));
        alert("Erfolgreich eingeloggt.");
        authModal.style.display = "none";
        updateAuthUI();
      } else {
        // Überprüfen, ob die E-Mail existiert
        const emailExists = users.some((user) => user.email === email);
        if (!emailExists) {
          alert("Diese E-Mail-Adresse ist nicht registriert.");
        } else {
          alert("Ungültiges Passwort.");
        }
      }
    } else {
      // Konto erstellen
      const name = document.getElementById("name-create").value;
      const email = document.getElementById("email-create").value;
      const password = document.getElementById("password-create").value;
      const licensePlate = document.getElementById("license-plate-create").value;
      const address = document.getElementById("address-create").value;

      // Überprüfen, ob alle Pflichtfelder ausgefüllt sind
      if (!email || !password || !name || !licensePlate || !address) {
        alert("Bitte füllen Sie alle Pflichtfelder aus.");
        return;
      }

      // Überprüfen, ob die Adresse im richtigen Format ist
      if (!validateAddress(address)) {
        alert("Die Adresse muss das Format 'Straße Hausnummer, Stadt' haben.");
        return;
      }

      // Überprüfen, ob E-Mail, Nummernschild oder Adresse bereits existieren
      const emailExists = users.some((user) => user.email === email);
      const licensePlateExists = users.some((user) => user.license_plate_number === licensePlate);
      const addressExists = users.some((user) => user.address === address);

      if (emailExists) {
        alert("Diese E-Mail-Adresse ist bereits registriert.");
        return;
      }
      if (licensePlateExists) {
        alert("Dieses Nummernschild ist bereits registriert.");
        return;
      }
      if (addressExists) {
        alert("Diese Adresse ist bereits in einem anderen Konto registriert.");
        return;
      }

      // Neuen Benutzer erstellen
      const newUser = {
        user_id: "UID" + Math.floor(Math.random() * 100000),
        name,
        username: email.split("@")[0],
        password,
        license_plate_number: licensePlate,
        credits: 0,
        email,
        phone_number: "",
        address,
      };

      users.push(newUser);
      saveUsersToLocalStorage(users);

      alert("Konto erfolgreich erstellt.");
      authModal.style.display = "none";
    }
  });
});