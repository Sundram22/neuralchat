"use strict";

// State
let currentChatId = null;
let isLoading = false;
let sidebarOpen = true;

// DOM
const chatFeed      = document.getElementById("chatFeed");
const userInput     = document.getElementById("userInput");
const sendBtn       = document.getElementById("sendBtn");
const modelSelect   = document.getElementById("modelSelect");
const newChatBtn    = document.getElementById("newChatBtn");
const chatHistory   = document.getElementById("chatHistory");
const welcomeScreen = document.getElementById("welcomeScreen");
const sidebar       = document.getElementById("sidebar");

// ✅ LOAD MODELS (FIX)
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
console.error("Model load error:", err);
}
}

// Sidebar toggle
function toggleSidebar() {
sidebarOpen = !sidebarOpen;
sidebar.classList.toggle("collapsed", !sidebarOpen);
}

// Send message
async function sendMessage() {
const text = userInput.value.trim();
if (!text || isLoading) return;

isLoading = true;
sendBtn.disabled = true;

const model = modelSelect.value;

try {
const res = await fetch("/chat", {
method: "POST",
headers: {"Content-Type": "application/json"},
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

  // ✅ UI render (important)
  const div = document.createElement("div");
  div.innerHTML = "<b>You:</b> " + text + "<br><b>AI:</b> " + data.response;
  chatFeed.appendChild(div);
}
```

} catch (err) {
console.error(err);
}

userInput.value = "";
isLoading = false;
sendBtn.disabled = false;
}

// New Chat
async function startNewChat() {
try {
const res = await fetch("/new_chat", { method: "POST" });
const data = await res.json();
currentChatId = data.chat_id;
} catch {
currentChatId = Date.now().toString();
}

chatFeed.innerHTML = "";
}

// Events
sendBtn.addEventListener("click", sendMessage);
newChatBtn.addEventListener("click", startNewChat);

// INIT
(async function init() {
await loadModels();   // 🔥 FIX

try {
const res = await fetch("/new_chat", { method: "POST" });
const data = await res.json();
currentChatId = data.chat_id;
} catch {
currentChatId = Date.now().toString();
}
})();
