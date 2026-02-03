const CACHE_NAME = 'garden-v2';

self.addEventListener('install', (event) => {
    // Змушуємо SW активуватися негайно
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Беремо керування клієнтами на себе відразу
    event.waitUntil(clients.claim());
});

// Обробка фонової синхронізації (Periodic Sync)
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'check-plants') {
        // Оскільки localStorage недоступний у SW, ми просто кидаємо сигнал
        // Якщо PWA "прокинеться", воно само запустить render()
        console.log('Фонова перевірка запущена...');
    }
});

// Обробка натискання на сповіщення
self.addEventListener('notificationclick', (event) => {
    event.notification.close(); // Закриваємо банер

    // Якщо додаток відкрито — фокусуємось на ньому, якщо ні — відкриваємо
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            if (clientList.length > 0) {
                let client = clientList[0];
                for (let c of clientList) {
                    if (c.focused) return; // Вже у фокусі
                }
                return client.focus();
            }
            return clients.openWindow('/');
        })
    );
});