const STORAGE_KEY = "plants-data";
let lastAction = null; // Для зберігання стану перед останнім поливом

let plants = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [
    { id: 1, name: "Монстера", interval: 5, lastWatered: "2026-01-20" },
    { id: 2, name: "Фікус", interval: 7, lastWatered: "2026-01-18" }
];

window.toggleModal = function(show) {
    document.getElementById("modal").style.display = show ? "flex" : "none";
}

function getNextDate(plant) {
    const last = new Date(plant.lastWatered);
    last.setDate(last.getDate() + (parseInt(plant.interval) || 7));
    return last;
}
function sendNotification(count) {
    if (Notification.permission === "granted") {
        new Notification("Час полити рослини! 🌿", {
            body: `У вас прострочено полив для ${count} рослин.`,
            icon: "https://cdn-icons-png.flaticon.com/512/628/628283.png"
        });
    }
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
        
        // Визначаємо, чи прострочено полив
        const isOverdue = today >= nextDate;
        if (isOverdue) overdueCount++;

        const formattedDate = nextDate.toLocaleDateString('uk-UA', { month: 'short', day: 'numeric' });

        const card = document.createElement("div");
        // ДОДАЄМО КЛАС overdue ЯКЩО ПОТРІБНО
        card.className = `plant-card ${isOverdue ? 'overdue' : ''}`;
        
        card.innerHTML = `
            <div class="plant-icon">${isOverdue ? '⚠️' : '🌿'}</div>
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
// ... в кінці функції window.render перед localStorage.setItem
if (overdueCount > 0) {
    // Відправляємо нотифікацію тільки якщо кількість змінилася або додаток щойно відкрили
    // Щоб не "спамити" при кожному кліку, можна додати перевірку
    if (!window.notifiedCount || window.notifiedCount !== overdueCount) {
        sendNotification(overdueCount);
        window.notifiedCount = overdueCount;
    }
}
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
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
    
    // Очищуємо поля та закриваємо вікно
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

// Функція поливу з можливістю скасування
window.water = function(id) {
    const plantIndex = plants.findIndex(p => p.id === id);
    if (plantIndex !== -1) {
        // Зберігаємо копію для Undo
        lastAction = {
            index: plantIndex,
            oldDate: plants[plantIndex].lastWatered
        };

        plants[plantIndex].lastWatered = new Date().toISOString().slice(0, 10);
        render();
        showUndoBar();
    }
}
// Запит дозволу на нотифікації при завантаженні
if ("Notification" in window) {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }
}

// Скасування останньої дії
window.undoWater = function() {
    if (lastAction) {
        plants[lastAction.index].lastWatered = lastAction.oldDate;
        lastAction = null;
        hideUndoBar();
        render();
    }
}

// Ручне редагування дати
window.manualEdit = function(id, newDate) {
    const plant = plants.find(p => p.id === id);
    if (plant && newDate) {
        plant.lastWatered = newDate;
        render();
    }
}

function showUndoBar() {
    const bar = document.getElementById("undo-bar");
    bar.classList.add("show");
    setTimeout(hideUndoBar, 5000); // Сховати через 5 секунд
}

function hideUndoBar() {
    document.getElementById("undo-bar").classList.remove("show");
}

// ... інші функції (addNewPlant, deletePlant) без змін
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => console.log(err));
}

document.addEventListener("DOMContentLoaded", render);