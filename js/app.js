/* ============================================
   Choco Box — Main Application
   Intro Engine + AI Chat + Google Sheets
   ============================================ */
(function () {
  'use strict';

  // ─── Config (from config.js + localStorage override) ───
  const CFG = {
    apiUrl: '',
    whatsapp: '962XXXXXXXXX',
    facebook: '',
    geminiKey: '',
    geminiModel: 'gemini-2.0-flash'
  };

  let products = [];
  let cart = [];
  let fuseInstance = null;
  let currentlySelectingProduct = null;
  let currentSelectionQty = 1;

  // ═══════════════════════════════════════════
  // Init
  // ═══════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', () => {
    mergeConfig();
    initTheme();
    loadCartFromStorage();
    updateCartCount();
    initIntro();
    initSearch();
    initCustomOrderModal();
    initTrackOrderModal();
    initCheckoutModal();
    initContactForm();
    initScrollAnimations();
    initHeaderScroll();
    initMobileMenu();
    initMobileSearch();
    initCartUI();
    initQtyModal();
    initChocoChat();
    // Load products and remote config
    loadProducts();
    loadRemoteConfig();
  });

  // ─── Merge config.js + localStorage ───
  function mergeConfig() {
    // Global config from config.js
    const g = window.CHOCO_CONFIG || {};
    if (g.API_URL) CFG.apiUrl = g.API_URL;
    if (g.WHATSAPP) CFG.whatsapp = g.WHATSAPP;
    if (g.FACEBOOK) CFG.facebook = g.FACEBOOK;
    if (g.GEMINI_API_KEY) CFG.geminiKey = g.GEMINI_API_KEY;
    if (g.GEMINI_MODEL) CFG.geminiModel = g.GEMINI_MODEL;

    // localStorage overrides (optional, but remote will typically overwrite these)
    try {
      const saved = JSON.parse(localStorage.getItem('chocobox_settings') || '{}');
      if (saved.apiUrl) CFG.apiUrl = saved.apiUrl;
      if (saved.whatsappNumber) CFG.whatsapp = saved.whatsappNumber;
      if (saved.facebookUrl) CFG.facebook = saved.facebookUrl;
      if (saved.geminiKey) CFG.geminiKey = saved.geminiKey;
      if (saved.geminiModel) CFG.geminiModel = saved.geminiModel;
    } catch (e) {}
    applyConfigUI();
  }

  async function loadRemoteConfig() {
    if (!CFG.apiUrl) return;
    try {
      const res = await fetch(`${CFG.apiUrl}?action=getSettings`);
      const data = await res.json();
      if (data.status === 'success' && data.settings) {
        const s = data.settings;
        if (s.whatsappNumber) CFG.whatsapp = s.whatsappNumber;
        if (s.facebookUrl) CFG.facebook = s.facebookUrl;
        if (s.geminiKey) CFG.geminiKey = s.geminiKey;
        if (s.geminiModel) CFG.geminiModel = s.geminiModel;
        
        // Remote Intro Settings
        if (s.alwaysShowIntro !== undefined) {
          localStorage.setItem('chocobox_always_intro', s.alwaysShowIntro);
        }
        if (s.introSounds) {
          localStorage.setItem('chocobox_sounds', s.introSounds);
        }

        // Apply changes to UI
        applyConfigUI();
        console.log('Remote config loaded successfully ✨');
      }
    } catch (e) { 
      console.warn('Remote config load failed:', e); 
    }
  }

  function applyConfigUI() {
    if (CFG.facebook) {
      document.querySelectorAll('a[title="فيسبوك"]').forEach(el => { el.href = CFG.facebook; });
    }
    const waLink = document.getElementById('whatsapp-link');
    if (waLink) waLink.href = `https://wa.me/${CFG.whatsapp}`;
  }

  // ═══════════════════════════════════════════
  // Theme
  // ═══════════════════════════════════════════
  function initTheme() {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;
    const saved = localStorage.getItem('chocobox_theme') || 'light';
    applyTheme(saved);
    btn.onclick = () => {
      const themes = ['light', 'dark', 'auto'];
      const cur = localStorage.getItem('chocobox_theme') || 'light';
      const next = themes[(themes.indexOf(cur) + 1) % themes.length];
      localStorage.setItem('chocobox_theme', next);
      applyTheme(next);
      showToast(`المظهر: ${{ light: 'فاتح ☀️', dark: 'داكن 🌙', auto: 'تلقائي 🌓' }[next]}`, 'success');
      if (products.length > 0) renderProducts(products);
    };
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (localStorage.getItem('chocobox_theme') === 'auto') applyTheme('auto');
    });
  }
  function applyTheme(t) {
    const icon = document.getElementById('theme-icon');
    if (t === 'auto') {
      const d = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', d ? 'dark' : 'light');
      if (icon) icon.textContent = '🌓';
    } else {
      document.documentElement.setAttribute('data-theme', t);
      if (icon) icon.textContent = t === 'dark' ? '🌙' : '☀️';
    }
  }
  function isDarkMode() { return document.documentElement.getAttribute('data-theme') === 'dark'; }

  // ═══════════════════════════════════════════
  // Intro Animation
  // ═══════════════════════════════════════════
  let introExited = false;
  const PRODS_EMOJI = ['🍫','🍰','🍩','🍪','🧁','🎂','🍭','🍮','🍦','🍧','🍨','🍡','🍬','🍯'];
  const RING_COLS = ['#e8779a','#e8853a','#f5c842','#c97b3f','#fdf3e7'];
  const PCOLS = ['#e8779a','#e8853a','#c97b3f','#f5c842','#fdf3e7'];
  let introFloats = [];
  let introCtx, introCvs;

  function initIntro() {
    // Check if user wants to skip intro (unless "always show" is enabled)
    const alwaysIntro = localStorage.getItem('chocobox_always_intro') === 'true';
    if (!alwaysIntro && sessionStorage.getItem('choco_intro_done')) {
      document.getElementById('intro-overlay')?.remove();
      document.getElementById('choco-float')?.classList.add('visible');
      return;
    }

    // Canvas particles
    introCvs = document.getElementById('intro-canvas');
    if (introCvs) {
      introCtx = introCvs.getContext('2d');
      function rsz() { introCvs.width = innerWidth; introCvs.height = innerHeight; }
      rsz(); window.addEventListener('resize', rsz);
      const ptcls = [];
      function mkP() {
        return { x: Math.random() * innerWidth, y: -20, vy: 1.3 + Math.random() * 3, vx: Math.random() - .5,
          size: 3 + Math.random() * 6, color: PCOLS[Math.random() * PCOLS.length | 0],
          opacity: .5 + Math.random() * .45, circle: Math.random() > .5,
          rot: Math.random() * Math.PI * 2, rs: (Math.random() - .5) * .05 };
      }
      for (let i = 0; i < 65; i++) { const p = mkP(); p.y = Math.random() * innerHeight; ptcls.push(p); }
      function tick() {
        if (!introCtx || introExited) return;
        introCtx.clearRect(0, 0, introCvs.width, introCvs.height);
        for (let i = 0; i < ptcls.length; i++) {
          const p = ptcls[i]; p.y += p.vy; p.x += p.vx; p.rot += p.rs; p.opacity -= .0022;
          if (p.y > introCvs.height + 30 || p.opacity <= 0) { ptcls[i] = mkP(); continue; }
          introCtx.save(); introCtx.globalAlpha = p.opacity; introCtx.fillStyle = p.color;
          introCtx.translate(p.x, p.y); introCtx.rotate(p.rot);
          if (p.circle) { introCtx.beginPath(); introCtx.arc(0, 0, p.size / 2, 0, Math.PI * 2); introCtx.fill(); }
          else { introCtx.fillRect(-p.size / 2, -p.size * .28, p.size, p.size * .56); }
          introCtx.restore();
        }
        requestAnimationFrame(tick);
      }
      tick();
    }

    // Enter button
    document.getElementById('enter-btn').onclick = startIntro;
    document.getElementById('intro-skip').onclick = exitIntro;
  }

  function startIntro() {
    const es = document.getElementById('enter-screen');
    const vid = document.getElementById('intro-vid');
    if (vid) { vid.volume = 1; vid.currentTime = 0; vid.play().then(() => { vid.pause(); vid.currentTime = 0; }).catch(() => {}); }
    es.classList.add('hide');
    setTimeout(() => { es.style.display = 'none'; runIntroSequence(); }, 800);

    // Play configured sound effects
    playSoundEffects();
  }

  function playSoundEffects() {
    try {
      const sounds = JSON.parse(localStorage.getItem('chocobox_sounds') || '[]');
      sounds.forEach(s => {
        if (s.url && s.delay >= 0) {
          setTimeout(() => {
            const a = new Audio(s.url);
            a.volume = s.volume || 1;
            a.play().catch(() => {});
          }, s.delay);
        }
      });
    } catch (e) {}
  }

  async function runIntroSequence() {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    buildIntroLogo();
    document.getElementById('intro-skip')?.classList.add('show');

    await sleep(250); blastRings();
    await sleep(440); safeShow('intro-logo-wrap');
    await sleep(80); animIntroLogo();
    await sleep(300); safeShow('intro-logo-sub', { transform: 'translateY(0)' });
    await sleep(540); blastRings();
    safeShow('choco-wrap', { transform: 'scale(1)' });
    await sleep(440); safeShow('choco-name');
    await sleep(580); safeShow('intro-text-box', { transform: 'translateY(0)' });
    await sleep(320);

    const vid = document.getElementById('intro-vid');
    if (vid) { vid.currentTime = 0; vid.play().catch(() => {}); }
    runIntoSentences();
  }

  function safeShow(id, extra) {
    const el = document.getElementById(id); if (!el) return;
    if (extra) Object.assign(el.style, extra);
    el.style.opacity = '1';
  }

  function buildIntroLogo() {
    const el = document.getElementById('intro-logo-letters'); if (!el) return; el.innerHTML = '';
    'Choco Box'.split('').forEach(ch => {
      const s = document.createElement('span'); s.className = 'intro-lc';
      s.textContent = ch === ' ' ? '\u00A0' : ch; el.appendChild(s);
    });
  }

  function animIntroLogo() {
    document.querySelectorAll('.intro-lc').forEach((ch, i) => {
      setTimeout(() => { ch.style.transition = 'all .5s cubic-bezier(.34,1.56,.64,1)'; ch.style.opacity = '1'; ch.style.transform = 'translateY(0) rotate(0) scale(1)'; }, i * 75);
    });
  }

  function blastRings() {
    const rc = document.getElementById('intro-rings'); if (!rc) return; rc.innerHTML = '';
    const svg = document.getElementById('choco-svg');
    let cx = innerWidth / 2, cy = innerHeight / 2;
    if (svg) { const r = svg.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; }
    RING_COLS.forEach((col, i) => {
      const sz = 80 + i * 95, ring = document.createElement('div');
      ring.className = 'intro-ring';
      ring.style.cssText = `width:${sz}px;height:${sz}px;border-color:${col};left:${cx}px;top:${cy}px;animation-delay:${i * .065}s;animation-duration:${.78 + i * .1}s`;
      rc.appendChild(ring);
    });
  }

  let spawnTimeouts = [];
  function spawnIntroProducts() {
    const pb = document.getElementById('intro-products'); if (!pb) return;
    const W = innerWidth, H = innerHeight;
    for (let j = 0; j < 15; j++) {
      let t = setTimeout(() => {
        if (introExited) return;
        const el = document.createElement('div'); el.className = 'intro-pf';
        el.textContent = PRODS_EMOJI[Math.random() * PRODS_EMOJI.length | 0];
        const x = 10 + Math.random() * (W - 60);
        const y = H * .15 + Math.random() * H * .75;
        const dur = 5 + Math.random() * 4;
        el.style.cssText = `left:${x}px;top:${y}px;font-size:${26 + Math.random() * 30}px;animation-duration:${dur}s`;
        pb.appendChild(el); introFloats.push(el);
        setTimeout(() => { if (el.parentNode) el.remove(); }, dur * 1000 + 200);
      }, j * 200);
      spawnTimeouts.push(t);
    }
  }

  function clearIntroProducts() {
    spawnTimeouts.forEach(t => clearTimeout(t));
    spawnTimeouts = [];
    introFloats.forEach(el => { 
      el.style.transition = 'opacity 1s ease'; 
      el.style.opacity = '0'; 
      setTimeout(() => el.remove(), 1000); 
    });
    introFloats = [];
  }

  // Typewriter
  const twEl = () => document.getElementById('tw');
  const twCur = () => document.getElementById('twc');
  let twTimer = null;
  function twClear() { if (twTimer) { clearInterval(twTimer); clearTimeout(twTimer); twTimer = null; } }
  function twType(text, cb) {
    twClear();
    const el = twEl(), cur = twCur(); if (!el || !cur) return;
    while (el.firstChild && el.firstChild !== cur) el.removeChild(el.firstChild);
    if (!cur.parentNode) el.appendChild(cur);
    let i = 0; const spd = Math.min(55, Math.max(28, Math.floor(1800 / (text.length || 1))));
    twTimer = setInterval(() => {
      if (i < text.length) { el.insertBefore(document.createTextNode(text[i]), cur); i++; }
      else { twClear(); if (cb) cb(); }
    }, spd);
  }
  function twErase(cb) {
    twClear();
    const el = twEl(), cur = twCur();
    if (!el) return;
    el.style.transition = 'opacity .5s ease';
    el.style.opacity = '0';
    setTimeout(() => {
      while (el.firstChild && el.firstChild !== cur) el.removeChild(el.firstChild);
      el.style.transition = 'none';
      el.style.opacity = '1';
      if (cb) cb();
    }, 550);
  }

  const SENTS = [
    { text: 'أهلاً بيكم في شوكو بوكس 🍫', start: 0, end: 2000 },
    { text: 'أنا شوكو مساعدك الذكي في الطلب ✨', start: 2000, end: 5000 },
    { text: 'يمكنكم الآن الطلب ما تشاءون من الحلويات بسعر مناسب 🍬', start: 5000, end: 10000, prods: true },
    { text: 'لا أريد الإطالة عليكم — تفضلوا في الطلب! 🛍️', start: 10000, end: 14000 }
  ];

  function runIntoSentences() {
    let prodOn = false;
    function next(idx) {
      if (introExited) return;
      if (idx >= SENTS.length) { twErase(() => exitIntro()); return; }
      const s = SENTS[idx];
      if (s.prods && !prodOn) { prodOn = true; spawnIntroProducts(); }
      else if (!s.prods && prodOn) { prodOn = false; clearIntroProducts(); }
      const dur = s.end - s.start;
      const typeTime = Math.min(55, Math.max(28, Math.floor(1800 / (s.text.length || 1)))) * s.text.length;
      const eraseTime = s.text.length * 22 + 200;
      const hold = Math.max(200, dur - typeTime - eraseTime - 150);
      twType(s.text, () => {
        if (idx < SENTS.length - 1) setTimeout(() => twErase(() => next(idx + 1)), hold);
        else setTimeout(() => twErase(() => exitIntro()), hold);
      });
    }
    next(0);
  }

  function exitIntro() {
    if (introExited) return; introExited = true;
    const vid = document.getElementById('intro-vid'); if (vid) vid.pause();
    clearIntroProducts();
    sessionStorage.setItem('choco_intro_done', '1');

    const overlay = document.getElementById('intro-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      setTimeout(() => {
        overlay.classList.add('removed');
        document.getElementById('choco-float')?.classList.add('visible');
      }, 1000);
    }
  }

  // ═══════════════════════════════════════════
  // Load Products (Google Sheets ONLY)
  // ═══════════════════════════════════════════
  async function loadProducts() {
    const loading = document.getElementById('products-loading');
    const grid = document.getElementById('products-grid');

    if (!CFG.apiUrl) {
      if (loading) loading.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚙️</div><p class="empty-state-text">يرجى إعداد الاتصال بقوقل شيت من لوحة التحكم</p></div>';
      return;
    }

    try {
      const res = await fetch(CFG.apiUrl + '?action=getProducts');
      const data = await res.json();
      if (data.status === 'success' && data.products && data.products.length > 0) {
        products = data.products;
      } else {
        throw new Error(data.message || 'لا توجد منتجات');
      }
    } catch (err) {
      console.warn('Products load error:', err);
      if (loading) loading.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚠️</div><p class="empty-state-text">فشل تحميل المنتجات. تحقق من الاتصال.</p></div>';
      return;
    }

    if (loading) loading.remove();
    renderProducts(products);
    initFuseSearch();
    if (window.initGallery) window.initGallery(products);
  }

  function renderProducts(list) {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    if (list.length === 0) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">🔍</div><p class="empty-state-text">لا توجد منتجات مطابقة</p></div>';
      return;
    }
    const dark = isDarkMode();
    grid.innerHTML = list.map((p, i) => {
      const isAsk = !p.priceNum || p.priceNum === 0 || p.price === 'اسأل عن السعر';
      const img = dark && p.imageDark ? p.imageDark : (p.imageLight || p.image);
      const src = encodeImagePath(img);
      return `<div class="product-card" style="animation-delay:${i * .06}s" data-product-id="${p.id}">
        <div class="product-image-wrapper" onclick="window.chocoApp.openLightbox(${i})">
          <img class="product-image" src="${src}" alt="${p.name}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22><rect fill=%22%23fef4f6%22 width=%22400%22 height=%22300%22/><text x=%22200%22 y=%22160%22 fill=%22%23ff69b4%22 text-anchor=%22middle%22 font-size=%2248%22>🍫</text></svg>'">
        </div>
        ${p.category ? `<span class="product-badge">${p.category}</span>` : ''}
        <div class="product-info">
          <h3 class="product-name">${p.name}</h3>
          <div class="product-price ${isAsk ? 'ask-price' : ''}">${isAsk ? 'اسأل عن السعر 💬' : p.price}</div>
          <div class="product-actions">
            <button class="btn-order" onclick="window.chocoApp.startOrderFlow(${i})">أضف للسلة 🛒</button>
          </div>
        </div></div>`;
    }).join('');
  }

  function encodeImagePath(path) {
    if (!path) return '';
    if (path.includes('drive.google.com')) { const m = path.match(/[-\w]{25,}/); if (m) return `https://lh3.googleusercontent.com/d/${m[0]}`; }
    return path.split('/').map((s, i) => { if (path.startsWith('http') && i < 3) return s; return /[^\x00-\x7F]/.test(s) ? encodeURIComponent(s) : s; }).join('/');
  }

  // ═══════════════════════════════════════════
  // Search
  // ═══════════════════════════════════════════
  function initFuseSearch() {
    if (typeof Fuse === 'undefined') return;
    fuseInstance = new Fuse(products, { keys: [{ name: 'name', weight: .7 }, { name: 'category', weight: .2 }, { name: 'description', weight: .1 }], threshold: .4, distance: 100, minMatchCharLength: 1 });
  }
  function initSearch() {
    const input = document.getElementById('search-input'), dd = document.getElementById('search-dropdown');
    if (!input) return; let t;
    input.oninput = function () {
      clearTimeout(t); const q = this.value.trim();
      t = setTimeout(() => {
        if (!q) { dd.classList.remove('active'); renderProducts(products); return; }
        let res = fuseInstance ? fuseInstance.search(q).map(r => r.item) : products.filter(p => p.name.includes(q));
        if (res.length) {
          dd.innerHTML = res.map(p => `<div class="search-result-item" onclick="window.chocoApp.scrollToProduct(${p.id})"><img src="${encodeImagePath(p.imageLight || p.image)}" alt="" onerror="this.style.display='none'"><div><div class="search-result-name">${p.name}</div><div class="search-result-price">${p.price}</div></div></div>`).join('');
          dd.classList.add('active');
        } else { dd.innerHTML = '<div class="search-no-results">لا توجد نتائج 😔</div>'; dd.classList.add('active'); }
        renderProducts(res);
      }, 200);
    };
    document.addEventListener('click', e => { if (!e.target.closest('.search-container')) dd.classList.remove('active'); });
    input.onkeydown = e => { if (e.key === 'Escape') { dd.classList.remove('active'); input.value = ''; renderProducts(products); } };
  }
  function scrollToProduct(id) {
    document.getElementById('search-dropdown')?.classList.remove('active');
    const card = document.querySelector(`[data-product-id="${id}"]`);
    if (card) { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); card.style.animation = 'pulse .5s ease 2'; }
  }

  // ═══════════════════════════════════════════
  // Cart
  // ═══════════════════════════════════════════
  function loadCartFromStorage() { try { cart = JSON.parse(localStorage.getItem('chocobox_cart') || '[]'); } catch (e) { cart = []; } }
  function saveCart() { localStorage.setItem('chocobox_cart', JSON.stringify(cart)); }
  function updateCartCount() { const el = document.getElementById('cart-count'); if (el) el.textContent = cart.reduce((s, i) => s + i.quantity, 0); }
  function addToCart(product, qty) {
    const ex = cart.find(i => i.id === product.id);
    if (ex) ex.quantity += qty;
    else cart.push({ id: product.id, name: product.name, price: product.price, priceNum: product.priceNum || 0, image: product.imageLight || product.image, quantity: qty });
    updateCartCount(); saveCart(); renderCart();
  }
  function removeFromCart(id) { cart = cart.filter(i => i.id !== id); updateCartCount(); saveCart(); renderCart(); }
  function updateCartQty(id, d) {
    const item = cart.find(i => i.id === id);
    if (item) { item.quantity += d; if (item.quantity < 1) removeFromCart(id); else { updateCartCount(); saveCart(); renderCart(); } }
  }
  function renderCart() {
    const c = document.getElementById('cart-items-container'), t = document.getElementById('cart-total-amount');
    if (!c) return;
    if (!cart.length) { c.innerHTML = '<div class="empty-state"><div class="empty-state-icon" style="font-size:3.5rem">🛒</div><p class="empty-state-text">السلة فارغة حالياً</p></div>'; if (t) t.textContent = '0.00 دينار'; return; }
    let total = 0;
    c.innerHTML = cart.map(i => {
      const line = (i.priceNum || 0) * i.quantity; if (!isNaN(line)) total += line;
      return `<div class="cart-item"><img class="cart-item-img" src="${encodeImagePath(i.image)}" alt="${i.name}"><div class="cart-item-info"><div class="cart-item-name">${i.name}</div><div class="cart-item-price">${i.price}</div><div class="cart-item-controls"><button class="qty-btn" onclick="window.chocoApp.updateCartQty(${i.id},-1)">−</button><span class="qty-val">${i.quantity}</span><button class="qty-btn" onclick="window.chocoApp.updateCartQty(${i.id},1)">+</button></div><button class="cart-item-remove" onclick="window.chocoApp.removeFromCart(${i.id})">إزالة 🗑️</button></div></div>`;
    }).join('');
    if (t) t.textContent = total > 0 ? `${total.toFixed(2)} دينار` : 'سيتم احتساب السعر';
  }
  function initCartUI() {
    document.getElementById('cart-toggle-btn')?.addEventListener('click', openCart);
    document.getElementById('cart-close-btn')?.addEventListener('click', closeCart);
    document.getElementById('cart-overlay')?.addEventListener('click', closeCart);
    document.getElementById('checkout-btn')?.addEventListener('click', handleCheckout);
  }
  function openCart() { renderCart(); document.getElementById('cart-drawer')?.classList.add('active'); document.getElementById('cart-overlay')?.classList.add('active'); document.body.style.overflow = 'hidden'; }
  function closeCart() { document.getElementById('cart-drawer')?.classList.remove('active'); document.getElementById('cart-overlay')?.classList.remove('active'); document.body.style.overflow = ''; }

  // ═══════════════════════════════════════════
  // Order Flow & Qty
  // ═══════════════════════════════════════════
  function startOrderFlow(idx) {
    const p = products[idx]; if (!p) return;
    currentlySelectingProduct = p; currentSelectionQty = 1;
    document.getElementById('qty-product-name').textContent = p.name;
    document.getElementById('qty-count-display').textContent = '1';
    document.getElementById('qty-modal').classList.add('active');
  }
  function initQtyModal() {
    const m = document.getElementById('qty-modal'), d = document.getElementById('qty-count-display');
    if (!m) return;
    document.getElementById('qty-minus').onclick = () => { if (currentSelectionQty > 1) { currentSelectionQty--; d.textContent = currentSelectionQty; } };
    document.getElementById('qty-plus').onclick = () => { currentSelectionQty++; d.textContent = currentSelectionQty; };
    document.getElementById('qty-cancel-btn').onclick = () => m.classList.remove('active');
    document.getElementById('qty-confirm-btn').onclick = () => { addToCart(currentlySelectingProduct, currentSelectionQty); m.classList.remove('active'); showToast('تم الإضافة للسلة ✨', 'success'); openCart(); };
  }

  // ═══════════════════════════════════════════
  // Checkout
  // ═══════════════════════════════════════════
  function initCheckoutModal() {
    document.getElementById('checkout-modal-close')?.addEventListener('click', () => document.getElementById('checkout-modal-overlay').classList.remove('active'));
    document.getElementById('get-checkout-location')?.addEventListener('click', function () { getGeo(document.getElementById('checkout-location'), this); });
    document.getElementById('checkout-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await finalizeOrder(document.getElementById('checkout-name').value, document.getElementById('checkout-phone').value, document.getElementById('checkout-location').value);
    });
  }
  function handleCheckout() { if (!cart.length) { showToast('السلة فارغة!', 'error'); return; } document.getElementById('checkout-modal-overlay')?.classList.add('active'); }

  async function finalizeOrder(name, phone, location) {
    const btn = document.getElementById('confirm-checkout-btn'), orig = btn?.innerHTML;
    const details = cart.map(i => `${i.name} (${i.quantity})`).join(', ');
    const total = cart.reduce((s, i) => s + ((i.priceNum || 0) * i.quantity), 0);
    const order = { action: 'addOrder', customerName: name, customerPhone: phone, location, productName: `سلة: ${details}`, details: `إجمالي: ${total} دينار`, status: 'جديد', date: new Date().toLocaleString('ar-JO') };
    try {
      if (btn) { btn.innerHTML = 'جاري التأكيد...'; btn.disabled = true; }
      if (CFG.apiUrl) {
        const res = await fetch(CFG.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(order) });
        const data = await res.json();
        if (data.status === 'success') { showToast('تم تأكيد طلبك بنجاح! 🎉', 'success'); cart = []; saveCart(); updateCartCount(); document.getElementById('checkout-modal-overlay')?.classList.remove('active'); closeCart(); return; }
      }
      // WhatsApp fallback
      const items = cart.map(i => `- ${i.name} (x${i.quantity})`).join('%0A');
      window.open(`https://wa.me/${CFG.whatsapp}?text=طلب جديد:%0Aالاسم: ${name}%0Aالموقع: ${location}%0A${items}%0A*الإجمالي: ${total.toFixed(2)} دينار*`, '_blank');
      cart = []; saveCart(); updateCartCount(); document.getElementById('checkout-modal-overlay')?.classList.remove('active'); closeCart();
    } catch (err) { showToast('حدث خطأ. سيتم التحويل للواتساب...', 'info'); }
    finally { if (btn) { btn.innerHTML = orig; btn.disabled = false; } }
  }

  // ═══════════════════════════════════════════
  // Geolocation
  // ═══════════════════════════════════════════
  function getGeo(input, btn) {
    if (!navigator.geolocation) { showToast('المتصفح لا يدعم تحديد الموقع', 'error'); return; }
    const orig = btn.innerHTML; btn.innerHTML = '📍...'; btn.disabled = true;
    navigator.geolocation.getCurrentPosition(
      pos => { input.value = `${pos.coords.latitude}, ${pos.coords.longitude}`; showToast('تم تحديد الموقع! 📍', 'success'); btn.innerHTML = orig; btn.disabled = false; },
      () => { showToast('فشل تحديد الموقع', 'info'); btn.innerHTML = orig; btn.disabled = false; }
    );
  }

  // ═══════════════════════════════════════════
  // Custom Order Modal
  // ═══════════════════════════════════════════
  function initCustomOrderModal() {
    const overlay = document.getElementById('custom-modal-overlay');
    document.querySelectorAll('#custom-order-trigger, #custom-order-trigger-info').forEach(t => { t.onclick = () => overlay?.classList.add('active'); });
    document.getElementById('custom-modal-close')?.addEventListener('click', () => overlay?.classList.remove('active'));
    overlay?.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('active'); });
  }
  function initContactForm() {
    const form = document.getElementById('contact-form');
    document.getElementById('get-custom-location')?.addEventListener('click', function () { getGeo(document.getElementById('custom-location'), this); });
    if (!form) return;
    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]'), orig = btn?.innerHTML;
      const order = { action: 'addOrder', customerName: document.getElementById('name').value, customerPhone: document.getElementById('phone').value, location: document.getElementById('custom-location')?.value || '', productName: 'طلب مخصص ✨', details: document.getElementById('details').value, status: 'جديد', date: new Date().toLocaleString('ar-JO') };
      try {
        if (btn) { btn.innerHTML = 'جاري الإرسال...'; btn.disabled = true; }
        if (CFG.apiUrl) {
          const res = await fetch(CFG.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(order) });
          const data = await res.json();
          if (data.status === 'success') { showToast('تم إرسال طلبك بنجاح! 🎉', 'success'); form.reset(); document.getElementById('custom-modal-overlay')?.classList.remove('active'); return; }
        }
        window.open(`https://wa.me/${CFG.whatsapp}?text=*طلب مخصص*%0A*الاسم:* ${order.customerName}%0A*الهاتف:* ${order.customerPhone}%0A*التفاصيل:* ${order.details}`, '_blank');
        form.reset(); document.getElementById('custom-modal-overlay')?.classList.remove('active');
      } catch (err) { showToast('حدث خطأ', 'error'); }
      finally { if (btn) { btn.innerHTML = orig; btn.disabled = false; } }
    };
  }

  // ═══════════════════════════════════════════
  // Track Order Modal
  // ═══════════════════════════════════════════
  function initTrackOrderModal() {
    const overlay = document.getElementById('track-modal-overlay');
    document.getElementById('track-order-trigger')?.addEventListener('click', () => overlay?.classList.add('active'));
    document.getElementById('track-modal-close')?.addEventListener('click', () => overlay?.classList.remove('active'));
    overlay?.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('active'); });

    const form = document.getElementById('track-form');
    if (!form) return;
    form.onsubmit = async (e) => {
      e.preventDefault();
      const phone = document.getElementById('track-phone').value.trim();
      const btn = document.getElementById('track-submit-btn');
      const resultsDiv = document.getElementById('track-results');
      const origBtn = btn.innerHTML;

      if (!CFG.apiUrl) { showToast('خدمة التتبع غير متاحة حالياً', 'error'); return; }

      try {
        btn.innerHTML = 'جاري البحث...'; btn.disabled = true;
        const res = await fetch(`${CFG.apiUrl}?action=trackOrders&phone=${encodeURIComponent(phone)}`);
        const data = await res.json();
        
        resultsDiv.style.display = 'block';
        if (data.status === 'success' && data.orders && data.orders.length > 0) {
          resultsDiv.innerHTML = data.orders.map(o => `
            <div style="background:var(--bg-main);padding:12px;border-radius:var(--radius-sm);margin-bottom:10px;border-right:3px solid var(--primary)">
              <div style="font-weight:700;margin-bottom:4px">الطلب #${o.id} <span style="float:left;font-size:0.8rem;background:var(--primary-light);color:var(--bg-dark);padding:2px 8px;border-radius:12px">${o.status}</span></div>
              <div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:4px">${o.productName}</div>
              <div style="font-size:0.75rem;color:var(--text-light)">${new Date(o.date).toLocaleString('ar-JO')}</div>
            </div>
          `).join('');
        } else {
          resultsDiv.innerHTML = '<div class="empty-state"><p class="empty-state-text">لا توجد طلبات مسجلة بهذا الرقم</p></div>';
        }
      } catch (err) {
        showToast('حدث خطأ أثناء البحث', 'error');
      } finally {
        btn.innerHTML = origBtn; btn.disabled = false;
      }
    };
  }

  // ═══════════════════════════════════════════
  // AI Chat (Gemini / OpenAI Fallback + Sheets Save)
  // ═══════════════════════════════════════════
  let chatHistory = [];
  const chatSessionId = 'session_' + Math.random().toString(36).substring(2, 9);
  
  function initChocoChat() {
    const floatBtn = document.getElementById('choco-float');
    const chatWin = document.getElementById('chat-window');
    const closeBtn = document.getElementById('chat-close');
    const sendBtn = document.getElementById('chat-send');
    const input = document.getElementById('chat-input');

    floatBtn?.addEventListener('click', () => chatWin?.classList.toggle('active'));
    closeBtn?.addEventListener('click', () => chatWin?.classList.remove('active'));
    sendBtn?.addEventListener('click', sendChatMessage);
    input?.addEventListener('keydown', e => { if (e.key === 'Enter') sendChatMessage(); });
  }

  async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const body = document.getElementById('chat-body');
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';

    // Add user message
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-msg user';
    userBubble.textContent = msg;
    body.appendChild(userBubble);

    // Typing indicator
    const typing = document.createElement('div');
    typing.className = 'chat-msg typing';
    typing.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    body.appendChild(typing);
    body.scrollTop = body.scrollHeight;

    chatHistory.push({ role: 'user', parts: [{ text: msg }] });
    saveChatToSheets('User', msg);

    let reply;
    if (CFG.geminiKey) {
      try {
        const productList = products.map((p, index) => `[ID:${index}] ${p.name}: ${p.price} (${p.category || 'عام'})`).join('\n');
        const systemPrompt = `أنت شوكو، مساعد ذكي لمتجر Choco Box للشوكولاتة والحلويات في الرمثا، الأردن. أجب بالعربية بشكل ودود ومختصر. هذه المنتجات المتاحة:\n${productList}\n\nساعد العملاء في اختيار المنتجات، اقترح عليهم حسب المناسبة أو الوصف. إذا سألوا عن شيء خارج نطاقك قل لهم تواصلوا عبر الواتساب. أمر هام: إذا اقترحت منتجاً معيناً، يجب عليك إضافة الكود [PRODUCT:ID] في نهاية رسالتك حيث ID هو رقم المنتج. يمكنك اقتراح منتجات متعددة. مثال: [PRODUCT:2]`;

        // Support OpenAI API fallback if key starts with sk-
        if (CFG.geminiKey.startsWith('sk-')) {
          const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${CFG.geminiKey}` },
            body: JSON.stringify({
              model: CFG.geminiModel || 'gpt-4o-mini',
              messages: [
                { role: 'system', content: systemPrompt },
                ...chatHistory.map(h => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.parts[0].text }))
              ]
            })
          });
          const data = await res.json();
          reply = data?.choices?.[0]?.message?.content || 'عذراً، لم أستطع الرد.';
        } else {
          // Gemini API
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${CFG.geminiModel}:generateContent?key=${CFG.geminiKey}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents: chatHistory
            })
          });
          const data = await res.json();
          reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'عذراً، لم أستطع الرد.';
        }
        
        chatHistory.push({ role: 'model', parts: [{ text: reply }] });
        saveChatToSheets('Choco AI', reply);
      } catch (err) {
        reply = 'عذراً، حدث خطأ في الاتصال. تأكد من مفتاح API أو حاول لاحقاً 😔';
      }
    } else {
      reply = 'مرحباً! للأسف لم يتم تفعيل الذكاء الاصطناعي بعد. يمكنك تصفح المنتجات أو التواصل عبر الواتساب 💬';
    }

    typing.remove();

    let botText = reply;
    let recommendedProducts = [];
    
    // Extract [PRODUCT:ID] tags
    const regex = /\[PRODUCT:(\d+)\]/gi;
    let match;
    while ((match = regex.exec(botText)) !== null) {
      recommendedProducts.push(parseInt(match[1]));
    }
    
    // Clean text
    botText = botText.replace(/\[PRODUCT:\d+\]/gi, '').trim();

    if (botText) {
      const botBubble = document.createElement('div');
      botBubble.className = 'chat-msg bot';
      botBubble.textContent = botText;
      body.appendChild(botBubble);
    }

    // Render Product Cards
    recommendedProducts.forEach(id => {
      const p = products[id];
      if (p) {
        const isDark = document.body.dataset.theme === 'dark';
        const img = (isDark && p.imageDark) ? p.imageDark : (p.imageLight || p.image);
        const imgSrc = encodeImagePath(img);
        const card = document.createElement('div');
        card.className = 'chat-product-card';
        card.innerHTML = `
          <img src="${imgSrc}" alt="${p.name}" class="cpc-img" onclick="window.chocoApp.openLightbox(${id})">
          <div class="cpc-info">
            <div class="cpc-name">${p.name}</div>
            <div class="cpc-price">${p.price}</div>
            <button class="cpc-btn" onclick="window.chocoApp.startOrderFlow(${id})">اشترِ الآن</button>
          </div>
        `;
        body.appendChild(card);
      }
    });

    body.scrollTop = body.scrollHeight;
  }

  function saveChatToSheets(sender, message) {
    if (!CFG.apiUrl) return;
    fetch(CFG.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'saveChat', sessionId: chatSessionId, sender, message })
    }).catch(() => {});
  }

  // ═══════════════════════════════════════════
  // Toast & Helpers
  // ═══════════════════════════════════════════
  function showToast(message, type = 'info') {
    const c = document.getElementById('toast-container'); if (!c) return;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const t = document.createElement('div'); t.className = `toast ${type}`;
    t.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(100px)'; t.style.transition = 'all .3s'; setTimeout(() => t.remove(), 300); }, 4000);
  }
  function initScrollAnimations() {
    const obs = new IntersectionObserver(ents => { ents.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }); }, { threshold: .1 });
    document.querySelectorAll('.animate-on-scroll').forEach(el => obs.observe(el));
  }
  function initHeaderScroll() {
    const h = document.querySelector('.header');
    if (h) window.addEventListener('scroll', () => h.classList.toggle('scrolled', pageYOffset > 50));
  }

  function initMobileMenu() {
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const closeBtn = document.getElementById('mobile-menu-close');
    const drawer = document.getElementById('mobile-menu-drawer');
    const overlay = document.getElementById('mobile-menu-overlay');

    function openMenu() {
      drawer?.classList.add('active');
      overlay?.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
    function closeMenu() {
      drawer?.classList.remove('active');
      overlay?.classList.remove('active');
      document.body.style.overflow = '';
    }

    toggleBtn?.addEventListener('click', openMenu);
    closeBtn?.addEventListener('click', closeMenu);
    overlay?.addEventListener('click', closeMenu);

    // Close menu when clicking a navigation inner link
    drawer?.querySelectorAll('.header-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        // Only close if it's not a toggle that keeps you on the same view
        if (btn.id !== 'theme-toggle-btn') closeMenu();
      });
    });
  }

  function initMobileSearch() {
    const search = document.querySelector('.search-container');
    const hero = document.querySelector('.hero');
    const header = document.querySelector('.header');
    
    function moveSearch() {
      if (innerWidth <= 768) {
        if (search.parentNode !== hero && hero) {
          // Wrap it nicely for mobile
          const wrapper = document.createElement('div');
          wrapper.className = 'search-container-mobile-wrapper';
          wrapper.appendChild(search);
          hero.insertBefore(wrapper, hero.firstChild);
        }
      } else {
        if (search.parentNode !== header && header) {
          // move back to header next to brand
          const brand = header.querySelector('.header-brand');
          if (brand) header.insertBefore(search, brand.nextSibling);
          const wrapper = document.querySelector('.search-container-mobile-wrapper');
          if (wrapper) wrapper.remove();
        }
      }
    }
    
    window.addEventListener('resize', moveSearch);
    moveSearch();
  }

  // ═══════════════════════════════════════════
  // Public API
  // ═══════════════════════════════════════════
  window.chocoApp = {
    scrollToProduct, openLightbox: null, products: () => products, config: CFG, showToast,
    startOrderFlow, updateCartQty, removeFromCart
  };

})();
