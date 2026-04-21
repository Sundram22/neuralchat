"use strict";

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────
let currentChatId = null;
let isLoading = false;
let sidebarOpen = true;

// ─────────────────────────────────────────────
// DOM References
// ─────────────────────────────────────────────
const chatFeed      = document.getElementById("chatFeed");
const userInput     = document.getElementById("userInput");
const sendBtn       = document.getElementById("sendBtn");
const modelSelect   = document.getElementById("modelSelect");
const newChatBtn    = document.getElementById("newChatBtn");
const chatHistory   = document.getElementById("chatHistory");
const welcomeScreen = document.getElementById("welcomeScreen");
const sidebar       = document.getElementById("sidebar");
const statusDot     = document.querySelector(".status-dot");
const statusText    = document.querySelector(".status-text");
const sidebarToggle = document.getElementById("sidebarToggle");
const topbarMenuBtn = document.getElementById("topbarMenuBtn");

// ─────────────────────────────────────────────
// 🔥 LOAD MODELS (FIX)
// ─────────────────────────────────────────────
async function loadModels() {
try {
const res = await fetch("/models");
const data = await res.json();

```
modelSelect.innerHTML = "";

data.models.forEach(model => {
  const option = document.createElement("option");
  option.value = model;
  option.textContent = model;
  modelSelect.appendChild(option);
});

modelSelect.value = data.default;
```

} catch (err) {
console.error("Failed to load models:", err);
}
}

// ─────────────────────────────────────────────
// Sidebar Toggle
// ─────────────────────────────────────────────
function toggleSidebar() {
sidebarOpen = !sidebarOpen;
sidebar.classList.toggle("collapsed", !sidebarOpen);
}

sidebarToggle.addEventListener("click", toggleSidebar);
topbarMenuBtn.addEventListener("click", toggleSidebar);

// ─────────────────────────────────────────────
// Status Indicator
// ─────────────────────────────────────────────
function setStatus(state) {
if (state === "thinking") {
statusDot.classList.add("thinking");
statusText.textContent = "Thinking…";
} else {
statusDot.classList.remove("thinking");
statusText.textContent = "Ready";
}
}

// ─────────────────────────────────────────────
// Send Message
// ─────────────────────────────────────────────
async function sendMessage() {
const text = userInput.value.trim();
if (!text || isLoading) return;

isLoading = true;
sendBtn.disabled = true;
userInput.value = "";

const model = modelSelect.value;

try {
const res = await fetch("/chat", {
method: "POST",
headers: {
"Content-Type": "application/json"
},
body: JSON.stringify({
chat_id: currentChatId,
message: text,
model: model
})
});

```
const data = await res.json();

if (data.error) {
  alert(data.error);
} else {
  currentChatId = data.chat_id;
  console.log("Response:", data.response);
}
```

} catch (err) {
console.error(err);
}

isLoading = false;
sendBtn.disabled = false;
}

sendBtn.addEventListener("click", sendMessage);

// ─────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────
(async function init() {

await loadModels();   // 🔥 IMPORTANT FIX

try {
const res = await fetch("/new_chat", { method: "POST" });
const data = await res.json();
currentChatId = data.chat_id;
} catch {
currentChatId = Date.now().toString();
}

})();
