document.addEventListener('DOMContentLoaded', () => {
    // --- Инициализация ---
    let users = JSON.parse(localStorage.getItem('users')) || [];
    let posts = JSON.parse(localStorage.getItem('posts')) || [];
    let currentUser = JSON.parse(sessionStorage.getItem('sessionUser')) || { name: "Гость", handle: `guest${Math.floor(Math.random()*1000)}`, isGuest: true };
    let selectedImageData = null;
    let isLoginMode = true;

    // --- Салюты (Canvas) ---
    const canvas = document.getElementById('fireworks-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.onresize = resize; resize();

    window.triggerFirework = () => {
        const x = Math.random() * canvas.width, y = Math.random() * (canvas.height / 2);
        for (let i = 0; i < 25; i++) {
            particles.push({
                x, y, alpha: 1,
                v: { x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8 },
                c: `hsl(${Math.random() * 360}, 80%, 60%)`
            });
        }
    };

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach((p, i) => {
            p.x += p.v.x; p.y += p.v.y; p.alpha -= 0.015;
            ctx.globalAlpha = p.alpha; ctx.fillStyle = p.c;
            ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, 7); ctx.fill();
            if (p.alpha <= 0) particles.splice(i, 1);
        });
        requestAnimationFrame(animate);
    }
    animate();

    // --- Логика Интерфейса ---

    function updateUI() {
        document.getElementById('user-info').innerText = `@${currentUser.handle} (${currentUser.isGuest ? 'Гость' : 'Аккаунт'})`;
        document.getElementById('main-auth-btn').innerText = currentUser.isGuest ? "Войти" : "Выйти";
        renderPosts();
        renderRecommendations();
    }

    function renderPosts() {
        const feed = document.getElementById('feed');
        if (!feed) return;
        
        const sorted = [...posts].reverse();
        feed.innerHTML = sorted.map(post => {
            const realIdx = posts.indexOf(post);
            return `
            <div class="p-5 hover:bg-gray-50 transition group">
                <div class="flex justify-between">
                    <div class="flex items-center gap-2 mb-2">
                        <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">${post.handle[0].toUpperCase()}</div>
                        <span class="font-bold text-gray-900">@${post.handle}</span>
                        <span class="text-gray-400 text-xs">${new Date(post.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                </div>
                <p class="text-[17px] leading-relaxed text-gray-800 whitespace-pre-wrap">${post.content}</p>
                ${post.image ? `<img src="${post.image}" class="post-image mt-3 border shadow-sm">` : ''}
                
                <div class="flex gap-10 mt-4">
                    <button onclick="window.doLike(${realIdx})" class="flex items-center gap-1.5 transition ${post.likedBy?.includes(currentUser.handle) ? 'text-rose-500 font-bold' : 'text-gray-500 hover:text-rose-500'}">
                        <span>${post.likedBy?.includes(currentUser.handle) ? '❤️' : '♡'}</span> ${post.likes || 0}
                    </button>
                    <button onclick="window.toggleComm(${realIdx})" class="flex items-center gap-1.5 text-gray-500 hover:text-blue-500 transition">
                        <span>💬</span> ${post.comments?.length || 0}
                    </button>
                </div>

                <div id="comm-section-${realIdx}" class="hidden mt-4 pt-4 border-t border-gray-50">
                    <div class="space-y-3 mb-4">
                        ${(post.comments || []).map(c => `
                            <div class="text-sm bg-gray-50 p-2 rounded-xl"><b class="text-blue-600">@${c.handle}:</b> ${c.text}</div>
                        `).join('')}
                    </div>
                    <div class="flex gap-2">
                        <input type="text" id="comm-input-${realIdx}" class="flex-1 bg-gray-100 border-none rounded-full px-4 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-300" placeholder="Ваш ответ...">
                        <button onclick="window.doComment(${realIdx})" class="text-blue-500 font-bold text-sm px-2">OK</button>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    function renderRecommendations() {
        const list = document.getElementById('recommendations-list');
        const others = users.filter(u => u.handle !== currentUser.handle).slice(0, 5);
        
        if (others.length === 0) {
            list.innerHTML = `<p class="text-xs text-gray-400 italic">Зарегистрируйтесь, чтобы здесь кто-то появился</p>`;
            return;
        }

        list.innerHTML = others.map(u => `
            <div class="flex justify-between items-center bg-gray-50 p-2 rounded-xl">
                <div class="flex items-center gap-2">
                    <div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-[10px] font-bold">${u.handle[0].toUpperCase()}</div>
                    <span class="text-sm font-bold">@${u.handle}</span>
                </div>
                <button class="bg-blue-500 text-white text-[10px] px-3 py-1 rounded-full font-bold hover:bg-blue-600 transition">Читать</button>
            </div>
        `).join('');
    }

    // --- Глобальные функции ---
    window.doLike = (idx) => {
        const post = posts[idx];
        if (!post.likedBy) post.likedBy = [];
        if (post.likedBy.includes(currentUser.handle)) {
            post.likes--;
            post.likedBy = post.likedBy.filter(h => h !== currentUser.handle);
        } else {
            post.likes = (post.likes || 0) + 1;
            post.likedBy.push(currentUser.handle);
            window.triggerFirework();
        }
        save();
    };

    window.toggleComm = (idx) => document.getElementById(`comm-section-${idx}`).classList.toggle('hidden');

    window.doComment = (idx) => {
        const input = document.getElementById(`comm-input-${idx}`);
        if (!input.value.trim()) return;
        if (!posts[idx].comments) posts[idx].comments = [];
        posts[idx].comments.push({ handle: currentUser.handle, text: input.value.trim() });
        input.value = '';
        save();
    };

    const save = () => { localStorage.setItem('posts', JSON.stringify(posts)); renderPosts(); };

    // --- События ---

    document.getElementById('post-btn').onclick = () => {
        const content = document.getElementById('post-content').value.trim();
        if (!content && !selectedImageData) return;
        posts.push({
            handle: currentUser.handle, content, image: selectedImageData,
            date: new Date().toISOString(), likes: 0, likedBy: [], comments: []
        });
        document.getElementById('post-content').value = '';
        selectedImageData = null;
        document.getElementById('image-preview-container').classList.add('hidden');
        window.triggerFirework();
        save();
    };

    document.getElementById('file-input').onchange = (e) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            selectedImageData = ev.target.result;
            document.getElementById('image-preview').src = selectedImageData;
            document.getElementById('image-preview-container').classList.remove('hidden');
        };
        reader.readAsDataURL(e.target.files[0]);
    };

    document.getElementById('clear-image-btn').onclick = () => {
        selectedImageData = null;
        document.getElementById('image-preview-container').classList.add('hidden');
    };

    // --- Авторизация ---
    const authModal = document.getElementById('auth-modal');
    document.getElementById('main-auth-btn').onclick = () => {
        if (!currentUser.isGuest) {
            currentUser = { name: "Гость", handle: `guest${Math.floor(Math.random()*1000)}`, isGuest: true };
            sessionStorage.removeItem('sessionUser');
            updateUI();
        } else authModal.classList.remove('hidden');
    };

    document.getElementById('auth-toggle').onclick = () => {
        isLoginMode = !isLoginMode;
        document.getElementById('modal-title').innerText = isLoginMode ? "С возвращением!" : "Создать аккаунт";
        document.getElementById('auth-submit-btn').innerText = isLoginMode ? "Продолжить" : "Зарегистрироваться";
        document.getElementById('auth-toggle').innerText = isLoginMode ? "Еще нет аккаунта? Регистрация" : "Уже есть аккаунт? Войти";
    };

    document.getElementById('auth-submit-btn').onclick = () => {
        const login = document.getElementById('auth-user').value.trim();
        const pass = document.getElementById('auth-pass').value.trim();
        if (!login || !pass) return alert("Заполните поля!");

        if (isLoginMode) {
            const u = users.find(x => x.handle === login && x.password === pass);
            if (u) {
                currentUser = { name: u.name, handle: u.handle, isGuest: false };
                sessionStorage.setItem('sessionUser', JSON.stringify(currentUser));
                authModal.classList.add('hidden');
                updateUI();
            } else alert("Неверный вход!");
        } else {
            if (users.find(x => x.handle === login)) return alert("Логин занят!");
            users.push({ name: login, handle: login, password: pass });
            localStorage.setItem('users', JSON.stringify(users));
            alert("Регистрация успешна!");
            document.getElementById('auth-toggle').click();
        }
    };

    document.getElementById('close-modal-btn').onclick = () => authModal.classList.add('hidden');

    // Запуск
    updateUI();
});
