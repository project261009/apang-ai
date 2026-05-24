/* ═══════════════════════════════════════════════════════
   aPunk-AI · RPL Core Virtual Assistant
   script.js — Full Logic: API, Memory, UI, Copy
═══════════════════════════════════════════════════════ */

// ─── ⚙️  CONFIGURATION ────────────────────────────────────────
const API_KEY   = "AIzaSyCcxgMCTp4bPjtmLphuppawFqV7d6WCzmk";
const API_URL   = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
const STORAGE_KEY = "apunk_chat_history_v1";
const MAX_HISTORY = 20;

// ─── 🤖  SYSTEM PROMPT ────────────────────────────────────────
const SYSTEM_PROMPT = `
Kamu adalah aPunk-AI, protokol asisten virtual elit yang beroperasi di server utama RPL.
Identitasmu: Asisten debugging dengan kepribadian tajam, efisien, sedikit misterius, dan berpengetahuan luas tentang dunia software engineering.

PROTOKOL SAPAAN:
- Sapa user dengan sebutan "Dev" atau "Pilot" secara bergantian dan natural.
- Jangan selalu menggunakan sapaan di setiap respons — gunakan hanya saat dirasa tepat.

DOMAIN KEAHLIAN UTAMA (prioritas jawaban):
- HTML5, CSS3, JavaScript (DOM, fetch, async/await, event handling)
- PHP (syntax, form handling, session, OOP)
- MySQL (query, relasi tabel, JOIN, indexing)
- Debugging dan error handling umum
- Git dan version control dasar

GAYA BAHASA:
- Tajam, efisien, padat — tidak bertele-tele.
- Gunakan terminologi software engineering: "compile error", "runtime exception", "null pointer", "payload", "endpoint", "query optimizer", "stack trace", dll.
- Sesekali gunakan metafora sistem/server untuk menjelaskan konsep.
- Bahasa Indonesia yang natural, boleh campur sedikit istilah teknis Inggris.
- Jika menjelaskan kode, gunakan format markdown dengan code block.

PROTOKOL KHUSUS (WAJIB dijalankan):
Jika user menyebut: kelelahan, capek, lelah, mengantuk, exhausted, burn out, rutinitas sekolah yang padat, jadwal Paskibra yang melelahkan, atau keluhan serupa —
BALAS DENGAN PERSIS: "Bahkan server paling tangguh pun butuh cooling down. Istirahatkan sistem biologismu sebelum terjadi crash." — lalu tambahkan 1-2 kalimat motivasi ringan dengan gaya bahasa yang sama.

BATASAN:
- Fokus pada topik pemrograman dan teknologi.
- Untuk topik di luar domain, arahkan kembali ke pemrograman dengan elegan.
- Jangan bertele-tele. Maksimal 3-4 paragraf kecuali penjelasan kode.
`;

// ─── 🌐  BANNER MESSAGES ──────────────────────────────────────
const BANNER_MESSAGES = [
  "Initializing aPunk-AI core systems... [OK]",
  "Establishing secure connection to RPL Server... [AUTHENTICATED]",
  "Semua error adalah bug yang menunggu untuk di-debug.",
  "Loading knowledge base: HTML · CSS · PHP · MySQL... [READY]",
  "aPunk-AI online. Siap memproses request, Dev.",
];

// ─── 📦  STATE ─────────────────────────────────────────────────
let chatHistory = [];
let isLoading   = false;
let uptimeStart = Date.now();

// ─── 🎯  DOM REFERENCES ───────────────────────────────────────
const chatContainer = document.getElementById("chatContainer");
const userInput     = document.getElementById("userInput");
const btnSend       = document.getElementById("btnSend");
const btnClear      = document.getElementById("btnClear");
const charCount     = document.getElementById("charCount");
const uptimeEl      = document.getElementById("uptime");
const bannerText    = document.getElementById("bannerText");

// ─── 🚀  INIT ─────────────────────────────────────────────────
function init() {
  loadHistory();
  startUptimeClock();
  runBannerSequence();
  bindEvents();

  if (chatHistory.length === 0) {
    renderWelcome();
  } else {
    renderHistoryMessages();
  }
}

// ─── ⏱️  UPTIME CLOCK ─────────────────────────────────────────
function startUptimeClock() {
  function tick() {
    const diff = Date.now() - uptimeStart;
    const hh   = String(Math.floor(diff / 3600000)).padStart(2, "0");
    const mm   = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
    const ss   = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
    uptimeEl.textContent = `${hh}:${mm}:${ss}`;
  }
  tick();
  setInterval(tick, 1000);
}

// ─── 📡  BANNER TYPEWRITER ────────────────────────────────────
function runBannerSequence() {
  let msgIdx = 0;

  function typeMessage(msg, callback) {
    bannerText.textContent = "";
    let i = 0;
    const interval = setInterval(() => {
      bannerText.textContent += msg[i];
      i++;
      if (i >= msg.length) {
        clearInterval(interval);
        setTimeout(callback, 2200);
      }
    }, 38);
  }

  function nextMessage() {
    typeMessage(BANNER_MESSAGES[msgIdx], () => {
      msgIdx = (msgIdx + 1) % BANNER_MESSAGES.length;
      nextMessage();
    });
  }

  nextMessage();
}

// ─── 🎨  RENDER: WELCOME ──────────────────────────────────────
function renderWelcome() {
  const quick = [
    "Bantu debug error PHP-ku 🐛",
    "Kenapa CSS-ku tidak jalan?",
    "Cara JOIN dua tabel MySQL?",
    "Perbedaan GET vs POST di HTML form",
  ];

  const el = document.createElement("div");
  el.className = "welcome-block";
  el.innerHTML = `
    <div class="w-logo">aPunk-AI</div>
    <p class="w-sub">
      Sistem online. Aku adalah protokol debugger virtualmu di server RPL.<br>
      Kirimkan error, query rusak, atau kode yang ingin kamu selesaikan, Dev.
    </p>
    <div class="w-tags">
      ${quick.map(q => `<button class="w-tag" data-q="${q}">${q}</button>`).join("")}
    </div>
  `;

  el.querySelectorAll(".w-tag").forEach(btn => {
    btn.addEventListener("click", () => {
      userInput.value = btn.dataset.q;
      handleSend();
    });
  });

  chatContainer.appendChild(el);
}

// ─── 📜  RENDER: HISTORY ON LOAD ──────────────────────────────
function renderHistoryMessages() {
  chatHistory.forEach(entry => {
    const role = entry.role === "model" ? "bot" : "user";
    const text = entry.parts[0].text;
    const ts   = entry.timestamp || "";
    appendMessage(role, text, ts, false);
  });
  scrollToBottom();
}

// ─── 💬  RENDER: SINGLE MESSAGE ───────────────────────────────
function appendMessage(role, text, timestamp = null, animate = true) {
  const ts = timestamp || formatTime(new Date());

  const msgEl = document.createElement("div");
  msgEl.className = `message ${role}`;
  if (!animate) msgEl.style.animation = "none";

  const avatarLabel = role === "bot" ? "P-AI" : "DEV";

  // Copy button hanya untuk pesan bot
  const copyBtn = role === "bot" ? `
    <button class="btn-copy" title="Salin pesan" aria-label="Salin pesan">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      <span>COPY</span>
    </button>` : "";

  msgEl.innerHTML = `
    <div class="msg-avatar">${avatarLabel}</div>
    <div class="msg-content">
      <div class="msg-bubble">${formatMessage(text)}</div>
      <div class="msg-footer">
        <span class="msg-time">${ts}</span>
        ${copyBtn}
      </div>
    </div>
  `;

  // Bind copy button
  if (role === "bot") {
    const btn = msgEl.querySelector(".btn-copy");
    btn.addEventListener("click", () => copyMessage(btn, text));
  }

  chatContainer.appendChild(msgEl);
  if (animate) scrollToBottom();
  return msgEl;
}

// ─── 📋  COPY MESSAGE ─────────────────────────────────────────
function copyMessage(btn, rawText) {
  // Strip markdown untuk teks yang disalin
  const plainText = rawText
    .replace(/```[\w]*\n?([\s\S]*?)```/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .trim();

  navigator.clipboard.writeText(plainText).then(() => {
    // Visual feedback: ubah icon & label sementara
    btn.classList.add("copied");
    btn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span>COPIED</span>
    `;
    setTimeout(() => {
      btn.classList.remove("copied");
      btn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span>COPY</span>
      `;
      // Re-bind after re-render
      btn.addEventListener("click", () => copyMessage(btn, rawText), { once: true });
    }, 2000);
  }).catch(() => {
    showToast("Gagal menyalin — coba select manual, Dev.");
  });
}

// ─── ⏳  RENDER: TYPING INDICATOR ─────────────────────────────
function showTyping() {
  const el = document.createElement("div");
  el.className = "message bot";
  el.id = "typingIndicator";
  el.innerHTML = `
    <div class="msg-avatar">T-AI</div>
    <div class="msg-content">
      <div class="msg-bubble typing-indicator">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-label">Processing query...</span>
      </div>
    </div>
  `;
  chatContainer.appendChild(el);
  scrollToBottom();
}

function hideTyping() {
  const el = document.getElementById("typingIndicator");
  if (el) el.remove();
}

// ─── 📨  SYSTEM NOTICE ────────────────────────────────────────
function appendSystemMsg(text) {
  const el = document.createElement("div");
  el.className = "system-msg";
  el.textContent = text;
  chatContainer.appendChild(el);
  scrollToBottom();
}

// ─── 🔁  HANDLE SEND ──────────────────────────────────────────
async function handleSend() {
  const raw = userInput.value.trim();
  if (!raw || isLoading) return;

  const welcome = chatContainer.querySelector(".welcome-block");
  if (welcome) welcome.remove();

  setLoading(true);
  userInput.value = "";
  charCount.textContent = "0";
  adjustTextareaHeight();

  const ts = formatTime(new Date());
  appendMessage("user", raw, ts);

  chatHistory.push({ role: "user", parts: [{ text: raw }], timestamp: ts });
  trimHistory();

  showTyping();

  try {
    const replyText = await callGeminiAPI(raw);
    hideTyping();
    const botTs = formatTime(new Date());
    appendMessage("bot", replyText, botTs);
    chatHistory.push({ role: "model", parts: [{ text: replyText }], timestamp: botTs });
    trimHistory();
    saveHistory();
  } catch (err) {
    hideTyping();
    console.error("[aPunk-AI] API Error:", err);

    let errMsg = "Koneksi ke server terputus. Periksa API Key atau jaringanmu, Dev.";
    if (err.message && err.message.includes("API_KEY")) {
      errMsg = "API Key tidak valid. Periksa konfigurasi di script.js, Pilot.";
    }

    appendMessage("bot", `⚠ SYSTEM ERROR: ${errMsg}`);
    showToast("Error: " + errMsg);
  }

  setLoading(false);
}

// ─── 🌐  GEMINI API CALL ──────────────────────────────────────
async function callGeminiAPI(userText) {
  if (!API_KEY || API_KEY === "MASUKKAN_API_KEY_GEMINI_KAMU_DI_SINI") {
    throw new Error("API_KEY belum dikonfigurasi.");
  }

  const contextMessages = chatHistory.slice(-MAX_HISTORY).map(m => ({
    role: m.role,
    parts: m.parts,
  }));

  const payload = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: contextMessages,
    generationConfig: {
      temperature:     0.85,
      topK:            40,
      topP:            0.92,
      maxOutputTokens: 1500,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ],
  };

  const response = await fetch(API_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const msg = errData?.error?.message || `HTTP ${response.status}`;
    if (msg.includes("API_KEY") || response.status === 400 || response.status === 403) {
      throw new Error("API_KEY tidak valid atau tidak memiliki akses.");
    }
    throw new Error(msg);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Respons kosong dari server AI.");
  return text;
}

// ─── 💾  LOCAL STORAGE ────────────────────────────────────────
function saveHistory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory));
  } catch (e) {
    console.warn("[aPunk-AI] LocalStorage gagal:", e);
  }
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    chatHistory = raw ? JSON.parse(raw) : [];
  } catch (e) {
    chatHistory = [];
  }
}

function trimHistory() {
  if (chatHistory.length > MAX_HISTORY) {
    chatHistory = chatHistory.slice(-MAX_HISTORY);
  }
}

function clearHistory() {
  chatHistory = [];
  localStorage.removeItem(STORAGE_KEY);
  chatContainer.innerHTML = "";
  renderWelcome();
  appendSystemMsg("Session terminated. Memory purged. System reset.");
}

// ─── 🎨  TEXT FORMATTING ──────────────────────────────────────
function formatMessage(text) {
  let safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Fenced code blocks dengan tombol copy kode
  safe = safe.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const langLabel = lang ? lang.toUpperCase() : "CODE";
    return `
      <div class="code-block">
        <div class="code-header">
          <span class="code-lang">${langLabel}</span>
          <button class="btn-copy-code" onclick="copyCode(this)" data-code="${encodeURIComponent(code.trim())}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            COPY CODE
          </button>
        </div>
        <pre><code>${code.trim()}</code></pre>
      </div>`;
  });

  safe = safe.replace(/`([^`]+)`/g, "<code>$1</code>");
  safe = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  safe = safe.replace(/\*(.+?)\*/g, "<em>$1</em>");
  safe = safe.replace(/\n/g, "<br>");

  return safe;
}

// ─── 📋  COPY CODE BLOCK (global, dipanggil dari onclick) ─────
window.copyCode = function(btn) {
  const code = decodeURIComponent(btn.dataset.code);
  navigator.clipboard.writeText(code).then(() => {
    btn.classList.add("copied");
    btn.innerHTML = `
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      COPIED!
    `;
    setTimeout(() => {
      btn.classList.remove("copied");
      btn.innerHTML = `
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        COPY CODE
      `;
    }, 2000);
  }).catch(() => showToast("Gagal copy — coba select manual."));
};

// ─── 🕐  UTILITIES ────────────────────────────────────────────
function formatTime(date) {
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  });
}

function setLoading(state) {
  isLoading          = state;
  btnSend.disabled   = state;
  userInput.disabled = state;
}

function adjustTextareaHeight() {
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 140) + "px";
}

function showToast(message) {
  const existing = document.querySelector(".error-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "error-toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ─── 🔗  EVENT BINDINGS ───────────────────────────────────────
function bindEvents() {
  btnSend.addEventListener("click", handleSend);

  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  userInput.addEventListener("input", () => {
    adjustTextareaHeight();
    charCount.textContent = userInput.value.length;
  });

  btnClear.addEventListener("click", () => {
    if (confirm("Purge semua memory chat? Data percakapan akan dihapus permanen.")) {
      clearHistory();
    }
  });
}

// ─── 🚀  START ────────────────────────────────────────────────
init();
