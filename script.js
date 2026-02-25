// --- 1. НАСТРОЙКИ (Вставь свои ключи!) ---
const firebaseConfig = {
    apiKey: "AIzaSyALdLdIiC5Jwfkeo6gfa3OaHHm3gkQ3jtM",
    authDomain: "qiwi-8aa6a.firebaseapp.com",
    databaseURL: "https://qiwi-8aa6a-default-rtdb.firebaseio.com",
    projectId: "qiwi-8aa6a",
    storageBucket: "qiwi-8aa6a.firebasestorage.app",
    messagingSenderId: "1:12192651267:web:73e98c5c764a19e3d2d636",
    appId: "G-6HWP543LDE"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Проверяем сессию (кто вошел в этом браузере)
let currentUser = JSON.parse(sessionStorage.getItem('sessionUser')) || { name: "Гость", handle: "guest" + Math.floor(Math.random()*100), isGuest: true };

// --- 2. РАБОТА С ПОСТАМИ (ОБЛАКО) ---

function sendPost() {
    const text = document.getElementById('post-content').value.trim();
    if (!text) return;

    db.ref('all_posts').push({
        handle: currentUser.handle,
        name: currentUser.name,
        content: text,
        date: Date.now()
    });
    document.getElementById('post-content').value = "";
}

// Слушаем посты
db.ref('all_posts').on('value', (snapshot) => {
    const data = snapshot.val();
    const feed = document.getElementById('feed');
    feed.innerHTML = "";
    if (data) {
        Object.values(data).reverse().forEach(post => {
            feed.innerHTML += 
                <div class="p-4 border-b">
                    <b>@${post.handle}</b>
                    <p>${post.content}</p>
                </div>
            ;
        });
    }
});

// --- 3. РЕКОМЕНДАЦИИ И АККАУНТЫ (ОБЛАКО) ---

// Функция регистрации (вызывать при создании аккаунта)
function registerUser(name, handle, password) {
    const newUser = { name, handle, password };
    // Сохраняем в облачную папку 'users'
    db.ref('users/' + handle).set(newUser);
}

// Слушаем список всех пользователей для рекомендаций
db.ref('users').on('value', (snapshot) => {
    const allUsers = snapshot.val();
    const recList = document.getElementById('recommendations-list');
    if (!recList) return;
    
    recList.innerHTML = "";
    if (allUsers) {
        // Убираем себя из списка и выводим остальных
        Object.values(allUsers)
            .filter(u => u.handle !== currentUser.handle)
            .forEach(user => {
                recList.innerHTML += 
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-sm font-bold">@${user.handle}</span>
                        <button class="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">Читать</button>
                    </div>
                ;
            });
    }
});

// --- 4. АВТОРИЗАЦИЯ ---

// При клике на "Войти" в модалке
document.getElementById('auth-submit-btn').onclick = () => {
    const login = document.getElementById('auth-user').value;
    const pass = document.getElementById('auth-pass').value;

    // Ищем юзера в облаке
    db.ref('users/' + login).once('value').then((snapshot) => {
        const user = snapshot.val();
        if (user && user.password === pass) {
            currentUser = { name: user.name, handle: user.handle, isGuest: false };
            sessionStorage.setItem('sessionUser', JSON.stringify(currentUser));
            location.reload(); // Перезагружаем, чтобы обновить UI
        } else {
            // Если не нашли — пробуем зарегистрировать (для простоты теста)
            registerUser(login, login, pass);
            alert("Аккаунт создан в облаке! Войдите еще раз.");
        }
    });
};

// Привязка кнопки поста
document.getElementById('post-btn').onclick = sendPost;