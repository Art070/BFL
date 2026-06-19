const navItems = document.querySelectorAll(".nav-item");
const views = document.querySelectorAll(".view");
const title = document.querySelector("#page-title");
const installButton = document.querySelector("#install-button");
const resetButton = document.querySelector("#demo-reset");
const toast = document.querySelector("#toast");
const uploadInput = document.querySelector(".upload-button input");
const messageForm = document.querySelector("#message-form");
const messageInput = document.querySelector("#message-input");
const chatLog = document.querySelector("#chat-log");
const authForm = document.querySelector("#auth-form");

const viewNames = {
  dashboard: "Главная",
  tasks: "Мои задачи",
  case: "Мое дело",
  documents: "Документы",
  debts: "Мои долги",
  calendar: "Календарь",
  messages: "Сообщения",
  payments: "Платежи",
  help: "Помощь",
  profile: "Профиль",
  admin: "Админ-панель",
};

const initialState = {
  documents: {
    "Справка 2-НДФЛ": {
      badge: "empty",
      status: "Не загружен",
      note: "Где взять: личный кабинет ФНС или работодатель. Нужна за 3 года.",
    },
    "Выписка из банка": {
      badge: "replace",
      status: "Нужно заменить",
      note: "Юрист: загрузите полный PDF за последние 12 месяцев, не скриншоты.",
    },
  },
  messages: [],
};

const state = JSON.parse(localStorage.getItem("cabinet-demo-state") || JSON.stringify(initialState));

function saveState() {
  localStorage.setItem("cabinet-demo-state", JSON.stringify(state));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function setView(nextView, updateHash = true) {
  const target = document.querySelector(`#${nextView}`);
  if (!target) return;

  navItems.forEach((button) => {
    const isActive = button.dataset.view === nextView;
    button.classList.toggle("active", isActive);
    if (isActive) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });

  views.forEach((view) => view.classList.toggle("active", view.id === nextView));
  title.textContent = viewNames[nextView];

  const activeButton = document.querySelector(`.nav-item[data-view="${nextView}"]`);
  const activeGroup = activeButton?.closest(".nav-group");
  if (activeGroup) activeGroup.open = true;

  if (updateHash) history.replaceState(null, "", `#${nextView}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateDocument(name, payload) {
  const row = document.querySelector(`[data-document="${name}"]`);
  if (!row) return;

  const badge = row.querySelector(".badge");
  const note = row.querySelector("small");
  badge.className = `badge ${payload.badge}`;
  badge.textContent = payload.status;
  note.textContent = payload.note;
  row.classList.remove("is-updated");
  requestAnimationFrame(() => row.classList.add("is-updated"));
}

function renderState() {
  Object.entries(state.documents).forEach(([name, payload]) => updateDocument(name, payload));
  state.messages.forEach((message) => addMessage(message, false));
}

function addMessage(text, shouldSave = true) {
  const bubble = document.createElement("div");
  bubble.className = "bubble client";
  bubble.textContent = text;
  chatLog.appendChild(bubble);
  chatLog.scrollTop = chatLog.scrollHeight;

  if (shouldSave) {
    state.messages.push(text);
    saveState();
  }
}

function highlightHelpTopic(topic) {
  setView("help");
  const card = document.querySelector(`[data-topic-card="${topic}"]`);
  if (!card) return;

  document.querySelectorAll(".help-card").forEach((item) => item.classList.remove("is-highlighted"));
  card.classList.add("is-highlighted");
  card.scrollIntoView({ behavior: "smooth", block: "center" });
}

navItems.forEach((item) => item.addEventListener("click", () => setView(item.dataset.view)));
window.addEventListener("hashchange", () => setView(location.hash.slice(1) || "dashboard", false));

let deferredPrompt;
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installButton.hidden = true;
});

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  showToast("Вход выполнен. В боевой версии код проверяется на сервере.");
});

uploadInput.addEventListener("change", () => {
  const file = uploadInput.files[0];
  if (!file) return;

  state.documents["Выписка из банка"] = {
    badge: "review",
    status: "На проверке",
    note: `Загружен файл: ${file.name}`,
  };
  saveState();
  updateDocument("Выписка из банка", state.documents["Выписка из банка"]);
  showToast("Файл добавлен и отправлен на проверку.");
  uploadInput.value = "";
});

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = messageInput.value.trim();
  if (!value) return;
  addMessage(value);
  messageInput.value = "";
  showToast("Сообщение добавлено в историю переписки.");
});

document.querySelectorAll("[data-toast]").forEach((button) => {
  button.addEventListener("click", () => showToast(button.dataset.toast));
});

document.querySelectorAll("[data-jump]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.jump));
});

document.querySelectorAll("[data-help-topic]").forEach((button) => {
  button.addEventListener("click", () => highlightHelpTopic(button.dataset.helpTopic));
});

document.querySelectorAll(".client-card").forEach((card) => {
  const selectCard = () => {
    document.querySelectorAll(".client-card").forEach((item) => item.classList.remove("selected"));
    card.classList.add("selected");
    showToast(`Открыта карточка: ${card.querySelector("strong").textContent}.`);
  };
  card.addEventListener("click", selectCard);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectCard();
    }
  });
});

resetButton.addEventListener("click", () => {
  localStorage.removeItem("cabinet-demo-state");
  location.href = location.pathname;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .catch(() => showToast("Service worker работает только через локальный сервер или HTTPS."));
  });
}

renderState();
setView(location.hash.slice(1) || "dashboard", false);
