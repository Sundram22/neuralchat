/**
 * NeuralChat — Frontend Script
 * Designed and Developed by Er. Sundram Tiwari
 */

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
const historyEmpty  = document.getElementById("historyEmpty");
const welcomeScreen = document.getElementById("welcomeScreen");
const sidebar       = document.getElementById("sidebar");
const statusDot     = document.querySelector(".status-dot");
const statusText    = document.querySelector(".status-text");
const sidebarToggle = document.getElementById("sidebarToggle");
const topbarMenuBtn = document.getElementById("topbarMenuBtn");

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
// Toast Error
// ─────────────────────────────────────────────
function showToast(msg, duration = 4500) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

// ─────────────────────────────────────────────
// Welcome Screen
// ─────────────────────────────────────────────
function hideWelcome() {
  if (welcomeScreen && welcomeScreen.parentNode) {
    welcomeScreen.style.opacity = "0";
    welcomeScreen.style.transform = "scale(0.97)";
    welcomeScreen.style.transition = "opacity 0.25s, transform 0.25s";
    setTimeout(() => welcomeScreen.remove(), 250);
  }
}

function injectPrompt(text) {
  userInput.value = text;
  autoResize();
  updateSendBtn();
  sendMessage();
}
window.injectPrompt = injectPrompt;

// ─────────────────────────────────────────────
// Textarea Auto-Resize
// ─────────────────────────────────────────────
function autoResize() {
  userInput.style.height = "auto";
  const max = 180;
  userInput.style.height = Math.min(userInput.scrollHeight, max) + "px";
}

function updateSendBtn() {
  sendBtn.disabled = !userInput.value.trim() || isLoading;
}

userInput.addEventListener("input", () => {
  autoResize();
  updateSendBtn();
});

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn.disabled) sendMessage();
  }
});

// ─────────────────────────────────────────────
// Message Rendering
// ─────────────────────────────────────────────
function renderUserMessage(text) {
  const tpl = document.getElementById("tplUser").content.cloneNode(true);
  const bubble = tpl.querySelector(".user-bubble");
  bubble.textContent = text;
  chatFeed.appendChild(tpl);
  scrollBottom();
}

function renderAIMessage(text, model) {
  const tpl = document.getElementById("tplAI").content.cloneNode(true);
  const bubble = tpl.querySelector(".ai-bubble");
  const badge  = tpl.querySelector(".model-badge");

  // Render markdown-lite (code blocks + inline code)
  bubble.innerHTML = formatMessage(text);
  badge.textContent = model || "unknown";

  chatFeed.appendChild(tpl);
  scrollBottom();
}

function showTypingIndicator() {
  removeTypingIndicator();
  const tpl = document.getElementById("tplTyping").content.cloneNode(true);
  chatFeed.appendChild(tpl);
  scrollBottom();
}

function removeTypingIndicator() {
  const el = document.getElementById("typingIndicator");
  if (el) el.remove();
}

function scrollBottom() {
  chatFeed.scrollTo({ top: chatFeed.scrollHeight, behavior: "smooth" });
}

// ─────────────────────────────────────────────
// Simple Message Formatter
// ─────────────────────────────────────────────
function formatMessage(text) {
  // Escape HTML
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Fenced code blocks
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="lang-${lang || "text"}">${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Preserve newlines (outside code blocks)
  html = html.replace(/\n/g, "<br>");

  return html;
}

// ─────────────────────────────────────────────
// Send Message
// ─────────────────────────────────────────────
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || isLoading) return;

  hideWelcome();
  isLoading = true;
  sendBtn.disabled = true;
  userInput.value = "";
  autoResize();
  setStatus("thinking");

  renderUserMessage(text);
  showTypingIndicator();

  const model = modelSelect.value;

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: currentChatId,
        message: text,
        model: model,
      }),
    });

    const data = await res.json();
    removeTypingIndicator();

    if (!res.ok || data.error) {
      showToast("Error: " + (data.error || "Server error. Please try again."));
    } else {
      currentChatId = data.chat_id;
      renderAIMessage(data.response, data.model);

      // If model auto-switched (fallback), update dropdown
      if (data.model && data.model !== model) {
        modelSelect.value = data.model;
        showToast(`Switched to fallback model: ${data.model}`, 3000);
      }

      // Refresh sidebar history
      await loadHistory();
      highlightActive();
    }
  } catch (err) {
    removeTypingIndicator();
    showToast("Network error. Check your connection.");
    console.error(err);
  } finally {
    isLoading = false;
    updateSendBtn();
    setStatus("ready");
  }
}

sendBtn.addEventListener("click", sendMessage);

// ────────────────────────New Chat─────────────────────
async function startNewChat() {
try {
const res = await fetch("/new_chat", { method: "POST" });
const data = await res.json();
currentChatId = data.chat_id;
} catch {
currentChatId = generateId();
}

// Clear feed
chatFeed.innerHTML = "";

// Re-insert welcome screen (FULL UI)
const welcome = document.createElement("div");
welcome.className = "welcome-screen";
welcome.id = "welcomeScreen";
welcome.innerHTML = `     <div class="welcome-glow"></div>     <div class="welcome-icon">       <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">         <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>       </svg>     </div>     <h1 class="welcome-title">NeuralChat</h1>     <p class="welcome-sub">Your intelligent AI companion, powered by the world's best models.</p>     <div class="welcome-chips">       <button class="chip" onclick="injectPrompt('Explain quantum computing in simple terms')">⚛️ Explain quantum computing</button>       <button class="chip" onclick="injectPrompt('Write a Python function to sort a list of dictionaries by a key')">💻 Write Python code</button>       <button class="chip" onclick="injectPrompt('Give me 5 creative startup ideas for 2025')">💡 Startup ideas for 2025</button>       <button class="chip" onclick="injectPrompt('Summarise the key differences between React and Vue')">📝 React vs Vue</button>     </div>
  `;
chatFeed.appendChild(welcome);

deactivateAllHistory();
userInput.focus();

// 🔥 MOBILE FIX (AUTO CLOSE SIDEBAR)
if (window.innerWidth < 768) {
sidebar.classList.add("collapsed");
sidebarOpen = false;
}
}

newChatBtn.addEventListener("click", startNewChat);

// ─────────────────────────────────────────────
// Chat History — Sidebar
// ─────────────────────────────────────────────
async function loadHistory() {
  try {
    const res = await fetch("/history");
    const chats = await res.json();

    // Clear history items (keep empty notice)
    chatHistory.innerHTML = "";

    if (!chats.length) {
      chatHistory.appendChild(buildEmptyNotice());
      return;
    }

    chats.forEach((chat) => {
      const item = buildHistoryItem(chat);
      chatHistory.appendChild(item);
    });

  } catch (err) {
    console.error("Failed to load history:", err);
  }
}

function buildEmptyNotice() {
  const div = document.createElement("div");
  div.className = "history-empty";
  div.id = "historyEmpty";
  div.innerHTML = `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
    <p>No conversations yet</p>
  `;
  return div;
}

function buildHistoryItem(chat) {
  const div = document.createElement("div");
  div.className = "history-item";
  div.dataset.chatId = chat.id;

  div.innerHTML = `
    <div class="history-item-icon">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    </div>
    <span class="history-item-title">${escapeHtml(chat.title || "Untitled Chat")}</span>
    <button class="history-item-delete" data-id="${chat.id}" aria-label="Delete chat">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
      </svg>
    </button>
  `;

  div.addEventListener("click", (e) => {
    if (e.target.closest(".history-item-delete")) return;
    loadChat(chat.id, div);
  });

  div.querySelector(".history-item-delete").addEventListener("click", (e) => {
    e.stopPropagation();
    deleteChat(chat.id, div);
  });

  return div;
}

// ─────────────────────────────────────────────
// Load Chat
// ─────────────────────────────────────────────
async function loadChat(chatId, itemEl) {
  try {
    const res = await fetch(`/load_chat/${chatId}`);
    if (!res.ok) { showToast("Failed to load chat."); return; }
    const chat = await res.json();

    currentChatId = chatId;

    // Clear feed
    chatFeed.innerHTML = "";

    // Render messages
    (chat.messages || []).forEach((msg) => {
      if (msg.role === "user") {
        renderUserMessage(msg.content);
      } else {
        renderAIMessage(msg.content, chat.model || "");
      }
    });

    // Highlight
    deactivateAllHistory();
    if (itemEl) itemEl.classList.add("active");

    scrollBottom();

    // Set model dropdown
    if (chat.model && modelSelect.querySelector(`option[value="${chat.model}"]`)) {
      modelSelect.value = chat.model;
    }

  } catch (err) {
    showToast("Error loading chat.");
    console.error(err);
  }
}

// ─────────────────────────────────────────────
// Delete Chat
// ─────────────────────────────────────────────
async function deleteChat(chatId, itemEl) {
  try {
    await fetch(`/delete_chat/${chatId}`, { method: "DELETE" });
    itemEl.style.opacity = "0";
    itemEl.style.transform = "translateX(-10px)";
    itemEl.style.transition = "opacity 0.2s, transform 0.2s";
    setTimeout(() => itemEl.remove(), 200);

    if (currentChatId === chatId) {
      startNewChat();
    }

    // Check if list is now empty
    setTimeout(async () => {
      const items = chatHistory.querySelectorAll(".history-item");
      if (!items.length) {
        chatHistory.appendChild(buildEmptyNotice());
      }
    }, 250);
  } catch {
    showToast("Failed to delete chat.");
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function deactivateAllHistory() {
  chatHistory.querySelectorAll(".history-item.active").forEach((el) => {
    el.classList.remove("active");
  });
}

function highlightActive() {
  deactivateAllHistory();
  const el = chatHistory.querySelector(`[data-chat-id="${currentChatId}"]`);
  if (el) el.classList.add("active");
}

function generateId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────
(async function init() {
  // Load history into sidebar
  await loadHistory();

  // Generate fresh chat ID for this session
  try {
    const res = await fetch("/new_chat", { method: "POST" });
    const data = await res.json();
    currentChatId = data.chat_id;
  } catch {
    currentChatId = generateId();
  }

  userInput.focus();
})();
