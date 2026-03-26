/* ============================================
   Choco Box — Gallery & Lightbox
   ============================================ */

(function() {
  'use strict';

  let galleryProducts = [];
  let currentIndex = 0;
  let zoomLevel = 1;
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let imageOffset = { x: 0, y: 0 };

  // ── Initialize Gallery ──
  window.initGallery = function(products) {
    galleryProducts = products;
    renderGalleryGrid();
    initLightbox();
  };

  // ── Render Gallery Grid ──
  function renderGalleryGrid() {
    const grid = document.getElementById('gallery-grid');
    if (!grid || galleryProducts.length === 0) return;

    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    grid.innerHTML = galleryProducts.map((product, index) => {
      const img = dark && product.imageDark ? product.imageDark : (product.imageLight || product.image);
      const encodedImage = encodeImagePath(img);
      return `
        <div class="gallery-item animate-on-scroll" onclick="window.chocoApp.openLightbox(${index})">
          <img src="${encodedImage}" alt="${product.name}" loading="lazy" onerror="this.parentElement.style.display='none'">
          <div class="gallery-item-overlay">
            <span class="zoom-icon">🔍</span>
            <span>${product.name}</span>
          </div>
        </div>
      `;
    }).join('');

    // Re-init scroll animations for gallery items
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    grid.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
  }

  // ── Encode Image Path ──
  function encodeImagePath(path) {
    if (!path) return '';
    if (path.includes('drive.google.com')) {
      const m = path.match(/[-\w]{25,}/);
      if (m) return `https://lh3.googleusercontent.com/d/${m[0]}`;
    }
    return path.split('/').map((s, i) => {
      if (path.startsWith('http') && i < 3) return s;
      return /[^\x00-\x7F]/.test(s) ? encodeURIComponent(s) : s;
    }).join('/');
  }

  // ── Initialize Lightbox ──
  function initLightbox() {
    const lightbox = document.getElementById('lightbox');
    const closeBtn = document.getElementById('lightbox-close');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const zoomResetBtn = document.getElementById('zoom-reset');
    const orderBtn = document.getElementById('lightbox-order');
    const image = document.getElementById('lightbox-image');

    // Set the openLightbox function on the public API
    window.chocoApp.openLightbox = openLightbox;

    // Close
    closeBtn.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    // Navigation
    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); showPrev(); });
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); showNext(); });

    // Zoom controls
    zoomInBtn.addEventListener('click', (e) => { e.stopPropagation(); zoomIn(); });
    zoomOutBtn.addEventListener('click', (e) => { e.stopPropagation(); zoomOut(); });
    zoomResetBtn.addEventListener('click', (e) => { e.stopPropagation(); resetZoom(); });

    // Order from lightbox
    orderBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.chocoApp) {
        closeLightbox(); // Close gallery to show quantity picker
        window.chocoApp.startOrderFlow(currentIndex);
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('active')) return;
      
      switch(e.key) {
        case 'Escape': closeLightbox(); break;
        case 'ArrowRight': showPrev(); break; // RTL
        case 'ArrowLeft': showNext(); break;  // RTL
        case '+': case '=': zoomIn(); break;
        case '-': zoomOut(); break;
        case '0': resetZoom(); break;
      }
    });

    // Touch/Swipe support
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    image.addEventListener('touchstart', (e) => {
      if (zoomLevel > 1) return; // Don't swipe when zoomed
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
    }, { passive: true });

    image.addEventListener('touchend', (e) => {
      if (zoomLevel > 1) return;
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      const elapsed = Date.now() - touchStartTime;

      // Only count horizontal swipes
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50 && elapsed < 500) {
        if (deltaX > 0) {
          showNext(); // Swipe right = next (RTL)
        } else {
          showPrev(); // Swipe left = prev (RTL)
        }
      }
    }, { passive: true });

    // Mouse drag for zoomed image
    image.addEventListener('mousedown', (e) => {
      if (zoomLevel <= 1) return;
      e.preventDefault();
      isDragging = true;
      dragStart.x = e.clientX - imageOffset.x;
      dragStart.y = e.clientY - imageOffset.y;
      image.classList.add('zoomed');
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      imageOffset.x = e.clientX - dragStart.x;
      imageOffset.y = e.clientY - dragStart.y;
      updateImageTransform();
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Mouse wheel zoom
    image.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        zoomIn();
      } else {
        zoomOut();
      }
    });

    // Pinch to zoom (touch)
    let lastPinchDist = 0;
    image.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        
        if (lastPinchDist > 0) {
          const delta = dist - lastPinchDist;
          if (delta > 5) zoomIn();
          else if (delta < -5) zoomOut();
        }
        lastPinchDist = dist;
      }
    }, { passive: false });

    image.addEventListener('touchend', () => {
      lastPinchDist = 0;
    }, { passive: true });
  }

  // ── Open Lightbox ──
  function openLightbox(index) {
    currentIndex = index;
    resetZoom();
    showImage();
    document.getElementById('lightbox').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  // ── Close Lightbox ──
  function closeLightbox() {
    document.getElementById('lightbox').classList.remove('active');
    document.body.style.overflow = '';
    resetZoom();
  }

  // ── Show Image ──
  function showImage() {
    const product = galleryProducts[currentIndex];
    if (!product) return;

    const image = document.getElementById('lightbox-image');
    const nameEl = document.getElementById('lightbox-name');
    const priceEl = document.getElementById('lightbox-price');
    const counterEl = document.getElementById('lightbox-counter');

    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const img = dark && product.imageDark ? product.imageDark : (product.imageLight || product.image);
    image.src = encodeImagePath(img);
    image.alt = product.name;
    nameEl.textContent = product.name;
    
    const isAskPrice = product.priceNum === 0 || product.price === 'اسأل عن السعر' || product.price === 'مجهول';
    priceEl.textContent = isAskPrice ? '💬 اسأل عن السعر' : product.price;
    
    counterEl.textContent = `${currentIndex + 1} / ${galleryProducts.length}`;
  }

  // ── Navigation ──
  function showPrev() {
    currentIndex = (currentIndex - 1 + galleryProducts.length) % galleryProducts.length;
    resetZoom();
    showImage();
  }

  function showNext() {
    currentIndex = (currentIndex + 1) % galleryProducts.length;
    resetZoom();
    showImage();
  }

  // ── Zoom ──
  function zoomIn() {
    zoomLevel = Math.min(zoomLevel + 0.3, 4);
    updateImageTransform();
  }

  function zoomOut() {
    zoomLevel = Math.max(zoomLevel - 0.3, 1);
    if (zoomLevel === 1) {
      imageOffset = { x: 0, y: 0 };
    }
    updateImageTransform();
  }

  function resetZoom() {
    zoomLevel = 1;
    imageOffset = { x: 0, y: 0 };
    updateImageTransform();
  }

  function updateImageTransform() {
    const image = document.getElementById('lightbox-image');
    if (image) {
      image.style.transform = `scale(${zoomLevel}) translate(${imageOffset.x / zoomLevel}px, ${imageOffset.y / zoomLevel}px)`;
      image.classList.toggle('zoomed', zoomLevel > 1);
    }
  }

})();
