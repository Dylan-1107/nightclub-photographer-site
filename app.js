const qs = (sel, root = document) => root.querySelector(sel);

const videoGrid = qs('#videoGrid');
const photoGrid = qs('#photoGrid');
const lightbox = qs('#lightbox');
const lightboxVideo = qs('#lightboxVideo');
const lightboxTitle = qs('#lightboxTitle');
const lightboxInfo = qs('#lightboxInfo');
const lightboxMeta = lightbox ? qs('.lightbox-meta', lightbox) : null;
const lightboxInner = lightbox ? qs('.lightbox-inner', lightbox) : null;
const lightboxBackdrop = qs('#lightboxBackdrop');
const closeLightbox = qs('#closeLightbox');
const backToTop = qs('#backToTop');

let photos = [];
let videos = [];
let currentPhotoIndex = -1;
let currentVideoIndex = -1;
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let isSwipingPhoto = false;
let activeMediaKind = null;

const networkInfo = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
const shouldAutoplayVideo = !(networkInfo?.saveData || /(^|-)2g|3g/.test(networkInfo?.effectiveType || ''));

const lightboxImage = document.createElement('img');
lightboxImage.id = 'lightboxImage';
lightboxImage.className = 'lightbox-image hidden';
lightboxImage.alt = '';

const lightboxImageNext = document.createElement('img');
lightboxImageNext.id = 'lightboxImageNext';
lightboxImageNext.className = 'lightbox-image lightbox-image-next hidden';
lightboxImageNext.alt = '';

if (lightboxVideo) {
  lightboxVideo.insertAdjacentElement('afterend', lightboxImage);
  lightboxImage.insertAdjacentElement('afterend', lightboxImageNext);
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

function updateLightboxBackdrop(src) {
  if (!lightboxBackdrop) return;
  lightboxBackdrop.style.backgroundImage = src ? `url("${src}")` : 'none';
}

function showPhoto(item, index) {
  if (!lightbox || !lightboxVideo || !lightboxMeta) return;

  activeMediaKind = 'photo';
  currentPhotoIndex = index;
  currentVideoIndex = -1;
  lightbox.classList.remove('hidden');
  setBodyScrollLock(true);

  if (lightboxTitle) lightboxTitle.textContent = '';
  if (lightboxInfo) {
    lightboxInfo.textContent = '';
  }
  lightboxMeta.style.display = 'none';

  lightboxVideo.pause();
  lightboxVideo.removeAttribute('src');
  lightboxVideo.removeAttribute('controls');
  lightboxVideo.classList.add('hidden');
  lightboxVideo.style.display = 'none';
  lightboxVideo.load();

  lightboxImage.src = item.file;
  lightboxImage.alt = item.title || '';
  lightboxImage.classList.remove('hidden');
  lightboxImage.style.transform = 'translateX(0) scale(1)';
  lightboxImage.style.opacity = '1';
  lightboxImageNext.classList.add('hidden');
  lightboxImageNext.style.transform = 'translateX(26%) scale(.985)';
  lightboxImageNext.style.opacity = '0';
  updateLightboxBackdrop(item.file || item.poster);
  prevBtn.classList.remove('hidden');
  nextBtn.classList.remove('hidden');
}

function showVideo(item, index = -1) {
  if (!lightbox || !lightboxVideo || !lightboxMeta) return;

  activeMediaKind = 'video';
  currentVideoIndex = index;
  currentPhotoIndex = -1;
  lightbox.classList.remove('hidden');
  setBodyScrollLock(true);

  if (lightboxTitle) lightboxTitle.textContent = item.title || '视频作品';
  if (lightboxInfo) {
    lightboxInfo.textContent = `${item.width}×${item.height} · ${formatDuration(item.durationSec)} · ${item.sizeMB} MB · 视频`;
  }
  lightboxMeta.style.display = 'block';

  lightboxImage.classList.add('hidden');
  lightboxImage.removeAttribute('src');
  lightboxImageNext.classList.add('hidden');
  lightboxImageNext.removeAttribute('src');
  prevBtn.classList.remove('hidden');
  nextBtn.classList.remove('hidden');

  lightboxVideo.style.display = 'block';
  lightboxVideo.classList.remove('hidden');
  lightboxVideo.setAttribute('controls', 'controls');
  lightboxVideo.setAttribute('controlsList', 'nodownload noplaybackrate');
  lightboxVideo.disablePictureInPicture = true;
  lightboxVideo.preload = shouldAutoplayVideo ? 'auto' : 'metadata';
  lightboxVideo.src = item.remoteUrl || item.file;
  lightboxVideo.poster = item.poster;
  updateLightboxBackdrop(item.poster || item.file);

  if (shouldAutoplayVideo) {
    lightboxVideo.play().catch(() => {});
  }
}


function syncActivePhotoFromNext(nextItem, nextIndex) {
  lightboxImage.src = nextItem.file;
  lightboxImage.alt = nextItem.title || '';
  updateLightboxBackdrop(nextItem.file || nextItem.poster);
  currentPhotoIndex = nextIndex;
}

function animatePhotoSwap(step) {
  if (!lightboxImage || !lightboxImageNext || currentPhotoIndex < 0 || isSwipingPhoto) return;
  isSwipingPhoto = true;

  const nextIndex = (currentPhotoIndex + step + photos.length) % photos.length;
  const nextItem = photos[nextIndex];
  const dir = step > 0 ? -1 : 1;

  lightboxImageNext.src = nextItem.file;
  lightboxImageNext.alt = nextItem.title || '';
  lightboxImageNext.classList.remove('hidden');
  lightboxImageNext.style.transition = 'transform 260ms ease, opacity 260ms ease';
  lightboxImage.style.transition = 'transform 260ms ease, opacity 260ms ease';

  lightboxImage.style.transform = `translateX(${dir * -100}%) scale(.985)`;
  lightboxImage.style.opacity = '0.22';
  lightboxImageNext.style.transform = 'translateX(0) scale(1)';
  lightboxImageNext.style.opacity = '1';

  window.setTimeout(() => {
    syncActivePhotoFromNext(nextItem, nextIndex);
    lightboxImage.style.transition = 'none';
    lightboxImage.style.transform = 'translateX(0) scale(1)';
    lightboxImage.style.opacity = '1';
    lightboxImageNext.classList.add('hidden');
    lightboxImageNext.style.transition = 'none';
    lightboxImageNext.style.transform = `translateX(${dir * 26}%) scale(.985)`;
    lightboxImageNext.style.opacity = '0';
    isSwipingPhoto = false;
  }, 270);
}

function showAdjacentPhoto(step) {
  if (!photos.length || currentPhotoIndex < 0) return;
  animatePhotoSwap(step);
}

function showAdjacentVideo(step) {
  if (!videos.length || currentVideoIndex < 0) return;
  const nextIndex = (currentVideoIndex + step + videos.length) % videos.length;
  const nextItem = videos[nextIndex];
  showVideo(nextItem, nextIndex);
}

function showAdjacentMedia(step) {
  if (activeMediaKind === 'photo') showAdjacentPhoto(step);
  if (activeMediaKind === 'video') showAdjacentVideo(step);
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
  currentVideoIndex = -1;
  activeMediaKind = null;
  updateLightboxBackdrop('');

  lightbox.classList.add('hidden');
  setBodyScrollLock(false);
}

function createCard(item, index = -1) {
  const card = document.createElement('article');
  card.className = `card ${item.kind} ${item.orientation}`;

  const poster = item.poster || item.file;

  const typeLabel = item.kind === 'photo'
    ? (item.orientation === 'vertical' ? '竖版照片' : '横版照片')
    : (item.orientation === 'vertical' ? '竖版视频' : '横版视频');

  const actionLabel = item.kind === 'photo' ? '查看大图' : '播放作品';
  const actionIcon = item.kind === 'photo' ? '⌕' : '▶';
  const durationPill = item.kind === 'video' ? `<span class="pill">${formatDuration(item.durationSec)}</span>` : '';

  card.innerHTML = `
    <div class="card-media" role="button" tabindex="0">
      <img src="${poster}" alt="${item.title || ''}" loading="lazy" decoding="async" />
      <span class="play-badge">${actionIcon} ${actionLabel}</span>
    </div>
    ${item.kind === 'photo' ? '' : `
      <div class="card-body">
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
    else showVideo(item, index);
  };

  if (media) {
    media.addEventListener('click', open, { passive: true });
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
  let backToTopTicking = false;
window.addEventListener('scroll', () => {
  if (backToTopTicking) return;
  backToTopTicking = true;
  window.requestAnimationFrame(() => {
    updateBackToTopVisibility();
    backToTopTicking = false;
  });
}, { passive: true });
}

function initLightboxEvents() {
  if (!lightbox) return;

  const handleSwipeStart = (e) => {
    if (lightbox.classList.contains('hidden')) return;
    if (activeMediaKind === 'photo' && isSwipingPhoto) return;
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
    touchEndX = touchStartX;
    touchEndY = touchStartY;
    if (activeMediaKind === 'photo') {
      lightboxImage.style.transition = 'none';
      lightboxImageNext.style.transition = 'none';
    }
  };

  const handlePhotoSwipeMove = (e) => {
    if (currentPhotoIndex < 0 || isSwipingPhoto) return;
    const currentX = e.changedTouches[0].clientX;
    touchEndX = currentX;
    touchEndY = e.changedTouches[0].clientY;
    const deltaX = currentX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;

    const limited = Math.max(-140, Math.min(140, deltaX));
    const direction = limited < 0 ? 1 : -1;
    const previewIndex = (currentPhotoIndex + direction + photos.length) % photos.length;
    const previewItem = photos[previewIndex];

    lightboxImageNext.src = previewItem.file;
    lightboxImageNext.alt = previewItem.title || '';
    lightboxImageNext.classList.remove('hidden');

    lightboxImage.style.transform = `translateX(${limited}px) scale(.992)`;
    lightboxImage.style.opacity = `${Math.max(0.7, 1 - Math.abs(limited) / 220)}`;

    const nextOffset = direction > 0 ? limited + window.innerWidth * 0.82 : limited - window.innerWidth * 0.82;
    lightboxImageNext.style.transform = `translateX(${nextOffset}px) scale(.992)`;
    lightboxImageNext.style.opacity = `${Math.min(1, Math.max(0.22, Math.abs(limited) / 120))}`;
  };

  const resetPhotoSwipePreview = (deltaX = 0) => {
    lightboxImage.style.transition = 'transform 220ms ease, opacity 220ms ease';
    lightboxImageNext.style.transition = 'transform 220ms ease, opacity 220ms ease';
    lightboxImage.style.transform = 'translateX(0) scale(1)';
    lightboxImage.style.opacity = '1';
    lightboxImageNext.style.opacity = '0';
    lightboxImageNext.style.transform = `translateX(${deltaX < 0 ? '26%' : '-26%'}) scale(.985)`;
    window.setTimeout(() => {
      lightboxImage.style.transition = '';
      lightboxImageNext.style.transition = '';
      lightboxImageNext.classList.add('hidden');
    }, 220);
  };

  const handleSwipeEnd = (e) => {
    if (lightbox.classList.contains('hidden')) return;
    touchEndX = e.changedTouches[0].clientX;
    touchEndY = e.changedTouches[0].clientY;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (activeMediaKind === 'photo' && currentPhotoIndex >= 0 && absX < 55 && absY < 55) {
      resetPhotoSwipePreview(deltaX);
      return;
    }

    if (absX < 55 && absY < 55) return;

    if (absX >= absY) {
      if (deltaX < 0) showAdjacentMedia(1);
      else showAdjacentMedia(-1);
      return;
    }

    if (activeMediaKind === 'photo' && currentPhotoIndex >= 0) resetPhotoSwipePreview(deltaX);
    if (deltaY < 0) showAdjacentMedia(1);
    else showAdjacentMedia(-1);
  };

  const goPrev = (e) => {
    e.preventDefault();
    e.stopPropagation();
    showAdjacentMedia(-1);
  };

  const goNext = (e) => {
    e.preventDefault();
    e.stopPropagation();
    showAdjacentMedia(1);
  };

  prevBtn.addEventListener('click', goPrev);
  nextBtn.addEventListener('click', goNext);
  prevBtn.addEventListener('touchend', goPrev, { passive: false });
  nextBtn.addEventListener('touchend', goNext, { passive: false });

  lightboxImage.addEventListener('touchstart', handleSwipeStart, { passive: true });
  lightboxImage.addEventListener('touchmove', handlePhotoSwipeMove, { passive: true });
  lightboxImage.addEventListener('touchend', handleSwipeEnd, { passive: true });
  lightboxVideo.addEventListener('touchstart', handleSwipeStart, { passive: true });
  lightboxVideo.addEventListener('touchend', handleSwipeEnd, { passive: true });
  lightboxInner.addEventListener('touchstart', handleSwipeStart, { passive: true });
  lightboxInner.addEventListener('touchend', handleSwipeEnd, { passive: true });

  if (closeLightbox) closeLightbox.addEventListener('click', closeViewer);

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeViewer();
  }, { passive: true });

  document.addEventListener('keydown', (e) => {
    if (lightbox.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowLeft') showAdjacentMedia(-1);
    if (e.key === 'ArrowRight') showAdjacentMedia(1);
    if (e.key === 'ArrowUp') showAdjacentMedia(1);
    if (e.key === 'ArrowDown') showAdjacentMedia(-1);
  });
}

async function loadPortfolio() {
  if (!videoGrid || !photoGrid) return;

  try {
    const [res, mapRes] = await Promise.all([
      fetch('portfolio.json'),
      fetch('video-host.json').catch(() => null)
    ]);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = await res.json();

    let hostMap = {};
    if (mapRes && mapRes.ok) {
      try { hostMap = await mapRes.json(); } catch { hostMap = {}; }
    }

    if (!Array.isArray(items) || !items.length) {
      showEmptyState(videoGrid, '暂无视频作品');
      showEmptyState(photoGrid, '暂无照片作品');
      return;
    }

    const normalized = items.map((i) => {
      if (i.kind !== 'video') return i;
      const key = i.file || '';
      return {
        ...i,
        remoteUrl: hostMap[key] || hostMap[i.title] || i.remoteUrl || i.file
      };
    });

    videos = normalized.filter((i) => i.kind === 'video');
    photos = normalized.filter((i) => i.kind === 'photo');

    if (videos.length) videos.forEach((item, index) => videoGrid.appendChild(createCard(item, index)));
    else showEmptyState(videoGrid, '暂无视频作品');

    if (photos.length) photos.forEach((item, index) => photoGrid.appendChild(createCard(item, index)));
    else showEmptyState(photoGrid, '暂无照片作品');
  } catch (err) {
    console.error('Failed to load portfolio.json:', err);
    showEmptyState(videoGrid, '作品加载失败，请稍后刷新重试');
    showEmptyState(photoGrid, '作品加载失败，请稍后刷新重试');
  }
}

document.addEventListener('contextmenu', (e) => {
  const media = e.target.closest('video, img');
  if (media) e.preventDefault();
});

initAnchors();
initBackToTop();
initLightboxEvents();
loadPortfolio();
