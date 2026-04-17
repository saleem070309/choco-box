// ============================================
// ChocoBox — App Logic (Google Sheets Backend)
// ============================================

// ── Configuration ──
// Replace this with your Google Apps Script Web App URL after deploying the script.
const API_URL = 'https://script.google.com/macros/s/AKfycbxoRaKkmPuzFusdvzkTwXrAhVn4FfFXZFUheS7dftK9RGW7VE0G7rmPOQelMg5wy6wVCg/exec';

const STORAGE_KEYS = {
    PRODUCTS: 'chocobox_products',
    CART: 'chocobox_cart',
    FAVORITES: 'chocobox_favorites'
};

// ── State ──
let allProducts = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
let cart = JSON.parse(localStorage.getItem(STORAGE_KEYS.CART) || '[]');
let favorites = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES) || '[]');
let currentPage = 'page_0';

// ── Google Drive Image Helper ──
// Converts a Google Drive sharing URL to a direct image URL.
function getDriveImageUrl(url) {
    if (!url) return 'ball.png'; // fallback
    const trimmed = url.trim();
    
    // Handle format: https://drive.google.com/file/d/FILE_ID/view...
    const match = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
    }
    // Handle format: https://drive.google.com/open?id=FILE_ID
    const match2 = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match2) {
        return `https://lh3.googleusercontent.com/d/${match2[1]}`;
    }
    // Handle format: https://drive.google.com/thumbnail?id=FILE_ID
    const match3 = trimmed.match(/\/thumbnail\?id=([a-zA-Z0-9_-]+)/);
    if (match3) {
        return `https://lh3.googleusercontent.com/d/${match3[1]}`;
    }
    // Handle format: https://drive.google.com/uc?id=FILE_ID
    const match4 = trimmed.match(/\/uc\?.*id=([a-zA-Z0-9_-]+)/);
    if (match4) {
        return `https://lh3.googleusercontent.com/d/${match4[1]}`;
    }
    // If it's already a direct URL or unknown format, return as-is
    return trimmed;
}


// ── Data Management ──
async function fetchProducts() {
    if (!API_URL) {
        console.warn('API_URL is not set. Using cached products.');
        return allProducts;
    }

    try {
        const response = await fetch(`${API_URL}?action=getProducts`);
        const data = await response.json();

        if (data.status === 'success' && data.products) {
            allProducts = data.products.map(p => ({
                id: String(p.id),
                name: p.name || '',
                price: parseFloat(p.price) || 0,
                description: p.description || '',
                rating: p.rating || '5.0',
                image: getDriveImageUrl(p.image),
                category: (p.category === 'الواح' || p.category === 'ألواح' || p.category === 'الالواح') ? 'الألواح' : (p.category || 'متفرقات'),
                fillings: p.fillings || [],
                unit: p.unit || ''
            }));

            localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(allProducts));
        }
        return allProducts;
    } catch (err) {
        console.error('Failed to fetch products:', err);
        return allProducts;
    }
}

function saveCart() {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
    updateCartBadges();
    if (currentPage === 'page_3') renderCart();
}

function saveFavorites() {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
}

// ── Navigation ──
function navigate(pageId, productId = null) {
    if (currentPage === pageId && !productId) return;

    if (pageId === 'page_2' && productId) {
        populateProductDetail(productId);
    }

    history.pushState({ page: pageId, productId }, "", "#" + pageId);
    showPage(pageId);
}

// Navigate to a product detail page by searching for its name
function navigateToProductByName(name) {
    const product = allProducts.find(p => p.name === name);
    if (product) {
        navigate('page_2', product.id);
    } else {
        // Products may not be loaded yet, try fetching first
        fetchProducts().then(() => {
            const p = allProducts.find(p => p.name === name);
            if (p) {
                navigate('page_2', p.id);
            } else {
                navigate('page_1'); // fallback
            }
        });
    }
}

function goBack() {
    history.back();
}


window.addEventListener('popstate', (e) => {
    if (e.state && e.state.page) {
        if (e.state.page === 'page_2' && e.state.productId) {
            populateProductDetail(e.state.productId);
        }
        showPage(e.state.page);
    } else {
        showPage('page_0');
    }
});

function showPage(pageId) {
    document.querySelectorAll('.app-page').forEach(page => page.style.display = 'none');
    const target = document.getElementById(pageId);
    if (target) {
        target.style.display = 'block';
        window.scrollTo(0, 0);
        currentPage = pageId;
        updateBottomNavState(pageId);

        if (pageId === 'page_3') renderCart();
        if (pageId === 'page_6') renderFavorites();
        if (pageId === 'page_1') filterCategory('all');
        if (pageId === 'page_7') loadProfile();
    }
}

function updateBottomNavState(pageId) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const target = btn.getAttribute('data-target');
        const isActive = target === pageId;
        btn.classList.toggle('text-primary', isActive);
        btn.classList.toggle('bg-primary-container/20', isActive);
        btn.classList.toggle('rounded-xl', isActive);
        btn.classList.toggle('text-on-surface-variant', !isActive);
        const icon = btn.querySelector('.material-symbols-outlined');
        if (icon) icon.style.fontVariationSettings = isActive ? "'FILL' 1" : "'FILL' 0";
    });
}

// ── UI Rendering ──

// Home page: Best Sellers horizontal scroll
function renderUserProducts() {
    const grid = document.getElementById('user-products-grid');
    if (!grid) return;

    if (allProducts.length === 0) {
        grid.innerHTML = '<p class="text-center py-12 text-on-surface-variant font-bold min-w-full">جاري تحميل المنتجات...</p>';
        return;
    }

    const products = allProducts.slice(0, 8);
    grid.innerHTML = products.map(p => `
        <div onclick="navigate('page_2', '${p.id}')"
            class="snap-start min-w-[220px] bg-surface-container-low rounded-xl p-4 cursor-pointer hover:bg-surface-container transition-colors relative shadow-none">
            <img src="${p.image}" class="w-full h-40 object-cover rounded-xl mb-3 shadow-inner" alt="${p.name}" onerror="this.src='ball.png'">
            <div>
                <h4 class="font-bold text-on-surface truncate text-lg">${p.name}</h4>
                <span class="text-sm font-bold text-primary mb-2 block mt-1">${p.price} د.أ</span>
                <div class="flex items-center justify-between gap-1 mt-2">
                    <div class="flex items-center gap-1">
                        <button class="w-7 h-7 rounded-full flex items-center justify-center bg-surface-container hover:bg-surface-container-high text-primary font-bold transition border-0 cursor-pointer" onclick="event.stopPropagation(); updateItemQty('${p.id}', -1)">-</button>
                        <span class="w-6 h-7 rounded-full flex items-center justify-center bg-surface text-xs font-bold">${getCartQty(p.id)}</span>
                        <button class="w-7 h-7 rounded-full flex items-center justify-center bg-surface-container hover:bg-surface-container-high text-primary font-bold transition border-0 cursor-pointer" onclick="event.stopPropagation(); updateItemQty('${p.id}', 1)">+</button>
                    </div>
                    <div class="flex items-center gap-1">
                        <button onclick="event.stopPropagation(); toggleFavorite('${p.id}')" class="w-7 h-7 flex items-center justify-center rounded-full bg-tertiary-container/30 text-tertiary hover:bg-tertiary-container/50 transition-colors border-0 cursor-pointer">
                            <span class="material-symbols-outlined text-[16px]" style="font-variation-settings: 'FILL' ${isFavorite(p.id) ? 1 : 0};">favorite</span>
                        </button>
                        <button onclick="event.stopPropagation(); addToCartById('${p.id}')" class="w-7 h-7 flex items-center justify-center rounded-full bg-primary text-on-primary hover:opacity-90 transition-opacity border-0 cursor-pointer">
                            <span class="material-symbols-outlined text-[16px]">shopping_cart</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Category listing page: Grid
function renderListingProducts(filtered = null) {
    const grid = document.getElementById('listing-products-grid');
    if (!grid) return;

    const products = filtered || allProducts;

    if (products.length === 0) {
        grid.innerHTML = '<p class="col-span-full text-center py-20 text-on-surface-variant font-bold">لا توجد منتجات في هذا التصنيف</p>';
        return;
    }

    grid.innerHTML = products.map(p => `
        <div class="bg-surface-container-low rounded-xl flex flex-col gap-3 group p-3 shadow-none" data-category="${p.category}">
            <div class="relative w-full aspect-square rounded-xl overflow-hidden cursor-pointer" onclick="navigate('page_2', '${p.id}')">
                <img src="${p.image}" class="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="${p.name}" onerror="this.src='ball.png'">
                <button onclick="event.stopPropagation(); toggleFavorite('${p.id}')" class="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-surface/80 text-tertiary border-0 cursor-pointer">
                    <span class="material-symbols-outlined text-[18px]" style="font-variation-settings: 'FILL' ${isFavorite(p.id) ? 1 : 0};">favorite</span>
                </button>
            </div>
            <div>
                <h2 class="font-bold text-on-surface text-sm cursor-pointer" onclick="navigate('page_2', '${p.id}')">${p.name}</h2>
                <span class="text-sm font-bold text-primary mb-2 block mt-1">${p.price} د.أ${p.unit ? ' / ' + p.unit : ''}</span>
                <div class="flex items-center justify-between gap-1 mt-2">
                    <div class="flex items-center gap-1">
                        <button onclick="updateItemQty('${p.id}', -1)" class="w-7 h-7 rounded-full flex items-center justify-center bg-surface-container text-primary font-bold border-0 cursor-pointer">-</button>
                        <span class="w-6 h-7 rounded-full flex items-center justify-center bg-surface text-xs font-bold">${getCartQty(p.id)}</span>
                        <button onclick="updateItemQty('${p.id}', 1)" class="w-7 h-7 rounded-full flex items-center justify-center bg-surface-container text-primary font-bold border-0 cursor-pointer">+</button>
                    </div>
                    <button onclick="addToCartById('${p.id}')" class="w-7 h-7 flex items-center justify-center rounded-full bg-primary text-on-primary border-0 cursor-pointer">
                        <span class="material-symbols-outlined text-[16px]">shopping_cart</span>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Favorites page
function renderFavorites() {
    const container = document.getElementById('favorites-grid');
    if (!container) return;

    if (favorites.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center py-20 text-on-surface-variant font-bold">قائمة المفضلة فارغة</p>';
        return;
    }

    const favProducts = allProducts.filter(p => favorites.includes(p.id));

    if (favProducts.length === 0) {
        container.innerHTML = '<p class="col-span-full text-center py-20 text-on-surface-variant font-bold">قائمة المفضلة فارغة</p>';
        return;
    }

    container.innerHTML = favProducts.map(p => `
        <article class="bg-surface-container-low rounded-xl p-3 flex flex-col gap-3 group shadow-none border-0">
            <div class="relative w-full aspect-square rounded-xl overflow-hidden cursor-pointer" onclick="navigate('page_2', '${p.id}')">
                <img src="${p.image}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="${p.name}" onerror="this.src='ball.png'">
                <button onclick="event.stopPropagation(); toggleFavorite('${p.id}')" class="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-surface/80 text-tertiary border-0 cursor-pointer">
                    <span class="material-symbols-outlined text-[18px]" style="font-variation-settings: 'FILL' 1;">favorite</span>
                </button>
            </div>
            <div class="flex flex-col flex-1 px-1">
                <h2 class="text-base font-headline font-semibold text-on-surface leading-tight mb-2">${p.name}</h2>
                <div class="mt-auto flex items-center justify-between">
                    <span class="text-sm font-bold text-primary">${p.price} د.أ</span>
                    <button onclick="addToCartById('${p.id}')" class="w-9 h-9 border-0 flex items-center justify-center rounded-md bg-gradient-to-tl from-primary to-primary-container text-on-primary cursor-pointer">
                        <span class="material-symbols-outlined text-[20px]">add_shopping_cart</span>
                    </button>
                </div>
            </div>
        </article>
    `).join('');
}

// Product detail page — fully dynamic
let selectedFilling = null; // Changed from selectedFlavors (array) to selectedFilling (single)

function populateProductDetail(id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;

    const page = document.getElementById('page_2');
    const detailContainer = document.getElementById('product-detail-content');
    if (!detailContainer) return;

    const isFav = isFavorite(p.id);
    selectedFilling = null;

    // Build filling selector HTML (Single choice)
    let fillingHTML = '';
    if (p.fillings && p.fillings.length > 0) {
        fillingHTML = `
            <div class="flex flex-col gap-2">
                <span class="text-xs font-bold text-on-surface-variant uppercase tracking-widest">الحشوة (اختر واحدة):</span>
                <div class="flex flex-wrap gap-2" id="filling-selector">
                    ${p.fillings.map((fStr, i) => {
                        // Parse "FillingName=Price" (e.g., "فستق=0.5")
                        const parts = fStr.split('=');
                        const name = parts[0];
                        const additionalPrice = parts[1] ? parseFloat(parts[1]) : 0;
                        const priceLabel = additionalPrice > 0 ? ` (+${additionalPrice} د.أ)` : '';
                        
                        return `
                            <button onclick="selectFilling('${name}', ${additionalPrice}, this)" 
                                class="filling-btn px-4 py-2.5 rounded-xl text-sm font-bold border-2 cursor-pointer transition-all duration-200 bg-surface-container-low text-on-surface-variant border-surface-container-highest hover:border-primary/50"
                            >${name}${priceLabel}</button>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    detailContainer.innerHTML = `
        <div class="relative flex flex-col md:flex-row gap-8 items-start mb-12 overflow-hidden">
            <div class="w-full md:w-3/5 rounded-[1.5rem] overflow-hidden shadow-ambient aspect-square md:aspect-[4/5] bg-surface-container-low">
                <img class="w-full h-full object-cover" src="${p.image}" alt="${p.name}" onerror="this.src='ball.png'" />
            </div>
            <div class="w-full md:w-2/5 flex flex-col pt-4 md:pt-12">
                <div class="flex items-center gap-2 mb-4">
                    <span class="bg-secondary-fixed text-on-secondary-fixed px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">${p.category}</span>
                    <div class="flex items-center text-primary">
                        <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">star</span>
                        <span class="text-sm font-bold mr-1">${p.rating}</span>
                    </div>
                </div>
                <h2 class="text-4xl md:text-5xl font-black text-on-surface leading-tight mb-4">${p.name}</h2>
                <p class="text-xl font-bold text-primary mb-6 tracking-wide" id="current-detail-price">${p.price} د.أ${p.unit ? ' / ' + p.unit : ''}</p>
                <div class="flex flex-col gap-6">
                    ${fillingHTML}
                    <div class="flex flex-col gap-2">
                        <span class="text-xs font-bold text-on-surface-variant uppercase tracking-widest">الوصف</span>
                        <p class="text-on-surface-variant leading-relaxed">${p.description || 'لا يوجد وصف متاح لهذا المنتج.'}</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="flex items-center justify-between gap-4 mb-8">
            <button onclick="addToCartWithFilling('${p.id}')"
                class="flex-1 border-0 bg-gradient-to-br from-primary-container to-primary text-on-primary py-4 px-8 rounded-xl font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-ambient text-lg">
                <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' 1;">shopping_bag</span>
                أضف إلى السلة
            </button>
            <button onclick="toggleFavorite('${p.id}')"
                class="w-14 h-14 rounded-xl flex items-center justify-center bg-tertiary-container text-on-tertiary-container shadow-none border-0 hover:opacity-90 active:scale-95 transition-all cursor-pointer" id="detail-fav-btn">
                <span class="material-symbols-outlined" style="font-variation-settings: 'FILL' ${isFav ? 1 : 0};">favorite</span>
            </button>
        </div>
    `;
}

function selectFilling(name, addPrice, btnEl) {
    selectedFilling = { name, addPrice };
    
    // Reset all buttons
    document.querySelectorAll('.filling-btn').forEach(btn => {
        btn.className = 'filling-btn px-4 py-2.5 rounded-xl text-sm font-bold border-2 cursor-pointer transition-all duration-200 bg-surface-container-low text-on-surface-variant border-surface-container-highest hover:border-primary/50';
    });
    
    // Highlight selected
    btnEl.className = 'filling-btn px-4 py-2.5 rounded-xl text-sm font-bold border-2 cursor-pointer transition-all duration-200 bg-primary text-on-primary border-primary shadow-md scale-105';
    
    // Update price display if needed (optional)
    const product = allProducts.find(p => p.id === history.state.productId);
    if (product) {
        const total = product.price + addPrice;
        const priceEl = document.getElementById('current-detail-price');
        if (priceEl) {
            priceEl.textContent = `${total.toFixed(2)} د.أ${product.unit ? ' / ' + product.unit : ''}`;
        }
    }
}

function addToCartWithFilling(productId) {
    const p = allProducts.find(x => x.id === productId);
    if (p.fillings && p.fillings.length > 0 && !selectedFilling) {
        showToast('يرجى اختيار الحشوة أولاً');
        return;
    }
    
    const fillingName = selectedFilling ? selectedFilling.name : '';
    const fillingPrice = selectedFilling ? selectedFilling.addPrice : 0;
    
    addToCartById(productId, fillingName, fillingPrice);
}

// ── Interactions ──

function addToCartById(id, fillingName = '', fillingPrice = 0) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;

    const cartKey = fillingName ? `${id}_${fillingName}` : id;
    const existing = cart.find(item => item.cartKey === cartKey);
    
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ 
            ...p, 
            qty: 1, 
            filling: fillingName, 
            fillingPrice: fillingPrice,
            cartKey: cartKey 
        });
    }
    saveCart();
    showToast('تمت الإضافة للسلة بنجاح!');
}

// Legacy function for any remaining inline calls
function addToCart(product) {
    addToCartById(product.id);
}

function updateItemQty(cartKey, delta) {
    const item = cart.find(i => (i.cartKey || i.id) === cartKey);
    if (item) {
        item.qty += delta;
        if (item.qty <= 0) cart = cart.filter(i => (i.cartKey || i.id) !== cartKey);
    } else if (delta > 0) {
        addToCartById(cartKey);
        return;
    }
    saveCart();
    renderUserProducts();
    renderListingProducts();
    if (currentPage === 'page_3') renderCart();
}

function getCartQty(id) {
    const item = cart.find(i => i.id === id);
    return item ? item.qty : 1;
}

function toggleFavorite(id) {
    if (favorites.includes(id)) {
        favorites = favorites.filter(x => x !== id);
    } else {
        favorites.push(id);
    }
    saveFavorites();
    renderUserProducts();
    renderListingProducts();
    if (currentPage === 'page_6') renderFavorites();
    // Update detail page favorite button if on it
    if (currentPage === 'page_2') {
        const btn = document.getElementById('detail-fav-btn');
        if (btn) {
            const icon = btn.querySelector('.material-symbols-outlined');
            if (icon) icon.style.fontVariationSettings = isFavorite(id) ? "'FILL' 1" : "'FILL' 0";
        }
    }
}

function isFavorite(id) {
    return favorites.includes(id);
}

function filterCategory(category) {
    if (currentPage !== 'page_1') {
        navigate('page_1');
    }

    // Update filter buttons styling
    const buttons = document.querySelectorAll('#page_1 .snap-x button');
    buttons.forEach(btn => {
        const btnText = btn.textContent.trim();
        const isActive = btnText === category || (category === 'all' && btnText === 'الكل');
        btn.classList.toggle('bg-primary', isActive);
        btn.classList.toggle('text-on-primary', isActive);
        btn.classList.toggle('bg-surface-container', !isActive);
        btn.classList.toggle('text-on-surface-variant', !isActive);
    });

    // Filter products from data
    const filtered = category === 'all' ? allProducts : allProducts.filter(p => p.category === category);
    renderListingProducts(filtered);
}

function updateCartBadges() {
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    document.querySelectorAll('.cart-badge').forEach(badge => {
        badge.style.display = totalQty > 0 ? 'flex' : 'none';
        badge.textContent = totalQty;
    });
}

function renderCart() {
    const container = document.getElementById('cart-items-container');
    const countHeader = document.getElementById('cart-count-header');
    const subtotalEl = document.getElementById('cart-subtotal');
    const deliveryEl = document.getElementById('cart-delivery');
    const totalEl = document.getElementById('cart-total');

    if (!container) return;
    container.innerHTML = '';
    let subtotal = 0;

    if (cart.length === 0) {
        container.innerHTML = '<div class="text-center p-8 text-on-surface-variant font-bold bg-surface-container-low rounded-xl">السلة فارغة حالياً. أضف بعض الحلويات اللذيذة!</div>';
        if (countHeader) countHeader.textContent = 'السلة فارغة';
        if (subtotalEl) subtotalEl.textContent = '0.00 د.أ';
        if (deliveryEl) deliveryEl.textContent = '0.00 د.أ';
        if (totalEl) totalEl.textContent = '0.00 د.أ';
        return;
    }

    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    if (countHeader) countHeader.textContent = `لديك ${totalItems} أصناف في سلتك`;

    container.innerHTML = cart.map(item => {
        const itemTotalUnit = item.price + (item.fillingPrice || 0);
        subtotal += itemTotalUnit * item.qty;
        const fillingTag = item.filling ? `<span class="text-xs text-tertiary font-bold bg-tertiary-container/30 px-2 py-0.5 rounded-full">حشوة: ${item.filling}</span>` : '';
        const ck = item.cartKey || item.id;
        return `
            <div class="flex gap-4 bg-surface-container-low p-4 rounded-xl items-center shadow-none border-0">
                <img src="${item.image}" class="w-20 h-20 object-cover rounded-lg bg-surface-container-highest" alt="${item.name}" onerror="this.src='ball.png'">
                <div class="flex-1 flex flex-col justify-between h-full">
                    <div>
                        <h4 class="font-bold text-on-surface text-sm mb-1">${item.name}</h4>
                        ${fillingTag}
                        <p class="text-primary font-bold text-sm mt-1">${itemTotalUnit.toFixed(2)} د.أ</p>
                    </div>
                    <div class="flex items-center gap-1 mt-2">
                        <button onclick="updateItemQty('${ck}', -1)" class="w-8 h-8 rounded-full border-0 flex items-center justify-center bg-surface-container hover:bg-surface-container-high transition shadow-sm text-primary font-bold cursor-pointer">-</button>
                        <span class="w-8 h-8 rounded-full flex items-center justify-center bg-surface shadow-sm font-bold text-sm text-on-surface">${item.qty}</span>
                        <button onclick="updateItemQty('${ck}', 1)" class="w-8 h-8 rounded-full border-0 flex items-center justify-center bg-surface-container hover:bg-surface-container-high transition shadow-sm text-primary font-bold cursor-pointer">+</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const delivery = subtotal >= 50 ? 0 : 2;
    const total = subtotal + delivery;
    if (subtotalEl) subtotalEl.textContent = `${subtotal.toFixed(2)} د.أ`;
    if (deliveryEl) {
        deliveryEl.textContent = subtotal >= 50 ? 'مجاني ✨' : `${delivery.toFixed(2)} د.أ`;
        deliveryEl.className = subtotal >= 50 ? 'font-bold text-green-600' : 'font-bold text-on-surface';
    }
    if (totalEl) totalEl.textContent = `${total.toFixed(2)} د.أ`;
}

// ── Toast ──
let toastTimeout;
function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translate(-50%, -10px)';

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, 0)';
    }, 3000);
}

// ── Profile System ──
function formatPhoneForDB(phoneStr) {
    if (!phoneStr) return '';
    let p = phoneStr.trim().replace(/[\s+]/g, ''); // Remove spaces and +
    if (p.startsWith('00962')) {
        return p.substring(2);
    } else if (p.startsWith('07')) {
        return '962' + p.substring(1);
    } else if (p.startsWith('7')) {
        return '962' + p;
    } else if (p.startsWith('962')) {
        return p;
    }
    return p;
}

function formatPhoneForDisplay(phoneStr) {
    if (!phoneStr) return '';
    if (phoneStr.startsWith('+9627')) {
        return '07' + phoneStr.substring(5);
    } else if (phoneStr.startsWith('9627')) {
        return '07' + phoneStr.substring(4);
    }
    return phoneStr;
}

function getShortName(fullName) {
    if (!fullName) return '—';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
        return parts[0] + ' ' + parts[parts.length - 1];
    }
    return parts[0];
}

function getInitials(fullName) {
    if (!fullName) return 'CB';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
}

function loginProfile() {
    const name = document.getElementById('profile-name-input').value.trim();
    let phoneRaw = document.getElementById('profile-phone-input').value.trim();
    if (!name || !phoneRaw) {
        showToast('أدخل الاسم ورقم الهاتف');
        return;
    }
    
    const dbPhone = formatPhoneForDB(phoneRaw);
    
    // Save locally
    localStorage.setItem('chocobox_user_name', name);
    localStorage.setItem('chocobox_user_phone', dbPhone);

    // Save to Google Sheets
    fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'saveCustomer', phone: dbPhone, name })
    }).catch(() => {});

    showToast('تم التسجيل بنجاح!');
    loadProfile();
}

function loadProfile() {
    const name = localStorage.getItem('chocobox_user_name');
    const phone = localStorage.getItem('chocobox_user_phone');

    if (!name || !phone) {
        document.getElementById('profile-login-section').style.display = 'block';
        document.getElementById('profile-info-section').style.display = 'none';
        return;
    }

    document.getElementById('profile-login-section').style.display = 'none';
    document.getElementById('profile-info-section').style.display = 'block';

    const shortName = getShortName(name);
    document.getElementById('profile-display-name').textContent = shortName;
    // Display formatted phone to user
    const displayPhone = formatPhoneForDisplay(phone);
    document.getElementById('profile-display-phone').textContent = displayPhone;
    document.getElementById('profile-avatar').textContent = getInitials(name);

    // Auto-fill checkout with profile data
    const checkName = document.getElementById('checkout-name');
    const checkPhone = document.getElementById('checkout-phone');
    if (checkName && !checkName.value) checkName.value = name;
    if (checkPhone && !checkPhone.value) checkPhone.value = displayPhone;

    // Load orders
    loadMyOrders(phone);
}

function showEditProfile() {
    const name = localStorage.getItem('chocobox_user_name') || '';
    const phoneStr = localStorage.getItem('chocobox_user_phone') || '';
    
    document.getElementById('profile-edit-name').value = name;
    const phoneInput = document.getElementById('profile-edit-phone');
    if (phoneInput) {
        phoneInput.value = formatPhoneForDisplay(phoneStr);
    }
    document.getElementById('profile-edit-form').style.display = 'block';
}

function saveProfileEdit() {
    const newName = document.getElementById('profile-edit-name').value.trim();
    const phoneInput = document.getElementById('profile-edit-phone');
    const newPhoneRaw = phoneInput ? phoneInput.value.trim() : '';

    if (!newName || !newPhoneRaw) {
        showToast('أدخل الاسم ورقم الهاتف');
        return;
    }
    
    const newDbPhone = formatPhoneForDB(newPhoneRaw);
    
    localStorage.setItem('chocobox_user_name', newName);
    localStorage.setItem('chocobox_user_phone', newDbPhone);

    fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'saveCustomer', phone: newDbPhone, name: newName })
    }).catch(() => {});

    document.getElementById('profile-edit-form').style.display = 'none';
    showToast('تم تحديث البيانات');
    loadProfile();
}

function logoutProfile() {
    localStorage.removeItem('chocobox_user_name');
    localStorage.removeItem('chocobox_user_phone');
    localStorage.removeItem('chocobox_last_order_id');
    localStorage.removeItem('chocobox_last_order_phone');
    showToast('تم تسجيل الخروج');
    loadProfile();
}

async function loadMyOrders(phone) {
    const container = document.getElementById('my-orders-list');
    if (!container) return;
    container.innerHTML = '<p class="text-center text-on-surface-variant py-8">جاري التحميل...</p>';

    try {
        const res = await fetch(`${API_URL}?action=getMyOrders&phone=${encodeURIComponent(phone)}`);
        const data = await res.json();

        if (data.status === 'success' && data.orders && data.orders.length > 0) {
            container.innerHTML = data.orders.map(order => {
                const date = new Date(order.date);
                const dateStr = date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
                const statusColors = {
                    'جديد': 'bg-blue-100 text-blue-800',
                    'يُحضّر': 'bg-amber-100 text-amber-800',
                    'في الطريق': 'bg-green-100 text-green-800',
                    'تم التوصيل': 'bg-gray-100 text-gray-600'
                };
                const statusClass = statusColors[order.orderStatus] || 'bg-surface-container text-on-surface-variant';
                
                // Parse products for display
                const items = order.products ? order.products.split(' | ') : [];
                const itemsHTML = items.map(item => `<span class="text-xs text-on-surface-variant">${item}</span>`).join('<span class="text-xs text-on-surface-variant/50"> • </span>');

                return `
                    <div class="bg-surface-container-low rounded-xl p-4 border-0 shadow-none">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <span class="text-xs font-bold text-on-surface-variant">#${order.orderId}</span>
                                <span class="text-xs text-on-surface-variant/70 mr-2">${dateStr}</span>
                            </div>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${statusClass}">${order.orderStatus}</span>
                        </div>
                        <div class="mb-2 flex flex-wrap gap-1">${itemsHTML}</div>
                        <div class="flex justify-between items-center">
                            <span class="text-sm font-bold text-primary">${order.total}</span>
                            <button onclick="document.getElementById('track-order-id').value='${order.orderId}'; document.getElementById('track-phone').value='${phone}'; navigate('page_5'); trackOrder();" 
                                class="text-xs font-bold text-primary bg-transparent border-0 cursor-pointer hover:underline">تتبع الطلب ←</button>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<p class="text-center text-on-surface-variant py-8">لا توجد طلبات بعد</p>';
        }
    } catch (err) {
        console.error('Load orders error:', err);
        container.innerHTML = '<p class="text-center text-on-surface-variant py-8">لا توجد طلبات بعد</p>';
    }
}

// ── Init ──
document.addEventListener('DOMContentLoaded', async () => {
    // Show loading state first
    renderUserProducts();
    updateCartBadges();

    // Fetch from API
    await fetchProducts();

    // Re-render with fetched data
    renderUserProducts();

    // Auto-fill tracking if we have a recent order
    const lastOrderId = localStorage.getItem('chocobox_last_order_id');
    const lastOrderPhone = localStorage.getItem('chocobox_last_order_phone');
    if (lastOrderId) {
        const trackIdEl = document.getElementById('track-order-id');
        const trackPhEl = document.getElementById('track-phone');
        if (trackIdEl) trackIdEl.value = lastOrderId;
        if (trackPhEl && lastOrderPhone) trackPhEl.value = lastOrderPhone;
    }

    // Initial page from hash
    const hash = window.location.hash.substring(1);
    if (hash && document.getElementById(hash)) {
        showPage(hash);
        history.replaceState({ page: hash }, "", "#" + hash);
    } else {
        showPage('page_0');
        history.replaceState({ page: 'page_0' }, "", "#page_0");
    }
});

// ── GPS Location ──
let checkoutMapObj = null;

function setLocationUI(addr, lat, lng) {
    document.getElementById('checkout-latlng').value = `${lat},${lng}`;
    document.getElementById('checkout-address').value = addr;
    
    document.getElementById('checkout-address-box').classList.remove('hidden');
    document.getElementById('checkout-address-text').textContent = addr;
    document.getElementById('checkout-map-container').classList.add('hidden');
}

function getMyLocation() {
    const btn = document.getElementById('location-auto-btn');
    
    if (!navigator.geolocation) {
        showToast('المتصفح لا يدعم تحديد الموقع');
        return;
    }

    btn.innerHTML = '<span class="material-symbols-outlined text-[20px] animate-spin">progress_activity</span> تحديد تلقائي';

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ar`);
                const data = await res.json();
                const addr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                setLocationUI(addr, lat, lng);
            } catch {
                setLocationUI(`إحداثيات: ${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng);
            }

            btn.innerHTML = '<span class="material-symbols-outlined text-[20px]">my_location</span> تحديد تلقائي';
            showToast('تم تحديد موقعك بنجاح!');
        },
        (error) => {
            btn.innerHTML = '<span class="material-symbols-outlined text-[20px]">my_location</span> تحديد تلقائي';
            showToast('الرجاء السماح بالوصول لِـ موقعك');
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

function openMapSelection() {
    document.getElementById('checkout-map-container').classList.remove('hidden');
    document.getElementById('checkout-address-box').classList.add('hidden');
    
    if (!checkoutMapObj) {
        checkoutMapObj = L.map('checkoutSelectionMap').setView([31.95, 35.93], 13);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
        }).addTo(checkoutMapObj);
    }
    setTimeout(() => {
        checkoutMapObj.invalidateSize();
    }, 200);
}

async function confirmMapSelection() {
    if (!checkoutMapObj) return;
    const center = checkoutMapObj.getCenter();
    const lat = center.lat;
    const lng = center.lng;

    showToast('جاري استرجاع العنوان...');
    document.getElementById('checkout-map-container').classList.add('opacity-50');

    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ar`);
        const data = await res.json();
        const addr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setLocationUI(addr, lat, lng);
    } catch {
        setLocationUI(`إحداثيات: ${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng);
    }
    
    document.getElementById('checkout-map-container').classList.remove('opacity-50');
    showToast('تم اعتماد الموقع من الخريطة');
}

// ── Order Submission to Google Sheets ──
async function submitOrderToSheet() {
    const name = document.getElementById('checkout-name').value.trim();
    const phoneRaw = document.getElementById('checkout-phone').value.trim();
    const phone = formatPhoneForDB(phoneRaw);
    const gov = document.getElementById('checkout-gov').value;
    const address = document.getElementById('checkout-address').value;
    const notes = document.getElementById('checkout-notes').value;
    const latlng = document.getElementById('checkout-latlng').value;

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const delivery = subtotal >= 50 ? 0 : 2;
    const total = subtotal + delivery;

    const productsList = cart.map(item => {
        const fillingStr = item.fillingName ? ` (${item.fillingName})` : '';
        return `${item.name}${fillingStr} x${item.qty}`;
    }).join(' | ');

    // Secretly attach exact map link to address for the sheet
    let finalAddress = address;
    if (latlng) {
        finalAddress += ` | رابط الموقع الدقيق: https://maps.google.com/?q=${latlng}`;
    }

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'addOrder',
                customerName: name,
                customerPhone: phone,
                governorate: gov,
                address: finalAddress,
                products: productsList,
                total: total.toFixed(2) + ' د.أ',
                customerLocation: latlng,
                notes: notes
            })
        });
        const data = await res.json();
        if (data.status === 'success' && data.orderId) {
            localStorage.setItem('chocobox_last_order_id', data.orderId);
            localStorage.setItem('chocobox_last_order_phone', phone);
            
            // Also save/update profile
            localStorage.setItem('chocobox_user_name', name);
            localStorage.setItem('chocobox_user_phone', phone);
            fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ action: 'saveCustomer', phone, name, governorate: gov, address })
            }).catch(() => {});
            
            // Fill tracking inputs
            const trackIdEl = document.getElementById('track-order-id');
            const trackPhEl = document.getElementById('track-phone');
            if (trackIdEl) trackIdEl.value = data.orderId;
            if (trackPhEl) trackPhEl.value = formatPhoneForDisplay(phone);

            showToast(`تم إرسال الطلب! رقم طلبك: ${data.orderId}`);
            return true;
        }
    } catch (err) {
        console.error('Order submission error:', err);
    }
    showToast('حدث خطأ، حاول مرة أخرى');
    return false;
}

// ── Order Tracking ──
let trackingMap = null;

async function trackOrder() {
    const orderId = document.getElementById('track-order-id').value.trim();
    const phoneRaw = document.getElementById('track-phone').value.trim();
    const phone = formatPhoneForDB(phoneRaw);

    if (!orderId || !phone) {
        showToast('أدخل رقم الطلب ورقم الهاتف');
        return;
    }

    showToast('جاري البحث...');

    try {
        const res = await fetch(`${API_URL}?action=getOrderStatus&orderId=${encodeURIComponent(orderId)}&phone=${encodeURIComponent(phone)}`);
        const data = await res.json();

        if (data.status === 'success' && data.order) {
            renderTracking(data.order);
        } else {
            showToast(data.message || 'لم يتم العثور على الطلب');
        }
    } catch (err) {
        console.error('Track error:', err);
        showToast('حدث خطأ في الاتصال');
    }
}

function refreshTracking() {
    trackOrder();
}

function renderTracking(order) {
    // Show result, hide search
    document.getElementById('track-result-section').style.display = 'block';

    // Order info
    document.getElementById('track-order-number').textContent = `طلب رقم #${order.orderId}`;
    const date = new Date(order.date);
    document.getElementById('track-order-date').textContent = date.toLocaleDateString('ar-EG', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    // Status badge
    const badge = document.getElementById('track-status-badge');
    badge.textContent = order.orderStatus;

    // Progress bar and steps
    const statuses = ['جديد', 'يُحضّر', 'في الطريق', 'تم التوصيل'];
    const steps = ['step-received', 'step-preparing', 'step-onway', 'step-delivered'];
    const currentIdx = statuses.indexOf(order.orderStatus);
    const progressPercents = [0, 33, 66, 100];

    document.getElementById('track-progress-bar').style.width = progressPercents[currentIdx] + '%';

    const originalIcons = ['receipt_long', 'skillet', 'two_wheeler', 'home'];

    steps.forEach((stepId, i) => {
        const el = document.getElementById(stepId);
        const circle = el.querySelector('div');
        const label = el.querySelector('span:last-child');

        if (i < currentIdx) {
            // Completed
            circle.className = 'w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center z-10 shadow-none';
            circle.innerHTML = '<span class="material-symbols-outlined text-sm" style="font-variation-settings: \'FILL\' 1;">check</span>';
            label.className = 'text-[10px] mt-1.5 font-medium text-on-surface-variant';
        } else if (i === currentIdx) {
            // Current
            circle.className = 'w-8 h-8 rounded-full bg-surface border-4 border-primary text-primary flex items-center justify-center z-10 shadow-none';
            circle.innerHTML = `<span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">${originalIcons[i]}</span>`;
            label.className = 'text-[10px] mt-1.5 font-bold text-primary';
        } else {
            // Future
            circle.className = 'w-8 h-8 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center z-10 shadow-none';
            circle.innerHTML = `<span class="material-symbols-outlined text-sm">${originalIcons[i]}</span>`;
            label.className = 'text-[10px] mt-1.5 font-medium text-on-surface-variant/50';
        }
    });

    // Order items
    const itemsEl = document.getElementById('track-order-items');
    if (order.products) {
        const items = order.products.split(' | ');
        itemsEl.innerHTML = items.map(item => `<div class="flex justify-between"><span>${item}</span></div>`).join('');
    }
    document.getElementById('track-order-total').textContent = order.total || '---';

    // Map — only show when status is "في الطريق"
    const mapSection = document.getElementById('track-map-section');
    if (order.orderStatus === 'في الطريق') {
        mapSection.style.display = 'block';
        setTimeout(() => initTrackingMap(order), 200);
    } else {
        mapSection.style.display = 'none';
    }
}

function initTrackingMap(order) {
    const mapContainer = document.getElementById('trackingMap');

    // Destroy old map if it exists
    if (trackingMap) {
        trackingMap.remove();
        trackingMap = null;
    }

    // Parse locations
    let customerLat = 31.95, customerLng = 35.93; // Default: Amman
    let deliveryLat = null, deliveryLng = null;

    if (order.customerLocation) {
        const parts = order.customerLocation.split(',');
        if (parts.length === 2) {
            customerLat = parseFloat(parts[0]);
            customerLng = parseFloat(parts[1]);
        }
    }

    if (order.deliveryLocation) {
        const parts = order.deliveryLocation.split(',');
        if (parts.length === 2) {
            deliveryLat = parseFloat(parts[0]);
            deliveryLng = parseFloat(parts[1]);
        }
    }

    trackingMap = L.map(mapContainer).setView([customerLat, customerLng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(trackingMap);

    // Customer marker
    const customerIcon = L.divIcon({
        html: '<div style="background:#7f5624;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">📍</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        className: ''
    });
    L.marker([customerLat, customerLng], { icon: customerIcon })
        .addTo(trackingMap)
        .bindPopup('📍 موقعك');

    // Delivery marker (if available)
    if (deliveryLat !== null && deliveryLng !== null) {
        const deliveryIcon = L.divIcon({
            html: '<div style="background:#2e7d32;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">🛵</div>',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            className: ''
        });
        L.marker([deliveryLat, deliveryLng], { icon: deliveryIcon })
            .addTo(trackingMap)
            .bindPopup('🛵 الموصل');

        // Fit bounds to show both markers
        const bounds = L.latLngBounds(
            [customerLat, customerLng],
            [deliveryLat, deliveryLng]
        );
        trackingMap.fitBounds(bounds, { padding: [40, 40] });
    }
}

