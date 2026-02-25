// --- Инициализация ---
let users = JSON.parse(localStorage.getItem('users')) || [];
let posts = JSON.parse(localStorage.getItem('posts')) || [];
let currentUser = JSON.parse(sessionStorage.getItem('sessionUser')) || { name: "Гость", handle: "guest"+Math.floor(Math.random()*1000), isGuest: true };
let selectedImageData = null;

// --- Фейерверки (упрощенная версия) ---
const canvas = document.getElementById('fireworks-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.onresize = resize; resize();

function triggerFirework() {
    const x = Math.random() * canvas.width, y = Math.random() * (canvas.height/2);
    for(let i=0; i<30; i++) particles.push({
        x, y, alpha: 1, 
        v: { x: (Math.random()-0.5)*10, y: (Math.random()-0.5)*10 },
        c: `hsl(${Math.random()*360}, 70%, 60%)`
    });
}

function animate() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach((p, i) => {
        p.x += p.v.x; p.y += p.v.y; p.alpha -= 0.02;
        ctx.globalAlpha = p.alpha; ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, 7); ctx.fill();
        if(p.alpha <= 0) particles.splice(i, 1);
    });
    requestAnimationFrame(animate);
}
animate();

// --- Функции постов ---

function renderPosts() {
    const feed = document.getElementById('feed');
    feed.innerHTML = posts.map((post, idx) => `
        <div class="p-4 border-b hover:bg-gray-50/50 transition">
            <div class="flex items-center gap-2 mb-2">
                <span class="font-bold">${post.user}</span>
                <span class="text-gray-500 text-sm">@${post.handle}</span>
                <span class="text-gray-400 text-xs">· ${new Date(post.date).toLocaleTimeString()}</span>
            </div>
            
            <p class="text-gray-800 whitespace-pre-wrap">${post.content}</p>
            ${post.image ? `<img src="${post.image}" class="post-image">` : ''}

            <div class="flex gap-8 mt-4">
                <div class="action-btn comment" onclick="toggleComments(${idx})">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                    <span class="text-sm">${post.comments?.length || 0}</span>
                </div>
                <div class="action-btn repost" onclick="repost(${idx})">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                    <span class="text-sm">${post.reposts || 0}</span>
                </div>
                <div class="action-btn like" onclick="likePost(${idx})">
                    <svg class="w-5 h-5" fill="${post.likedBy?.includes(currentUser.handle) ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                    <span class="text-sm">${post.likes || 0}</span>
                </div>
            </div>

            <div id="comments-${idx}" class="hidden mt-4 space-y-3">
                ${(post.comments || []).map(c => `
                    <div class="comment-box">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="font-bold text-sm">${c.user}</span>
                            <span class="text-gray-400 text-xs">@${c.handle}</span>
                        </div>
                        <p class="text-sm text-gray-700">${c.content}</p>
                        ${c.image ? `<img src="${c.image}" class="comment-image">` : ''}
                    </div>
                `).join('')}
                
                <div class="mt-3 flex gap-2">
                    <input type="text" id="comm-text-${idx}" placeholder="Ваш ответ..." class="flex-1 bg-gray-100 rounded-full px-4 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-400">
                    <label class="cursor-pointer p-1 text-gray-400 hover:text-blue-500">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        <input type="file" class="hidden" onchange="attachCommPhoto(event, ${idx})">
                    </label>
                    <button onclick="addComment(${idx})" class="text-blue-500 font-bold text-sm px-2">Отправить</button>
                </div>
                <div id="comm-prev-${idx}" class="hidden text-xs text-blue-500 mt-1">Фото прикреплено ✓</div>
            </div>
        </div>
    `).reverse().join('');
}

// --- Логика действий ---

function likePost(idx) {
    const post = posts[posts.length - 1 - idx];
    if(!post.likedBy) post.likedBy = [];
    
    if(post.likedBy.includes(currentUser.handle)) {
        post.likes--;
        post.likedBy = post.likedBy.filter(h => h !== currentUser.handle);
    } else {
        post.likes = (post.likes || 0) + 1;
        post.likedBy.push(currentUser.handle);
        triggerFirework(); // Салют при лайке!
    }
    saveAndRefresh();
}

function repost(idx) {
    const post = posts[posts.length - 1 - idx];
    post.reposts = (post.reposts || 0) + 1;
    
    // Создаем новый пост как репост
    posts.push({
        ...post,
        user: `${currentUser.name} (Репост)`,
        date: new Date().toISOString(),
        likes: 0, reposts: 0, comments: [], likedBy: []
    });
    
    triggerFirework();
    saveAndRefresh();
}

function toggleComments(idx) {
    const el = document.getElementById(`comments-${idx}`);
    el.classList.toggle('hidden');
}

let tempCommPhoto = null;
function attachCommPhoto(e, idx) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        tempCommPhoto = ev.target.result;
        document.getElementById(`comm-prev-${idx}`).classList.remove('hidden');
    };
    reader.readAsDataURL(e.target.files[0]);
}

function addComment(idx) {
    const post = posts[posts.length - 1 - idx];
    const text = document.getElementById(`comm-text-${idx}`).value;
    if(!text && !tempCommPhoto) return;

    if(!post.comments) post.comments = [];
    post.comments.push({
        user: currentUser.name,
        handle: currentUser.handle,
        content: text,
        image: tempCommPhoto,
        date: new Date().toISOString()
    });

    tempCommPhoto = null;
    saveAndRefresh();
}

function saveAndRefresh() {
    localStorage.setItem('posts', JSON.stringify(posts));
    renderPosts();
}

// --- Остальная логика (пост, файлы, вход) ---

document.getElementById('post-btn').onclick = () => {
    const content = document.getElementById('post-content').value;
    if(!content && !selectedImageData) return;

    posts.push({
        user: currentUser.name, handle: currentUser.handle,
        content, image: selectedImageData, date: new Date().toISOString(),
        likes: 0, reposts: 0, comments: [], likedBy: []
    });
    
    document.getElementById('post-content').value = '';
    selectedImageData = null;
    document.getElementById('image-preview-container').classList.add('hidden');
    triggerFirework();
    saveAndRefresh();
};

const fileInput = document.getElementById('file-input');
fileInput.onchange = (e) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
        selectedImageData = ev.target.result;
        document.getElementById('image-preview').src = selectedImageData;
        document.getElementById('image-preview-container').classList.remove('hidden');
    };
    reader.readAsDataURL(e.target.files[0]);
};

function clearFile() {
    selectedImageData = null;
    document.getElementById('image-preview-container').classList.add('hidden');
}

// Запуск
updateUI(); // включает renderPosts
function updateUI() {
    document.getElementById('user-info').innerHTML = `Вы: <b>${currentUser.name}</b>`;
    renderPosts();
}
