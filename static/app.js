let allProducts = [];
let fuse;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    initEventListeners();
});

async function fetchProducts() {
    const grid = document.getElementById('productGrid');
    // Keep skeletons visible initially
    
    try {
        const response = await fetch('/api/products');
        allProducts = await response.json();
        
        // Initialize Fuse.js for fuzzy search
        const options = {
            keys: ['name', 'description'],
            threshold: 0.4,
        };
        fuse = new Fuse(allProducts, options);
        
        renderProducts(allProducts);
        renderGallery(allProducts);
    } catch (error) {
        console.error('Error fetching products:', error);
        grid.innerHTML = '<p class="error">حدث خطأ أثناء تحميل المنتجات. يرجى المحاولة لاحقاً.</p>';
        showToast('خطأ في الاتصال بالسيرفر', 'error');
    }
}

function renderProducts(products) {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = '';
    
    if (products.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 50px; opacity: 0.5;">لا توجد نتائج تطابق بحثك</div>';
        return;
    }
    
    products.forEach((p, index) => {
        const card = document.createElement('div');
        card.className = 'product-card reveal'; // Added reveal class
        card.style.animationDelay = `${index * 0.05}s`;
        
        const encodedImgUrl = encodeURI(p.image_url);
        card.innerHTML = `
            <div class="img-container">
                <img src="${encodedImgUrl}" alt="${p.name}" loading="lazy" onerror="this.src='https://placehold.co/400x300?text=Choco+Box'">
                <button class="share-btn" onclick="shareProduct('${p.name}', '${encodedImgUrl}')" title="مشاركة">
                    <i class="ph ph-share-network"></i>
                </button>
            </div>
            <div class="card-info">
                <h3>${p.name}</h3>
                <span class="price">${p.price_text}</span>
                <button class="order-btn" onclick="openOrderModal('${p.name}', ${p.id})">
                    <i class="ph ph-shopping-bag"></i> اطلب الآن
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
    
    initScrollReveal();
}

// Scroll Reveal Logic
function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// Social Sharing Logic
window.shareProduct = async (name, imgUrl) => {
    const shareData = {
        title: `Choco Box - ${name}`,
        text: `بص الـ ${name} دي من Choco Box! شكلها يجنن 😍`,
        url: window.location.href
    };
    
    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            // Fallback: Copy Link
            await navigator.clipboard.writeText(window.location.href);
            showToast('تم نسخ الرابط لمشاركته!');
        }
    } catch (err) {
        console.log('Share error:', err);
    }
};

function renderGallery(products) {
    const wrapper = document.getElementById('swiperWrapper');
    wrapper.innerHTML = '';
    
    // Pick first 6 products for gallery
    products.slice(0, 6).forEach(p => {
        const slide = document.createElement('div');
        slide.className = 'swiper-slide product-slide';
        const encodedUrl = encodeURI(p.image_url);
        slide.innerHTML = `
            <img src="${encodedUrl}" alt="${p.name}" onerror="this.src='https://placehold.co/800x450?text=Choco+Box'">
            <div class="slide-caption">
                <h3>${p.name}</h3>
                <p>جودة فاخرة وطعم لا ينسى</p>
                <button class="order-btn" style="width: auto; padding: 8px 20px; margin-top: 10px;" onclick="openOrderModal('${p.name}', ${p.id})">اطلب الآن</button>
            </div>
        `;
        wrapper.appendChild(slide);
    });
    
    // Initialize Swiper
    new Swiper('.swiper', {
        loop: true,
        effect: 'fade',
        fadeEffect: { crossFade: true },
        pagination: { el: '.swiper-pagination', clickable: true },
        autoplay: { delay: 4000, disableOnInteraction: false },
    });
}

// Search Logic
const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('input', (e) => {
    const query = e.target.value;
    if (!query) {
        renderProducts(allProducts);
        return;
    }
    const results = fuse.search(query).map(r => r.item);
    renderProducts(results);
});

// Category Filter
window.filterByCategory = (category, el) => {
    // UI Update
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    
    if (category === 'الكل') {
        renderProducts(allProducts);
        return;
    }
    
    // Logic: Look for category keyword in name/description
    const filtered = allProducts.filter(p => 
        p.name.includes(category) || (p.description && p.description.includes(category))
    );
    renderProducts(filtered);
};

// Modal Logic
window.openOrderModal = (title, id) => {
    document.getElementById('modalTitle').innerText = `طلب: ${title}`;
    document.getElementById('productId').value = id || 0;
    document.getElementById('orderModal').style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent scroll
};

window.closeOrderModal = () => {
    document.getElementById('orderModal').style.display = 'none';
    document.body.style.overflow = 'auto';
};

// Toast System
window.showToast = (message, type = 'success') => {
    const toast = document.getElementById('toast');
    const msgSpan = document.getElementById('toastMessage');
    const icon = toast.querySelector('i');
    
    msgSpan.innerText = message;
    if (type === 'error') {
        icon.className = 'ph ph-x-circle';
        toast.style.background = '#d32f2f';
    } else {
        icon.className = 'ph ph-check-circle';
        toast.style.background = '#3d2314';
    }
    
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
};

// Form Submission & WhatsApp Integration
document.getElementById('orderForm').onsubmit = async (e) => {
    e.preventDefault();
    const customerName = document.getElementById('customerName').value;
    const phone = document.getElementById('customerPhone').value;
    const qty = document.getElementById('orderQty').value;
    const productId = document.getElementById('productId').value;
    const productName = document.getElementById('modalTitle').innerText.replace('طلب: ', '');
    
    const data = {
        customer_name: customerName,
        phone: phone,
        product_id: parseInt(productId),
        quantity: parseInt(qty)
    };
    
    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showToast('تم إرسال طلبك بنجاح!');
            closeOrderModal();
            e.target.reset();
            
            // Generate WhatsApp Link
            const whatsappNumber = "962777777777"; // Shop number
            const message = `مرحباً Choco Box،\nأود طلب المنتج: *${productName}*\nالكمية: *${qty}*\nالاسم: *${customerName}*\nرقم الهاتف: *${phone}*\nشكراً لكم!`;
            const waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
            
            // Open WhatsApp after a short delay
            setTimeout(() => {
                window.open(waUrl, '_blank');
            }, 2000);
            
        } else {
            showToast('حدث خطأ، حاول مجدداً', 'error');
        }
    } catch (error) {
        console.error('Order error:', error);
        showToast('فشل في الإرسال', 'error');
    }
};

// Event Listeners
function initEventListeners() {
    window.onclick = (event) => {
        const orderModal = document.getElementById('orderModal');
        if (event.target == orderModal) closeOrderModal();
    };
}
