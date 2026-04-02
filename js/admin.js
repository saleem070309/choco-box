/* ============================================
   Choco Box — Admin Panel
   ============================================ */
(function () {
  'use strict';

  const STORAGE_KEY = 'chocobox_settings';
  let config = { apiUrl: '', whatsappNumber: '', facebookUrl: '', password: 'choco2026', geminiKey: '', geminiModel: 'gemini-2.0-flash' };
  let products = [];
  let orders = [];
  let currentOrderFilter = 'all';

  // ─── Init ──
  document.addEventListener('DOMContentLoaded', () => {
    mergeConfig();
    initTheme();
    initLogin();
    initTabs();
    initAddProduct();
    initSettings();
    initChocoSettings();
    initLogout();
  });

  // ─── Config ──
  function mergeConfig() {
    // Load from config.js globals first
    const g = window.CHOCO_CONFIG || {};
    if (g.API_URL) config.apiUrl = g.API_URL;
    if (g.WHATSAPP) config.whatsappNumber = g.WHATSAPP;
    if (g.FACEBOOK) config.facebookUrl = g.FACEBOOK;
    if (g.ADMIN_PASSWORD) config.password = g.ADMIN_PASSWORD;
    if (g.GEMINI_API_KEY) config.geminiKey = g.GEMINI_API_KEY;
    if (g.GEMINI_MODEL) config.geminiModel = g.GEMINI_MODEL;

    // Override with localStorage
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      Object.keys(saved).forEach(k => { if (saved[k]) config[k] = saved[k]; });
    } catch (e) {}
  }
  function saveConfig() { 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); 
    saveRemoteSettings({
      apiUrl: config.apiUrl,
      whatsappNumber: config.whatsappNumber,
      facebookUrl: config.facebookUrl,
      geminiKey: config.geminiKey,
      geminiModel: config.geminiModel,
      adminPassword: config.password,
      introSounds: JSON.stringify(sounds),
      alwaysShowIntro: document.getElementById('setting-always-intro').checked ? 'true' : 'false',
      enableIntroGlobal: document.getElementById('setting-enable-intro').checked ? 'true' : 'false'
    });
  }

  async function saveRemoteSettings(settingsObj) {
    if (!config.apiUrl) return;
    try {
      await fetch(config.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'saveSettings', settings: settingsObj })
      });
    } catch (e) { console.error('Failed to save remote settings:', e); }
  }

  // ─── Theme ──
  function initTheme() {
    const btn = document.getElementById('admin-theme-toggle');
    if (!btn) return;
    const saved = localStorage.getItem('chocobox_theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    btn.textContent = saved === 'dark' ? '☀️' : '🌙';
    btn.onclick = () => {
      const cur = document.documentElement.getAttribute('data-theme');
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('chocobox_theme', next);
      btn.textContent = next === 'dark' ? '☀️' : '🌙';
    };
  }

  // ─── Login ──
  function initLogin() {
    const form = document.getElementById('login-form');
    const errorEl = document.getElementById('login-error');
    if (sessionStorage.getItem('chocobox_session') === 'active') { showDashboard(); return; }
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const pw = document.getElementById('login-password').value;
      if (config.apiUrl) {
        try {
          const res = await fetch(config.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ action: 'login', password: pw }) });
          const data = await res.json();
          if (data.status === 'success') { sessionStorage.setItem('chocobox_session', 'active'); showDashboard(); return; }
        } catch (e) {}
      }
      if (pw === config.password) { sessionStorage.setItem('chocobox_session', 'active'); showDashboard(); }
      else { errorEl.style.display = 'block'; setTimeout(() => errorEl.style.display = 'none', 3000); }
    });
  }
  async function showDashboard() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('admin-dashboard').classList.add('active');
    
    // Fetch remote settings to ensure we have the latest
    if (config.apiUrl) {
      try {
        const res = await fetch(config.apiUrl + '?action=getSettings');
        const data = await res.json();
        if (data.status === 'success' && data.settings) {
          Object.assign(config, data.settings);
        }
      } catch (e) { console.warn('Dashboard remote settings fetch failed'); }
    }

    loadProducts();
    loadOrders();
    populateSettings();
    populateChocoSettings();
  }
  function initLogout() {
    document.getElementById('logout-btn').addEventListener('click', () => { sessionStorage.removeItem('chocobox_session'); location.reload(); });
  }

  // ─── Tabs (FIXED: adds -panel suffix) ──
  function initTabs() {
    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const panelId = tab.getAttribute('data-tab') + '-panel';
        const panel = document.getElementById(panelId);
        if (panel) panel.classList.add('active');
      });
    });
  }

  // ─── Products ──
  async function loadProducts() {
    const tbody = document.getElementById('products-table-body');
    if (!config.apiUrl) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">⚙️ يرجى إعداد رابط Google Sheets أولاً</td></tr>';
      return;
    }
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px"><div class="spinner" style="margin:0 auto"></div><p class="loading-text" style="margin-top:12px">جاري التحميل...</p></td></tr>';
    try {
      const res = await fetch(config.apiUrl + '?action=getProducts');
      const data = await res.json();
      if (data.status === 'success' && data.products) {
        products = data.products;
        renderProductsTable();
        updateStats();
        return;
      }
    } catch (e) { console.warn('Products load error:', e); }
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">⚠️ فشل التحميل — تحقق من الاتصال</td></tr>';
    updateStats();
  }

  function renderProductsTable() {
    const tbody = document.getElementById('products-table-body');
    if (!products.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty-state">لا توجد منتجات</td></tr>'; return; }
    tbody.innerHTML = products.map((p, i) => {
      const img = encodeImagePath(p.imageLight || p.image);
      const avail = p.available !== false && p.available !== 'false';
      return `<tr>
        <td>${img ? `<img src="${img}" alt="">` : '🍫'}</td>
        <td><strong>${p.name}</strong></td>
        <td>${p.price || '—'}</td>
        <td>${p.category || '—'}</td>
        <td><span class="status-badge ${avail ? 'confirmed' : 'cancelled'}">${avail ? 'متوفر' : 'غير متوفر'}</span></td>
        <td><div style="display:flex;gap:5px"><button class="btn-edit" onclick="window.adminApp.editProduct(${p.id || i})">✏️</button><button class="btn-delete" onclick="window.adminApp.deleteProduct(${p.id || i})">🗑️</button></div></td></tr>`;
    }).join('');
  }

  // ─── Orders ──
  async function loadOrders() {
    const tbody = document.getElementById('orders-table-body');
    const refreshBtn = document.getElementById('refresh-orders-btn');
    if (!config.apiUrl) { tbody.innerHTML = '<tr><td colspan="8" class="empty-state">⚙️ يرجى إعداد رابط Google Sheets أولاً</td></tr>'; return; }
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px"><div class="spinner" style="margin:0 auto"></div><p class="loading-text" style="margin-top:12px">جاري تحميل الطلبات...</p></td></tr>';
    if (refreshBtn) refreshBtn.style.opacity = '.5';
    try {
      const res = await fetch(config.apiUrl + '?action=getOrders');
      const data = await res.json();
      if (data.status === 'success' && data.orders) { orders = data.orders; renderOrdersTable(); updateStats(); return; }
    } catch (e) { console.warn('Orders load error:', e); }
    finally { if (refreshBtn) refreshBtn.style.opacity = '1'; }
    orders = []; renderOrdersTable(); updateStats();
  }

  function renderOrdersTable() {
    const tbody = document.getElementById('orders-table-body');
    const filtered = orders.filter(o => currentOrderFilter === 'all' || o.status === currentOrderFilter);
    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-state"><div class="empty-state-icon">📦</div><p>${currentOrderFilter === 'all' ? 'لا توجد طلبات حالياً' : 'لا توجد طلبات بهذه الحالة'}</p></td></tr>`;
      return;
    }
    const statusMap = { 'جديد': 'pending', 'مؤكد': 'confirmed', 'مكتمل': 'completed', 'ملغي': 'cancelled' };
    tbody.innerHTML = filtered.map((o, i) => `<tr>
      <td>${o.id || i + 1}</td>
      <td><strong>${o.customerName || '—'}</strong></td>
      <td dir="ltr" style="text-align:right">${o.customerPhone || '—'}</td>
      <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis">${o.productName || '—'}</td>
      <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis">${o.location || o.details || '—'}</td>
      <td><select onchange="window.adminApp.updateOrderStatus(${o.id || i},this.value)" class="form-input" style="padding:4px 8px;font-size:.8rem;min-height:auto">
        <option value="جديد" ${o.status === 'جديد' ? 'selected' : ''}>⏳ جديد</option>
        <option value="مؤكد" ${o.status === 'مؤكد' ? 'selected' : ''}>✅ مؤكد</option>
        <option value="مكتمل" ${o.status === 'مكتمل' ? 'selected' : ''}>🎉 مكتمل</option>
        <option value="ملغي" ${o.status === 'ملغي' ? 'selected' : ''}>❌ ملغي</option>
      </select></td>
      <td style="font-size:.8rem;color:var(--text-light)">${o.date || '—'}</td>
      <td><a href="https://wa.me/${o.customerPhone}" target="_blank" class="btn-edit" style="text-decoration:none;padding:5px 10px">💬</a></td>
    </tr>`).join('');
  }

  // Order filter tabs
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.order-filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.order-filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentOrderFilter = tab.getAttribute('data-filter');
        renderOrdersTable();
      });
    });
    const refreshBtn = document.getElementById('refresh-orders-btn');
    if (refreshBtn) refreshBtn.onclick = () => loadOrders();
  });

  function updateStats() {
    const ps = document.getElementById('stat-products'), os = document.getElementById('stat-orders'), pe = document.getElementById('stat-pending');
    if (ps) ps.textContent = products.length;
    if (os) os.textContent = orders.length;
    if (pe) pe.textContent = orders.filter(o => o.status === 'جديد' || !o.status).length;
  }

  // ─── Add/Edit Product ──
  function initAddProduct() {
    document.getElementById('add-product-btn').addEventListener('click', () => {
      document.getElementById('product-modal-title').textContent = 'إضافة منتج جديد';
      document.getElementById('product-form').reset();
      document.getElementById('p-edit-id').value = '';
      document.getElementById('p-available').checked = true;
      document.getElementById('product-modal-overlay').classList.add('active');
    });
    document.getElementById('product-modal-save').addEventListener('click', saveProduct);
    document.getElementById('product-modal-close').addEventListener('click', closeProductModal);
    document.getElementById('product-modal-cancel').addEventListener('click', closeProductModal);
    document.getElementById('product-modal-overlay').addEventListener('click', e => { if (e.target.id === 'product-modal-overlay') closeProductModal(); });
  }

  async function saveProduct() {
    const editId = document.getElementById('p-edit-id').value;
    const data = {
      name: document.getElementById('p-name').value.trim(),
      price: document.getElementById('p-price').value.trim(),
      priceNum: parseFloat(document.getElementById('p-price-num').value) || 0,
      category: document.getElementById('p-category').value.trim(),
      description: document.getElementById('p-description').value.trim(),
      imageLight: document.getElementById('p-image-light').value.trim(),
      imageDark: document.getElementById('p-image-dark').value.trim(),
      available: document.getElementById('p-available').checked
    };
    if (!data.name || !data.price) { showToast('يرجى ملء الاسم والسعر', 'error'); return; }
    if (!config.apiUrl) { showToast('يرجى إعداد رابط Google Sheets أولاً', 'error'); return; }
    try {
      const action = editId ? 'updateProduct' : 'addProduct';
      const body = { action, ...data };
      if (editId) body.id = parseInt(editId);
      const res = await fetch(config.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) });
      const result = await res.json();
      if (result.status === 'success') { showToast(editId ? 'تم التعديل ✅' : 'تم الإضافة ✅', 'success'); closeProductModal(); loadProducts(); }
      else throw new Error(result.message || 'فشل الحفظ');
    } catch (e) { showToast(`فشل: ${e.message}`, 'error'); }
  }

  function editProduct(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    document.getElementById('product-modal-title').textContent = 'تعديل المنتج';
    document.getElementById('p-edit-id').value = p.id;
    document.getElementById('p-name').value = p.name || '';
    document.getElementById('p-price').value = p.price || '';
    document.getElementById('p-price-num').value = p.priceNum || 0;
    document.getElementById('p-category').value = p.category || '';
    document.getElementById('p-description').value = p.description || '';
    document.getElementById('p-image-light').value = p.imageLight || p.image || '';
    document.getElementById('p-image-dark').value = p.imageDark || '';
    document.getElementById('p-available').checked = p.available !== false && p.available !== 'false';
    document.getElementById('product-modal-overlay').classList.add('active');
  }

  async function deleteProduct(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    if (!config.apiUrl) return;
    try {
      const res = await fetch(config.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ action: 'deleteProduct', id }) });
      const data = await res.json();
      if (data.status === 'success') { showToast('تم الحذف 🗑️', 'success'); loadProducts(); }
    } catch (e) { showToast('فشل الحذف', 'error'); }
  }

  async function updateOrderStatus(id, status) {
    if (!config.apiUrl) return;
    try {
      const res = await fetch(config.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ action: 'updateOrder', id, status }) });
      const data = await res.json();
      if (data.status === 'success') { showToast('تم تحديث الحالة ✅', 'success'); loadOrders(); }
    } catch (e) { showToast('فشل التحديث', 'error'); }
  }

  function closeProductModal() { document.getElementById('product-modal-overlay').classList.remove('active'); }

  // ─── Settings ──
  function initSettings() {
    document.getElementById('save-settings-btn').addEventListener('click', () => {
      const url = document.getElementById('setting-api-url').value.trim();
      const wa = document.getElementById('setting-whatsapp').value.trim();
      const fb = document.getElementById('setting-facebook').value.trim();
      const pw = document.getElementById('setting-password').value;
      if (url) config.apiUrl = url;
      if (wa) config.whatsappNumber = wa;
      if (fb) config.facebookUrl = fb;
      if (pw) config.password = pw;
      saveConfig();
      showToast('تم حفظ الإعدادات ✅', 'success');
    });
    document.getElementById('test-connection-btn').addEventListener('click', testConnection);
  }

  async function testConnection() {
    const url = document.getElementById('setting-api-url').value.trim();
    const result = document.getElementById('test-result');
    if (!url) { showToast('أدخل الرابط أولاً', 'error'); return; }
    result.className = 'test-result'; result.style.display = 'none';
    const btn = document.getElementById('test-connection-btn');
    const orig = btn.innerHTML; btn.innerHTML = 'جاري الفحص...'; btn.disabled = true;
    try {
      const res = await fetch(url + '?action=getProducts');
      const data = await res.json();
      if (data.status === 'success') { result.className = 'test-result success'; result.textContent = `✅ تم الاتصال بنجاح! (${data.products ? data.products.length : 0} منتج)`; result.style.display = 'block'; }
      else { result.className = 'test-result error'; result.textContent = `❌ فشل: ${data.message || 'استجابة غير معروفة'}`; result.style.display = 'block'; }
    } catch (e) { result.className = 'test-result error'; result.textContent = `❌ فشل الاتصال: ${e.message}`; result.style.display = 'block'; }
    finally { btn.innerHTML = orig; btn.disabled = false; }
  }

  function populateSettings() {
    document.getElementById('setting-api-url').value = config.apiUrl || '';
    document.getElementById('setting-whatsapp').value = config.whatsappNumber || '';
    document.getElementById('setting-facebook').value = config.facebookUrl || '';
  }

  // ─── Choco AI Settings ──
  let sounds = [];
  function initChocoSettings() {
    document.getElementById('add-sound-btn').addEventListener('click', () => { sounds.push({ url: '', delay: 3000, volume: 1 }); renderSoundList(); });
    document.getElementById('save-choco-btn').addEventListener('click', saveChocoSettings);
  }
  function populateChocoSettings() {
    document.getElementById('setting-gemini-key').value = config.geminiKey || '';
    document.getElementById('setting-gemini-model').value = config.geminiModel || 'gemini-2.0-flash';
    
    const remoteAlwaysIntro = config.alwaysShowIntro === 'true';
    const localAlwaysIntro = localStorage.getItem('chocobox_always_intro') === 'true';
    document.getElementById('setting-always-intro').checked = config.alwaysShowIntro !== undefined ? remoteAlwaysIntro : localAlwaysIntro;

    const remoteEnableGlobal = config.enableIntroGlobal === 'true';
    const localEnableGlobal = localStorage.getItem('chocobox_global_intro_enabled') !== 'false'; // default true
    document.getElementById('setting-enable-intro').checked = config.enableIntroGlobal !== undefined ? remoteEnableGlobal : localEnableGlobal;

    try { 
      const remoteSounds = config.introSounds ? JSON.parse(config.introSounds) : null;
      const localSoundsRaw = localStorage.getItem('chocobox_sounds');
      const localSounds = localSoundsRaw ? JSON.parse(localSoundsRaw) : (window.CHOCO_CONFIG?.INTRO_SOUNDS || []);
      sounds = remoteSounds || localSounds;
    } catch (e) { sounds = []; }
    renderSoundList();
  }
  function renderSoundList() {
    const list = document.getElementById('sound-list');
    if (!sounds.length) { list.innerHTML = '<p style="color:var(--text-light);font-size:.85rem">لا توجد مؤثرات صوتية مضافة</p>'; return; }
    list.innerHTML = sounds.map((s, i) => `<div class="sound-item">
      <input type="text" value="${s.url}" placeholder="رابط/مسار الصوت" onchange="window.adminApp.updateSound(${i},'url',this.value)">
      <input type="number" value="${s.delay}" min="0" step="100" placeholder="تأخير ms" onchange="window.adminApp.updateSound(${i},'delay',parseInt(this.value))">
      <button class="sound-remove" onclick="window.adminApp.removeSound(${i})">✕</button>
    </div>`).join('');
  }
  function updateSound(i, key, val) { if (sounds[i]) sounds[i][key] = val; }
  function removeSound(i) { sounds.splice(i, 1); renderSoundList(); }
  function saveChocoSettings() {
    config.geminiKey = document.getElementById('setting-gemini-key').value.trim();
    config.geminiModel = document.getElementById('setting-gemini-model').value.trim() || 'gemini-2.0-flash';
    saveConfig();
    localStorage.setItem('chocobox_sounds', JSON.stringify(sounds));
    const alwaysIntro = document.getElementById('setting-always-intro').checked;
    localStorage.setItem('chocobox_always_intro', alwaysIntro ? 'true' : 'false');
    if (alwaysIntro) sessionStorage.removeItem('choco_intro_done');

    const enableIntroGlobal = document.getElementById('setting-enable-intro').checked;
    localStorage.setItem('chocobox_global_intro_enabled', enableIntroGlobal ? 'true' : 'false');

    showToast('تم حفظ إعدادات شوكو بنجاح على السحابة ✅', 'success');
  }

  // ─── Encode Image ──
  function encodeImagePath(path) {
    if (!path) return '';
    if (path.includes('drive.google.com')) { const m = path.match(/[-\w]{25,}/); if (m) return `https://lh3.googleusercontent.com/d/${m[0]}`; }
    return path.split('/').map((s, i) => { if (path.startsWith('http') && i < 3) return s; return /[^\x00-\x7F]/.test(s) ? encodeURIComponent(s) : s; }).join('/');
  }

  // ─── Toast ──
  function showToast(message, type = 'info') {
    const c = document.getElementById('toast-container');
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const t = document.createElement('div'); t.className = `toast ${type}`;
    t.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(100px)'; t.style.transition = 'all .3s'; setTimeout(() => t.remove(), 300); }, 4000);
  }

  // ─── Public API ──
  window.adminApp = { editProduct, deleteProduct, updateOrderStatus, closeProductModal, updateSound, removeSound };

})();
