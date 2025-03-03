document.addEventListener("DOMContentLoaded", () => {
    // Konto erstellen
    const createAccountForm = document.getElementById("create-account-form");
    if (createAccountForm) {
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
    }
  
    // Login
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
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
    }
  
    // Modal-Fenster Steuerung
    const loginModal = document.getElementById("login-modal");
    const createAccountModal = document.getElementById("create-account-modal");
    const loginLink = document.getElementById("login-link");
    const createAccountLink = document.getElementById("create-account-link");
    const closeLogin = document.getElementById("close-login");
    const closeCreateAccount = document.getElementById("close-create-account");
  
    if (loginLink && loginModal) {
      loginLink.onclick = () => loginModal.style.display = "block";
    }
    if (createAccountLink && createAccountModal) {
      createAccountLink.onclick = () => createAccountModal.style.display = "block";
    }
    if (closeLogin && loginModal) {
      closeLogin.onclick = () => loginModal.style.display = "none";
    }
    if (closeCreateAccount && createAccountModal) {
      closeCreateAccount.onclick = () => createAccountModal.style.display = "none";
    }
  
    window.onclick = (event) => {
      if (event.target === loginModal) loginModal.style.display = "none";
      if (event.target === createAccountModal) createAccountModal.style.display = "none";
    };
  });
  