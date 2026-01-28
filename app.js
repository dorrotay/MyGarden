const STORAGE_KEY = "plants-data";
let lastAction = null; // Для зберігання стану перед останнім поливом

// 1. ЗАВАНТАЖЕННЯ ДАНИХ
let plants = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [
    { id: 1, name: "Монстера", interval: 5, lastWatered: "2026-01-20" },
    { id: 2, name: "Фікус", interval: 7, lastWatered: "2026-01-18" }
];

// 2. ЛОГІКА НОТИФІКАЦІЙ (iOS 16.4+)
window.requestNotificationPermission = function() {
    if (!("Notification" in window)) {
        alert("Цей браузер не підтримує сповіщення");
        return;
    }

    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            alert("Сповіщення увімкнено! ✨");
            const btn = document.getElementById("enable-notifications");
            if (btn) btn.style.display = "none";
            
            new Notification("My Garden", { 
                body: "Тепер ви отримуватимете нагадування про полив.",
                icon: "https://cdn-icons-png.flaticon.com/512/628/628283.png"
            });
        } else if (permission === "denied") {
            alert("Ви заблокували сповіщення. Будь ласка, дозвольте їх у налаштуваннях iPhone (Параметри -> My Garden).");
        }
    });
}

function sendNotification(count) {
    if (Notification.permission === "granted") {
        new Notification("Час полити рослини! 🌿", {
            body: `У вас прострочено полив для ${count} рослин.`,
            icon: "https://cdn-icons-png.flaticon.com/512/628/628283.png"
        });
    }
}

// 3. ОСНОВНІ ФУНКЦІЇ
window.toggleModal = function(show) {
    document.getElementById("modal").style.display = show ? "flex" : "none";
}

function getNextDate(plant) {
    const last = new Date(plant.lastWatered);
    last.setDate(last.getDate() + (parseInt(plant.interval) || 7));
    return last;
}

window.render = function() {
    const container = document.getElementById("plants-container");
    const statusText = document.getElementById("status-text");
    if (!container) return;

    container.innerHTML = "";
    let overdueCount = 0;

    plants.sort((a, b) => getNextDate(a) - getNextDate(b));

    plants.forEach(plant => {
        const nextDate = getNextDate(plant);
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const isOverdue = today >= nextDate;
        if (isOverdue) overdueCount++;

        const formattedDate = nextDate.toLocaleDateString('uk-UA', { month: 'short', day: 'numeric' });

        const card = document.createElement("div");
        card.className = `plant-card ${isOverdue ? 'overdue' : ''}`;
        card.innerHTML = `
            <div class="plant-icon">${isOverdue ? '🥀' : '🌿'}</div>
            <div class="plant-info">
                <h3>${plant.name}</h3>
                <p>Наступний: <span class="next-date">${formattedDate}</span></p>
                <input type="date" class="edit-date" value="${plant.lastWatered}" onchange="manualEdit(${plant.id}, this.value)">
            </div>
            <button class="btn-water" onclick="water(${plant.id})">💧</button>
            <button class="btn-del" onclick="deletePlant(${plant.id})">✕</button>
        `;
        container.appendChild(card);
    });

    statusText.innerText = overdueCount > 0 
        ? `Потрібно полити: ${overdueCount}` 
        : "Всі рослини в порядку! ✨";

    // Перевірка для відправки нотифікації
    if (overdueCount > 0) {
        if (!window.notifiedCount || window.notifiedCount !== overdueCount) {
            sendNotification(overdueCount);
            window.notifiedCount = overdueCount;
        }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
    
    // Перевірка видимості кнопки нотифікацій
    const notifyBtn = document.getElementById("enable-notifications");
    if (notifyBtn) {
        notifyBtn.style.display = (Notification.permission === "default") ? "block" : "none";
    }
}

window.addNewPlant = function() {
    const nameInput = document.getElementById("plantName");
    const intervalInput = document.getElementById("plantInterval");

    if (!nameInput || !intervalInput) return;

    const name = nameInput.value.trim();
    const interval = parseInt(intervalInput.value);

    if (!name || isNaN(interval)) {
        alert("Будь ласка, введіть коректну назву та інтервал!");
        return;
    }

    const newPlant = {
        id: Date.now(),
        name: name,
        interval: interval,
        lastWatered: new Date().toISOString().slice(0, 10)
    };

    plants.push(newPlant);
    nameInput.value = "";
    intervalInput.value = "";
    window.toggleModal(false);
    render();
}

window.deletePlant = function(id) {
    if(confirm("Видалити цю рослину зі списку?")) {
        plants = plants.filter(p => p.id !== id);
        render();
    }
}

window.water = function(id) {
    const plantIndex = plants.findIndex(p => p.id === id);
    if (plantIndex !== -1) {
        lastAction = {
            index: plantIndex,
            oldDate: plants[plantIndex].lastWatered
        };

        plants[plantIndex].lastWatered = new Date().toISOString().slice(0, 10);
        render();
        showUndoBar();
    }
}

window.undoWater = function() {
    if (lastAction) {
        plants[lastAction.index].lastWatered = lastAction.oldDate;
        lastAction = null;
        hideUndoBar();
        render();
    }
}

window.manualEdit = function(id, newDate) {
    const plant = plants.find(p => p.id === id);
    if (plant && newDate) {
        plant.lastWatered = newDate;
        render();
    }
}

function showUndoBar() {
    const bar = document.getElementById("undo-bar");
    if (bar) {
        bar.classList.add("show");
        setTimeout(hideUndoBar, 5000);
    }
}

function hideUndoBar() {
    const bar = document.getElementById("undo-bar");
    if (bar) bar.classList.remove("show");
}

// 4. ІНІЦІАЛІЗАЦІЯ
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => console.log(err));
}

document.addEventListener("DOMContentLoaded", render);