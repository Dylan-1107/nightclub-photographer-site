const qs = (sel, root = document) => root.querySelector(sel);

const videoGrid = qs('#videoGrid');
const photoGrid = qs('#photoGrid');
const lightbox = qs('#lightbox');
const lightboxVideo = qs('#lightboxVideo');
const lightboxTitle = qs('#lightboxTitle');
const lightboxInfo = qs('#lightboxInfo');
const lightboxMeta = lightbox ? qs('.lightbox-meta', lightbox) : null;
const lightboxInner = lightbox ? qs('.lightbox-inner', lightbox) : null;
const closeLightbox = qs('#closeLightbox');
const backToTop = qs('#backToTop');

let photos = [];
let currentPhotoIndex = -1;
let touchStartX = 0;
let touchEndX = 0;

const lightboxImage = document.createElement('img');
lightboxImage.id = 'lightboxImage';
lightboxImage.className = 'lightbox-image hidden';
lightboxImage.alt = '';
if (lightboxVideo) {
  lightboxVideo.insertAdjacentElement('afterend', lightboxImage);
}

const prevBtn = document.createElement('button');
prevBtn.className = 'lightbox-nav lightbox-prev hidden';
prevBtn.setAttribute('aria-label', '上一张');
prevBtn.textContent = '‹';
if (lightboxInner) lightboxInner.appendChild(prevBtn);

const nextBtn = document.createElement('button');
nextBtn.className = 'lightbox-nav lightbox-next hidden';
nextBtn.setAttribute('aria-label', '下一张');
nextBtn.textContent = '›';
if (lightboxInner) lightboxInner.appendChild(nextBtn);

function setBodyScrollLock(locked) {
  if (locked) document.body.style.overflow = 'hidden';
  else document.body.style.overflow = '';
}

function formatDuration(sec = 0) {
  const m = Math.floor(sec / 60);
  const s = String(sec % 60).padStart(2, '0');
  return m > 0 ? `${m}:${s}` : `${sec}s`;
}

function showEmptyState(target, message) {
  if (!target) return;
  const box = document.createElement('div');
  box.className = 'empty-state';
  box.textContent = message;
  target.appendChild(box);
}

function showPhoto(item, index) {
  if (!lightbox || !lightboxVideo || !lightboxMeta) return;

  currentPhotoIndex = index;
  lightbox.classList.remove('hidden');
  setBodyScrollLock(true);

  if (lightboxTitle) lightboxTitle.textContent = item.title || '照片作品';
  if (lightboxInfo) {
    lightboxInfo.textContent = `${item.width}×${item.height} · ${item.sizeMB} MB · 照片`;
  }
  lightboxMeta.style.display = 'block';

  lightboxVideo.pause();
  lightboxVideo.removeAttribute('src');
  lightboxVideo.removeAttribute('controls');
  lightboxVideo.classList.add('hidden');
  lightboxVideo.style.display = 'none';
  lightboxVideo.load();

  lightboxImage.src = item.file;
  lightboxImage.alt = item.title || '';
  lightboxImage.classList.remove('hidden');
  prevBtn.classList.remove('hidden');
  nextBtn.classList.remove('hidden');
}

function showVideo(item) {
  if (!lightbox || !lightboxVideo || !lightboxMeta) return;

  lightbox.classList.remove('hidden');
  setBodyScrollLock(true);

  if (lightboxTitle) lightboxTitle.textContent = item.title || '视频作品';
  if (lightboxInfo) {
    lightboxInfo.textContent = `${item.width}×${item.height} · ${formatDuration(item.durationSec)} · ${item.sizeMB} MB · 视频`;
  }
  lightboxMeta.style.display = 'block';

  lightboxImage.classList.add('hidden');
  lightboxImage.removeAttribute('src');
  prevBtn.classList.add('hidden');
  nextBtn.classList.add('hidden');
  currentPhotoIndex = -1;

  lightboxVideo.style.display = 'block';
  lightboxVideo.classList.remove('hidden');
  lightboxVideo.setAttribute('controls', 'controls');
  lightboxVideo.src = item.file;
  lightboxVideo.poster = item.poster;
  lightboxVideo.play().catch(() => {});
}

function showAdjacentPhoto(step) {
  if (!photos.length || currentPhotoIndex < 0) return;
  const nextIndex = (currentPhotoIndex + step + photos.length) % photos.length;
  showPhoto(photos[nextIndex], nextIndex);
}

function closeViewer() {
  if (!lightbox || !lightboxVideo || !lightboxMeta) return;

  lightboxVideo.pause();
  lightboxVideo.removeAttribute('src');
  lightboxVideo.removeAttribute('poster');
  lightboxVideo.setAttribute('controls', 'controls');
  lightboxVideo.style.display = 'block';
  lightboxVideo.classList.remove('hidden');
  lightboxVideo.load();

  lightboxImage.classList.add('hidden');
  lightboxImage.removeAttribute('src');
  lightboxImage.alt = '';

  if (lightboxTitle) lightboxTitle.textContent = '';
  if (lightboxInfo) lightboxInfo.textContent = '';
  lightboxMeta.style.display = 'block';

  prevBtn.classList.add('hidden');
  nextBtn.classList.add('hidden');
  currentPhotoIndex = -1;

  lightbox.classList.add('hidden');
  setBodyScrollLock(false);
}

function createCard(item, index = -1) {
  const card = document.createElement('article');
  card.className = `card ${item.kind} ${item.orientation}`;

  const typeLabel = item.kind === 'photo'
    ? (item.orientation === 'vertical' ? '竖版照片' : '横版照片')
    : (item.orientation === 'vertical' ? '竖版视频' : '横版视频');

  const actionLabel = item.kind === 'photo' ? '查看大图' : '播放作品';
  const actionIcon = item.kind === 'photo' ? '⌕' : '▶';
  const durationPill = item.kind === 'video' ? `<span class="pill">${formatDuration(item.durationSec)}</span>` : '';

  card.innerHTML = `
    <div class="card-media" role="button" tabindex="0">
      <img src="${item.poster}" alt="${item.title || ''}" loading="lazy" />
      <span class="play-badge">${actionIcon} ${actionLabel}</span>
    </div>
    ${item.kind === 'photo' ? '' : `
      <div class="card-body">
        <h3 class="card-title">${item.title || ''}</h3>
        <div class="meta-row">
          <span class="pill">${item.width}×${item.height}</span>
          ${durationPill}
          <span class="pill">${item.sizeMB} MB</span>
          <span class="pill">${typeLabel}</span>
        </div>
      </div>
    `}
  `;

  const media = qs('.card-media', card);
  const open = () => {
    if (item.kind === 'photo') showPhoto(item, index);
    else showVideo(item);
  };

  if (media) {
    media.addEventListener('click', open);
    media.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });
  }
  return card;
}

function initAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', id);
    });
  });
}

function updateBackToTopVisibility() {
  if (!backToTop) return;
  const y = window.scrollY || document.documentElement.scrollTop;
  const show = y > 320;
  backToTop.style.opacity = show ? '1' : '0';
  backToTop.style.pointerEvents = show ? 'auto' : 'none';
  backToTop.style.transform = show ? 'translateY(0)' : 'translateY(8px)';
}

function initBackToTop() {
  if (!backToTop) return;
  updateBackToTopVisibility();
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  window.addEventListener('scroll', updateBackToTopVisibility);
}

function initLightboxEvents() {
  if (!lightbox) return;

  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showAdjacentPhoto(-1);
  });

  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showAdjacentPhoto(1);
  });

  lightboxImage.addEventListener('touchstart', (e) => {
    if (currentPhotoIndex < 0) return;
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });

  lightboxImage.addEventListener('touchend', (e) => {
    if (currentPhotoIndex < 0) return;
    touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX;
    if (Math.abs(deltaX) < 30) return;
    if (deltaX < 0) showAdjacentPhoto(1);
    else showAdjacentPhoto(-1);
  }, { passive: true });

  if (closeLightbox) closeLightbox.addEventListener('click', closeViewer);

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeViewer();
  });

  document.addEventListener('keydown', (e) => {
    if (lightbox.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowLeft' && currentPhotoIndex >= 0) showAdjacentPhoto(-1);
    if (e.key === 'ArrowRight' && currentPhotoIndex >= 0) showAdjacentPhoto(1);
  });
}

async function loadPortfolio() {
  if (!videoGrid || !photoGrid) return;

  try {
    const res = await fetch('portfolio.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = await res.json();
    if (!Array.isArray(items) || !items.length) {
      showEmptyState(videoGrid, '暂无视频作品');
      showEmptyState(photoGrid, '暂无照片作品');
      return;
    }

    const videos = items.filter((i) => i.kind === 'video');
    photos = items.filter((i) => i.kind === 'photo');

    if (videos.length) videos.forEach((item) => videoGrid.appendChild(createCard(item)));
    else showEmptyState(videoGrid, '暂无视频作品');

    if (photos.length) photos.forEach((item, index) => photoGrid.appendChild(createCard(item, index)));
    else showEmptyState(photoGrid, '暂无照片作品');
  } catch (err) {
    console.error('Failed to load portfolio.json:', err);
    showEmptyState(videoGrid, '作品加载失败，请稍后刷新重试');
    showEmptyState(photoGrid, '作品加载失败，请稍后刷新重试');
  }
}

initAnchors();
initBackToTop();
initLightboxEvents();
loadPortfolio();
