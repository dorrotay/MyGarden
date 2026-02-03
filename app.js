const STORAGE_KEY = "plants-v3-pro"; 
let plants = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let lastAction = null;

// 1. ЛОГІКА СЕЗОНІВ
function getSeason() {
    const month = new Date().getMonth();
    if (month === 11 || month <= 1) return 'winter';
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    return 'autumn';
}

// 2. СИСТЕМА ЖУРНАЛУ
function addToHistory(plant, type) {
    if (!plant.history) plant.history = [];
    const now = new Date();
    plant.history.unshift({
        type: type,
        date: now.toLocaleString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
        ts: now.getTime()
    });
    if (plant.history.length > 20) plant.history.pop();
}
window.requestNotificationPermission = function() {
    if (!("Notification" in window)) {
        alert("Цей браузер не підтримує сповіщення");
        return;
    }
    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            render(); // Перемальовуємо, щоб сховати кнопку
            new Notification("My Garden", { body: "Сповіщення активовано! 🌱" });
        }
    });
};


// 3. ФУНКЦІЯ ВІДОБРАЖЕННЯ (RENDER)
window.render = async function() {
    const container = document.getElementById("plants-container");
    const statusText = document.getElementById("status-text");
    const notifyBtn = document.getElementById("enable-notifications");
    
    if (!container) return;
    container.innerHTML = "";
    
    const season = getSeason();
    let urgentWater = 0;
    let urgentFert = 0;

    // Отримуємо "сьогодні" без часу (00:00:00)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    plants.forEach(plant => {
        // Розрахунок дати поливу
        const nextWater = new Date(plant.lastWatered);
        nextWater.setDate(nextWater.getDate() + (plant.intervals[season] || 7));
        nextWater.setHours(0, 0, 0, 0); // Обнуляємо час
        
        // Розрахунок дати добрив
        const nextFert = new Date(plant.lastFertilized || plant.lastWatered);
        nextFert.setDate(nextFert.getDate() + (plant.fertIntervals?.[season] || 30));
        nextFert.setHours(0, 0, 0, 0); // Обнуляємо час

        // ПЕРЕВІРКА: чи настав час сьогодні АБО вже прострочено
        const isWaterDay = today.getTime() >= nextWater.getTime();
        const isFertDay = today.getTime() >= nextFert.getTime();

        if (isWaterDay) urgentWater++;
        if (isFertDay) urgentFert++;

        const card = document.createElement("div");
        
        // Визначаємо клас застереження
        let statusClass = "";
        if (isWaterDay) statusClass = "overdue";
        else if (isFertDay) statusClass = "fert-overdue";

        card.className = `plant-card ${statusClass}`; 
        
        // Текст для дат (замість просто дати пишемо "Сьогодні", якщо пора)
        const waterText = (today.getTime() === nextWater.getTime()) ? "Сьогодні!" : nextWater.toLocaleDateString('uk-UA', {day:'numeric', month:'short'});
        const fertText = (today.getTime() === nextFert.getTime()) ? "Сьогодні!" : nextFert.toLocaleDateString('uk-UA', {day:'numeric', month:'short'});

        card.innerHTML = `
            <div class="plant-icon">${isWaterDay ? '🥀' : (isFertDay ? '🧪' : (plant.emoji || '🌿'))}</div>
            <div class="plant-info">
                <h3>${plant.name}</h3>
                <div class="date-group">
                    <p>💧 Полив: <b class="${isWaterDay ? 'alert-text' : ''}">${waterText}</b></p>
                    <input type="date" class="edit-date-mini" value="${plant.lastWatered}" onchange="manualEdit(${plant.id}, this.value)">
                </div>
                <div class="date-group">
                    <p>🧪 Добриво: <b class="${isFertDay ? 'alert-text-fert' : ''}" style="color: #ff9800">${fertText}</b></p>
                    <input type="date" class="edit-date-mini" value="${plant.lastFertilized || plant.lastWatered}" onchange="manualEditFert(${plant.id}, this.value)">
                </div>
            </div>
            <div class="card-actions">
                <button class="btn-water" onclick="water(${plant.id})">💧</button>
                <button class="btn-fert" onclick="fertilize(${plant.id})">🧪</button>
                <button class="btn-del" onclick="deletePlant(${plant.id})">✕</button>
            </div>
        `;
        container.appendChild(card);
    });

    // Оновлення головного статусу
    if (statusText) {
        if (urgentWater > 0 || urgentFert > 0) {
            statusText.innerHTML = `Пора доглянути: <span style="color:#ff7675">💧 ${urgentWater}</span> | <span style="color:#ff9800">🧪 ${urgentFert}</span>`;
        } else {
            statusText.innerText = "Всі квіти щасливі! ✨";
        }
    }

    // Кнопка сповіщень
    if (notifyBtn) {
        notifyBtn.style.display = (window.Notification && Notification.permission === "default") ? "block" : "none";
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
};
// 4. ДІЇ ТА UNDO
window.water = function(id) {
    const p = plants.find(x => x.id === id);
    lastAction = { id: id, oldDate: p.lastWatered, type: 'water' };
    p.lastWatered = new Date().toISOString().slice(0, 10);
    addToHistory(p, "💧 Полив");
    render();
    showUndoBar("Полив оновлено!");
};

window.fertilize = function(id) {
    const p = plants.find(x => x.id === id);
    lastAction = { id: id, oldDate: p.lastFertilized || p.lastWatered, type: 'fert' };
    p.lastFertilized = new Date().toISOString().slice(0, 10);
    addToHistory(p, "🧪 Добриво");
    render();
    showUndoBar("Добриво додано!");
};

window.undoWater = function() {
    if (lastAction) {
        const p = plants.find(x => x.id === lastAction.id);
        if (p) {
            if (lastAction.type === 'water') p.lastWatered = lastAction.oldDate;
            else p.lastFertilized = lastAction.oldDate;
            if (p.history) p.history.shift();
            lastAction = null;
            render();
            document.getElementById("undo-bar").classList.remove("show");
        }
    }
};

// 5. РЕДАГУВАННЯ КАЛЕНДАРІВ
window.manualEdit = (id, date) => { 
    const p = plants.find(x => x.id === id); 
    if(p) { p.lastWatered = date; render(); }
};
window.manualEditFert = (id, date) => { 
    const p = plants.find(x => x.id === id); 
    if(p) { p.lastFertilized = date; render(); }
};

// 6. ДОДАВАННЯ ТА СИСТЕМНІ
window.addNewPlant = function() {
    const name = document.getElementById("plantName").value;
    const emoji = document.getElementById("plantEmoji").value || "🌿";
    const getV = (id) => parseInt(document.getElementById(id).value) || 7;

    plants.push({
        id: Date.now(),
        name: name,
        emoji: emoji,
        intervals: { winter: getV("intWinter"), spring: getV("intSpring"), summer: getV("intSummer"), autumn: getV("intAutumn") },
        fertIntervals: { winter: getV("fertWinter") || 30, spring: getV("fertSpring") || 14, summer: getV("fertSummer") || 14, autumn: getV("fertAutumn") || 30 },
        lastWatered: new Date().toISOString().slice(0, 10),
        lastFertilized: new Date().toISOString().slice(0, 10),
        history: []
    });
    window.toggleModal(false);
    render();
};

function showUndoBar(text) {
    const bar = document.getElementById("undo-bar");
    if(bar) {
        bar.querySelector('span').innerText = text;
        bar.classList.add("show");
        setTimeout(() => bar.classList.remove("show"), 5000);
    }
}
window.requestNotificationPermission = function() {
    if (!("Notification" in window)) return;
    Notification.requestPermission().then(permission => {
        // Після вибору (дозволити/відхилити) перемальовуємо, щоб кнопка зникла
        render(); 
    });
};

function sendNotification(count) {
    if (Notification.permission === "granted") {
        new Notification("My Garden", {
            body: `Потрібно полити рослин: ${count} 🌿`,
            icon: "https://cdn-icons-png.flaticon.com/512/628/628283.png"
        });
    }
}

window.deletePlant = (id) => { if(confirm("Видалити?")) { plants = plants.filter(p => p.id !== id); render(); } };
window.toggleModal = (s) => document.getElementById("modal").style.display = s ? "flex" : "none";
window.toggleHistoryModal = (s) => {
    const m = document.getElementById("history-modal");
    if(s) {
        let all = [];
        plants.forEach(p => (p.history || []).forEach(e => all.push({...e, name: p.name})));
        all.sort((a,b) => b.ts - a.ts);
        document.getElementById("global-history-list").innerHTML = all.map(e => `
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eee; font-size:12px;">
                <span><b>${e.name}</b>: ${e.type}</span><small>${e.date}</small>
            </div>`).join('') || "Порожньо";
        m.style.display = "flex";
    } else m.style.display = "none";
};

document.addEventListener("DOMContentLoaded", render);