const AUTH = {
    email: "sadaf245sz@gmail.com",
    pass: "Siyam123@#",
    savePass: "135780"
};

let currentRepoIndex = 1;
let totalUsedBytes = 0;
let imagesData = JSON.parse(localStorage.getItem('vault_images')) || [];
let activeTab = 'all';

// Check Auth State on Page Load (Persists across refresh)
window.addEventListener('DOMContentLoaded', () => {
    const isLogged = sessionStorage.getItem('isLoggedIn');
    if (isLogged === 'true') {
        showDashboard();
    }
});

// Particle Canvas Animation
const canvas = document.getElementById('nano-canvas');
const ctx = canvas.getContext('2d');
let particles = [];

function initParticles() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    particles = [];
    for(let i=0; i<60; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 2,
            dx: (Math.random() - 0.5) * 0.8,
            dy: (Math.random() - 0.5) * 0.8
        });
    }
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0, 242, 254, 0.4)';
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.05)';

    particles.forEach((p, i) => {
        p.x += p.dx; p.y += p.dy;
        if(p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if(p.y < 0 || p.y > canvas.height) p.dy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        for(let j = i + 1; j < particles.length; j++) {
            const dist = Math.hypot(p.x - particles[j].x, p.y - particles[j].y);
            if(dist < 120) {
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    });
    requestAnimationFrame(animateParticles);
}
window.addEventListener('resize', initParticles);
initParticles(); animateParticles();

// Login & Session logic
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (document.getElementById('email').value === AUTH.email && document.getElementById('password').value === AUTH.pass) {
        sessionStorage.setItem('isLoggedIn', 'true');
        showDashboard();
    } else { 
        alert("Access Denied!"); 
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem('isLoggedIn');
    location.reload();
});

function showDashboard() {
    document.getElementById('login-sec').classList.add('hidden');
    document.getElementById('dashboard-sec').classList.remove('hidden');
    calculateInitialStorage();
    renderGallery();
}

// Compression & Base64 Engine (< 3MB)
document.getElementById('file-input').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    document.getElementById('tag-input-group').classList.remove('hidden');
    promptModal("GitHub API Push", "Enter PAT Token to process upload:", async (token) => {
        const tagVal = document.getElementById('modal-tag').value || 'General';
        document.getElementById('tag-input-group').classList.add('hidden');

        for (let file of files) {
            const compressedBase64 = await compressAndEncode(file);
            
            const sizeInBytes = compressedBase64.length;
            if (totalUsedBytes + sizeInBytes > 900 * 1024 * 1024) {
                currentRepoIndex++;
                totalUsedBytes = 0;
                document.getElementById('repo-status').innerText = `Connected: Repo-${currentRepoIndex} (Auto-Shifted)`;
            }
            totalUsedBytes += sizeInBytes;
            updateStorageMeter();

            const imgObj = { id: Date.now() + Math.random(), src: compressedBase64, fav: false, tag: tagVal };
            imagesData.push(imgObj);
        }
        localStorage.setItem('vault_images', JSON.stringify(imagesData));
        renderGallery();
    });
});

function compressAndEncode(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > 1920) { h = Math.round((h * 1920) / w); w = 1920; }
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);

                let quality = 0.9;
                let base64 = canvas.toDataURL('image/jpeg', quality);
                while (base64.length > 3 * 1024 * 1024 && quality > 0.1) {
                    quality -= 0.1;
                    base64 = canvas.toDataURL('image/jpeg', quality);
                }
                resolve(base64);
            };
        };
    });
}

// Gallery Render
function renderGallery() {
    const gallery = document.getElementById('gallery');
    gallery.innerHTML = '';
    const searchTag = document.getElementById('search-input').value.toLowerCase();

    const filtered = imagesData.filter(item => {
        const matchTab = activeTab === 'all' || (activeTab === 'favs' && item.fav);
        const matchSearch = item.tag.toLowerCase().includes(searchTag);
        return matchTab && matchSearch;
    });

    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'photo-card';
        card.innerHTML = `
            <span class="fav-heart" onclick="toggleFav(${item.id})">${item.fav ? '♥' : '♡'}</span>
            <img src="${item.src}" loading="lazy">
            <span class="tag-badge">#${item.tag}</span>
            <div class="card-actions">
                <button class="btn-nano" onclick="openLightbox('${item.src}')">Fullscreen</button>
                <button class="btn-nano" style="background:#2ed573;" onclick="downloadImage('${item.src}')">Save Phone</button>
            </div>
        `;
        gallery.appendChild(card);
    });
}

function toggleFav(id) {
    const img = imagesData.find(i => i.id === id);
    if (img) img.fav = !img.fav;
    localStorage.setItem('vault_images', JSON.stringify(imagesData));
    renderGallery();
}

function switchTab(tab) {
    activeTab = tab;
    renderGallery();
}

function setLayout(layout) {
    const g = document.getElementById('gallery');
    document.getElementById('btn-grid').classList.toggle('active', layout === 'grid');
    document.getElementById('btn-masonry').classList.toggle('active', layout === 'masonry');
    g.className = layout === 'grid' ? 'gallery-grid' : 'gallery-masonry';
}

document.getElementById('search-input').addEventListener('input', renderGallery);

function calculateInitialStorage() {
    totalUsedBytes = imagesData.reduce((acc, curr) => acc + curr.src.length, 0);
    updateStorageMeter();
}

function updateStorageMeter() {
    const mb = (totalUsedBytes / (1024 * 1024)).toFixed(1);
    document.getElementById('storage-txt').innerText = `${mb} MB / 1024 MB`;
    document.getElementById('meter-fill').style.width = `${(mb / 1024) * 100}%`;
}

function downloadImage(src) {
    promptModal("Security Passcode", "Enter download passcode to save:", (pass) => {
        if (pass === AUTH.savePass) {
            const a = document.createElement('a');
            a.href = src; a.download = `PhotoHub_${Date.now()}.jpg`; a.click();
        } else alert("Wrong Passcode!");
    });
}

function openLightbox(src) {
    document.getElementById('lightbox-img').src = src;
    document.getElementById('lightbox').classList.remove('hidden');
}
function closeLightbox() { document.getElementById('lightbox').classList.add('hidden'); }

function promptModal(title, desc, callback) {
    const modal = document.getElementById('modal-sec');
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-desc').innerText = desc;
    const input = document.getElementById('modal-input');
    input.value = "";
    modal.classList.remove('hidden');

    const submit = document.getElementById('modal-submit');
    const newSubmit = submit.cloneNode(true);
    submit.parentNode.replaceChild(newSubmit, submit);

    newSubmit.addEventListener('click', () => {
        modal.classList.add('hidden');
        callback(input.value);
    });
                       }
