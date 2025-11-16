const globals = {
    sections: null,
    sectionsLoaded: false,
    sectionsError: null,
    cache: {}
};

const heroCarousel = {
    currentIndex: 0,
    timer: null,
    slides: [],
    delay: 5000
};

const categoryImageFallbacks = {
    'allergy medicine': 'https://images.unsplash.com/photo-1580281780460-92f78080ade9?auto=format&fit=crop&w=800&q=85',
    'heart medicine': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=85',
    'stomach medicine': 'https://images.unsplash.com/photo-1580894908373-fb1d4780d151?auto=format&fit=crop&w=800&q=85',
    'pain relief': 'https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?auto=format&fit=crop&w=800&q=85',
    'vitamins & supplements': 'https://images.unsplash.com/photo-1598511723374-3ba6bc5d5b47?auto=format&fit=crop&w=800&q=85',
    'skincare': 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=85',
    'color cosmetics': 'https://images.unsplash.com/photo-1513483460601-25834dd141f2?auto=format&fit=crop&w=800&q=85'
};

// Global fallback image - make available to window for other scripts
if (typeof window !== 'undefined') {
    window.globalFallbackImage = window.globalFallbackImage || 'https://images.unsplash.com/photo-1505577081107-4a4167cd81d0?auto=format&fit=crop&w=800&q=85';
}
const globalFallbackImage = window.globalFallbackImage;

const messengerSelectors = {
    toggle: '.messenger-toggle',
    window: '.messenger-window',
    close: '.close-messenger',
    messages: '#messengerMessages',
    body: '.messenger-body',
    input: '#messengerInput',
    send: '#sendMessage'
};

// LEGACY SECTIONS - NO LONGER USED
/*
const SECTION_RENDERERS = {
    hero: renderHeroSection,
    promoGrid: renderPromoGrid,
    categorySpotlight: renderCategorySpotlights,
    brandMarquee: renderBrandMarquee,
    storeCta: renderStoreCta,
    productStrip: renderProductStrip,
    blogHighlights: renderBlogHighlights,
    custom: renderCustomSection
};
*/

// Wait for DOM and scripts to be ready (deferred scripts)
(function() {
    const initStartTime = performance.now();
    
    // Use requestIdleCallback if available, otherwise setTimeout
    const scheduleInit = (callback) => {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(callback, { timeout: 2000 });
        } else {
            setTimeout(callback, 0);
        }
    };
    
    const initialize = async () => {
        try {
            if (typeof window.Logger !== 'undefined') {
                window.Logger.info('Page loaded, initializing...');
            } else {
                console.log('Page loaded, initializing...');
            }
            
            // Load critical content first (above fold) - don't wait for everything
            const criticalLoad = Promise.allSettled([
                typeof window.loadAndRenderHomepageSections === 'function' 
                    ? window.loadAndRenderHomepageSections() 
                    : (typeof loadAndRenderHomepageSections === 'function' ? loadAndRenderHomepageSections() : Promise.resolve())
            ]);
            
            // Load banners after sections (they need sections to position correctly)
            criticalLoad.then(() => {
                if (typeof window.loadAndRenderBanners === 'function') {
                    window.loadAndRenderBanners().catch(err => console.warn('Banner loading failed:', err));
                }
            });
            
            // Load non-critical content in background (don't block page render)
            scheduleInit(() => {
                Promise.all([
                    loadDepartments().catch(err => console.warn('Departments loading failed:', err)),
                    loadStaticBrands().catch(err => console.warn('Brands loading failed:', err)),
                    loadCartCount().catch(err => console.warn('Cart count loading failed:', err)),
                    loadFallbackHomepageProducts().catch(err => console.warn('Homepage products loading failed:', err))
                ]).then(() => {
                    // Initialize UI components after content loads
                    initialiseMessenger();
                    initialiseNewsletter();
                    initialiseGlobalDelegates();
                    initialiseMobileMenu();
                    initialiseCategoryNavLinks();
                }).catch(err => console.warn('Content loading error:', err));
            });
            
            await criticalLoad;
            
            const initDuration = performance.now() - initStartTime;
            const successMsg = `Initialization complete in ${initDuration.toFixed(2)}ms.`;
            
            if (typeof window.Logger !== 'undefined') {
                window.Logger.info(successMsg, { duration: initDuration });
            } else {
                console.log(successMsg);
            }
        } catch (error) {
            const errorMsg = 'Error initialising homepage';
            if (typeof window.Logger !== 'undefined') {
                window.Logger.error(errorMsg, error, {});
            } else {
                console.error(errorMsg, error);
            }
        }
    };
    
    // Start initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        // DOM already loaded
        scheduleInit(initialize);
    }
})();

// Also attach event listeners immediately (in case DOMContentLoaded already fired)
if (document.readyState === 'loading') {
    // DOM hasn't finished loading yet, wait for DOMContentLoaded
    if (typeof window.Logger !== 'undefined') {
        window.Logger.debug('Waiting for DOM to load...');
    } else {
    console.log('Waiting for DOM to load...');
    }
} else {
    // DOM is already loaded, attach listeners now
    if (typeof window.Logger !== 'undefined') {
        window.Logger.debug('DOM already loaded, attaching listeners immediately...');
    } else {
    console.log('DOM already loaded, attaching listeners immediately...');
    }
    initialiseGlobalDelegates();
    initialiseMobileMenu();
    initialiseCategoryNavLinks();
}

// Mobile menu handlers (responsive navbar)
function initialiseMobileMenu() {
    try {
        const toggle = document.querySelector('.js-mobile-menu');
        const panel = document.getElementById('mobileMenuPanel');
        const closeBtn = panel ? panel.querySelector('.mobile-menu-close') : null;

        if (!toggle || !panel) {
            return;
        }

        const openMenu = () => {
            panel.classList.add('active');
            document.body.classList.add('mobile-menu-open');
        };

        const closeMenu = () => {
            panel.classList.remove('active');
            document.body.classList.remove('mobile-menu-open');
        };

        // Toggle menu when hamburger button is clicked
        toggle.addEventListener('click', () => {
            if (panel.classList.contains('active')) {
                closeMenu();
            } else {
                openMenu();
            }
        });
        if (closeBtn) {
            closeBtn.addEventListener('click', closeMenu);
        }

        // Close when clicking outside panel
        panel.addEventListener('click', (e) => {
            if (e.target === panel) {
                closeMenu();
            }
        });

        // Close menu when a link is clicked
        panel.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.getAttribute('href')) {
                closeMenu();
            }
        });
    } catch (err) {
        console.warn('Failed to initialise mobile menu', err);
    }
}

// Map static navbar category links (Makeup, Skin Care, etc.) to real category pages
async function initialiseCategoryNavLinks() {
    try {
        const links = document.querySelectorAll('.nav-category-link');
        if (!links.length) return;

        const categories = await fetchJSON('/api/categories');
        if (!Array.isArray(categories) || !categories.length) return;

        const slugify = (name) =>
            (name || '')
                .toString()
                .toLowerCase()
                .replace(/&/g, 'and')
                .replace(/[^a-z0-9]+/g, '')
                .trim();

        links.forEach(link => {
            const key = link.getAttribute('data-category-key');
            if (!key) return;
            const keySlug = slugify(key);

            const match = categories.find(cat => slugify(cat.name) === keySlug);
            if (match && (match._id || match.id)) {
                const id = match._id || match.id;
                link.setAttribute('href', `/category/${id}`);
            } else {
                // Fallback: send to all products filtered view
                link.setAttribute('href', '/products');
            }
        });
    } catch (err) {
        console.warn('Failed to initialise category nav links', err);
    }
}

// Load lightweight homepage products for fallback product sections (trending / discounted / new)
async function loadFallbackHomepageProducts() {
    try {
        const fallback = document.getElementById('old-sections-fallback');
        const sectionsContainer = document.getElementById('homepage-sections-container');

        // Only load fallback products if the legacy sections are visible
        if (!fallback || !sectionsContainer || fallback.style.display === 'none') {
            return;
        }

        const response = await fetch('/api/public/products/home?limit=20');
        if (!response.ok) {
            console.warn('Failed to fetch home products:', response.status);
            return;
        }

        const data = await response.json();
        const products = Array.isArray(data) ? data : (data.products || []);
        if (!products.length) {
            return;
        }

        const sections = [
            { id: 'tradingItems', start: 0, count: 4 },
            { id: 'discountedProducts', start: 4, count: 4 },
            { id: 'newArrivals', start: 8, count: 4 }
        ];

        sections.forEach(({ id, start, count }) => {
            const container = document.getElementById(id);
            if (!container) return;

            const slice = products.slice(start, start + count);
            if (!slice.length) return;

            container.innerHTML = slice.map(renderSimpleProductCard).join('');

            // Apply fade-in
            const cards = container.querySelectorAll('.fade-in');
            requestAnimationFrame(() => {
                cards.forEach(card => card.classList.add('visible'));
            });
        });
    } catch (err) {
        console.warn('Error loading fallback homepage products', err);
    }
}

function renderSimpleProductCard(product) {
    const productId = product._id || product.id;
    const imageUrl = (product.imageUpload && product.imageUpload.url) || product.image || window.globalFallbackImage || '';
    const price = product.price || 0;
    const discount = product.discount || 0;
    const finalPrice = price * (1 - discount / 100);

    return `
        <div class="col-6 col-md-3">
            <div class="card h-100 shadow-sm product-card fade-in">
                <div class="position-relative product-img">
                    <img src="${htmlEscape(imageUrl)}" alt="${htmlEscape(product.name || '')}">
                    ${discount > 0 ? `<span class="discount-badge">-${discount}%</span>` : ''}
                </div>
                <div class="product-info d-flex flex-column">
                    <h6 class="product-title mt-2">${htmlEscape(product.name || '')}</h6>
                    <div class="price mt-auto">
                        <span class="current-price">Rs. ${finalPrice.toFixed(2)}</span>
                        ${discount > 0 ? `<span class="old-price">Rs. ${price.toFixed(2)}</span>` : ''}
                    </div>
                    <div class="product-actions mt-2">
                        <a href="/product/${productId}" class="btn btn-outline-primary btn-sm w-100">View Details</a>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// LEGACY SECTIONS - NO LONGER USED
/*
async function loadSections() {
    try {
        const sections = await fetchJSON('/api/sections');
        globals.sections = Array.isArray(sections) ? sections : [];
        globals.sectionsLoaded = true;
    } catch (error) {
        globals.sectionsError = error;
        globals.sectionsLoaded = false;
        console.error('Failed to load homepage sections', error);
    }
}
*/

async function loadBanners() {
    try {
        // Get all active banners
        const banners = await fetchJSON('/api/banners');
        if (!Array.isArray(banners) || banners.length === 0) {
            return;
        }

        // Load banners by position
        const middleBanner = document.getElementById('middleBanner');
        const topBanner = document.getElementById('topBanner');
        const bottomBanner = document.getElementById('bottomBanner');

        // Find banners by position
        const middleBannerData = banners.find(b => b.position === 'middle' && b.isActive);
        const topBannerData = banners.find(b => b.position === 'top' && b.isActive);
        const bottomBannerData = banners.find(b => b.position === 'bottom' && b.isActive);

        // Render middle banner (existing location)
        if (middleBanner && middleBannerData) {
            const middleSection = document.getElementById('middleBannerSection');
            if (middleSection) middleSection.style.display = 'block';
            renderBanner(middleBanner, middleBannerData);
        }

        // Render top banner if container exists
        if (topBanner && topBannerData) {
            const topSection = document.getElementById('topBannerSection');
            if (topSection) topSection.style.display = 'block';
            renderBanner(topBanner, topBannerData);
        }

        // Render bottom banner if container exists
        if (bottomBanner && bottomBannerData) {
            const bottomSection = document.getElementById('bottomBannerSection');
            if (bottomSection) bottomSection.style.display = 'block';
            renderBanner(bottomBanner, bottomBannerData);
        }

    } catch (error) {
        // Silently fail - banners are optional
        console.warn('Failed to load banners', error);
    }
}

function renderBanner(container, banner) {
    if (!container || !banner) return;
    
    const imageUrl = resolveImageUrl(banner);
    const link = banner.link || '#';
    
    container.innerHTML = `
        <a href="${htmlEscape(link)}" class="promo-banner__link">
            <div class="promo-banner__media" style="background-image: url('${htmlEscape(imageUrl)}');">
                <div class="promo-banner__content">
                    ${banner.title ? `<h3>${htmlEscape(banner.title)}</h3>` : ''}
                    ${banner.description ? `<p>${htmlEscape(banner.description)}</p>` : ''}
                </div>
            </div>
        </a>
    `;
}

// LEGACY SECTIONS - NO LONGER USED
/*
function renderSections() {
    if (!Array.isArray(globals.sections)) return;

    const heroContainer = document.getElementById('heroSlides');
    const heroDots = document.getElementById('heroDots');
    const categoryRibbon = document.getElementById('categoryRibbon');
    const featuredCategories = document.getElementById('featuredCategories');
    const categorySections = document.getElementById('categorySections');
    const tradingItems = document.getElementById('tradingItems');
    const discountedItems = document.getElementById('discountedProducts');
    const newItems = document.getElementById('newArrivals');
    const middleBanner = document.getElementById('middleBanner');

    heroContainer.innerHTML = '';
    heroDots.innerHTML = '';
    categoryRibbon.innerHTML = '';
    featuredCategories.innerHTML = '';
    categorySections.innerHTML = '';
    tradingItems.innerHTML = '';
    discountedItems.innerHTML = '';
    newItems.innerHTML = '';

    const groups = {
        hero: [],
        promoGrid: [],
        categorySpotlight: [],
        brandMarquee: [],
        storeCta: [],
        productStrip: [],
        blogHighlights: [],
        custom: []
    };

    globals.sections.forEach(section => {
        if (!section?.type || !SECTION_RENDERERS[section.type]) return;
        groups[section.type].push(section);
    });

    if (groups.hero.length) {
        renderHeroSection(groups.hero[0]);
    }

    if (groups.promoGrid.length) {
        renderPromoGrid(groups.promoGrid[0]);
    }

    if (groups.categorySpotlight.length) {
        renderCategorySpotlights(groups.categorySpotlight[0]);
    }

    if (groups.brandMarquee.length) {
        renderBrandMarquee(groups.brandMarquee[0]);
    }

    if (groups.storeCta.length) {
        renderStoreCta(groups.storeCta[0]);
    }

    if (groups.productStrip.length) {
        groups.productStrip.forEach(section => renderProductStrip(section));
    }

    if (groups.blogHighlights.length) {
        renderBlogHighlights(groups.blogHighlights[0]);
    }

    if (groups.custom.length) {
        groups.custom.forEach(section => renderCustomSection(section));
    }
}
*/

function renderHeroSection(section) {
    const heroContainer = document.getElementById('heroSlides');
    const heroDots = document.getElementById('heroDots');
    if (!heroContainer || !section?.data?.slides) return;

    // Filter out slides without valid images or empty/null slides
    const validSlides = section.data.slides.filter(slide => {
        // Only keep slides that have an image (required for display)
        return slide && slide.image && slide.image.trim() !== '';
    });

    // If no valid slides, don't render anything
    if (validSlides.length === 0) {
        console.warn('No valid slides found for hero section');
        return;
    }

    heroCarousel.slides = validSlides;
    heroCarousel.currentIndex = 0;

    heroContainer.innerHTML = heroCarousel.slides.map((slide, index) => {
        // Hero slider should always show navigation link, not "Add to Cart"
        // "Add to Cart" buttons should only appear on product cards
        const link = slide.link || '/products';
        const imageUrl = slide.image || globalFallbackImage;
        const isActive = index === 0 ? ' is-active' : '';
        
        return `
        <article class="hero-slide${isActive}" style="background-image: url('${htmlEscape(imageUrl)}');">
            <div class="hero-slide__overlay">
                <span class="hero-tagline">Trusted since 1975</span>
                <h1>${htmlEscape(slide.title || '')}</h1>
                <p>${htmlEscape(slide.description || '')}</p>
                <a href="${htmlEscape(link)}" class="btn btn-primary btn-lg">
                    Explore <i class="fas fa-arrow-right ms-2"></i>
                </a>
            </div>
        </article>
    `;
    }).join('');

    if (heroDots) {
        heroDots.innerHTML = heroCarousel.slides.map((_, index) => `
            <button class="hero-dot${index === 0 ? ' is-active' : ''}" data-index="${index}" aria-label="Go to slide ${index + 1}"></button>
        `).join('');
    }

    bindHeroCarouselEvents();
    
    // Initialize the slider position - ensure track is at 0
    const track = document.querySelector('.hero-carousel__track');
    if (track) {
        track.style.transform = 'translateX(0%)';
    }
    
    moveHeroSlide(0);
    startHeroAutoplay();
}

function renderPromoGrid(section) {
    if (!Array.isArray(section?.data?.items)) return;
    const container = document.querySelector('.promo-grid .row');
    if (!container) return;

    container.innerHTML = section.data.items.map(item => `
        <div class="col-lg-4 col-md-6">
            <a class="promo-card" href="${item.link || '#'}">
                <div class="promo-card__media" style="background-image: url('${htmlEscape(item.image || globalFallbackImage)}');"></div>
                <div class="promo-card__body">
                    <h5>${item.title || ''}</h5>
                    <p>${item.description || ''}</p>
                </div>
            </a>
        </div>
    `).join('');
}

function renderCategorySpotlights(section) {
    const featuredContainer = document.getElementById('featuredCategories');
    const ribbonContainer = document.getElementById('categoryRibbon');
    const sectionsContainer = document.getElementById('categorySections');
    if (!section?.data?.categories || !featuredContainer || !ribbonContainer || !sectionsContainer) return;

    const categories = section.data.categories;

    featuredContainer.innerHTML = categories.slice(0, 4).map(category => {
        const categoryId = category._id || category.id;
        return `
        <div class="col-lg-3 col-sm-6">
            <a class="category-card" href="/category/${categoryId}">
                <div class="category-img">
                    <img src="${htmlEscape(category.image || globalFallbackImage)}" alt="${htmlEscape(category.name)}">
                </div>
                <div class="category-body">
                    <h5>${category.name}</h5>
                    <p>${category.description || ''}</p>
                    <span class="category-link">Browse products <i class="fas fa-arrow-right"></i></span>
                </div>
            </a>
        </div>
    `;
    }).join('');

    ribbonContainer.innerHTML = categories.slice(0, 8).map(category => {
        const categoryId = category._id || category.id;
        return `
        <a class="category-ribbon__item" href="/category/${categoryId}">
            <div class="category-ribbon__icon">
                <img src="${htmlEscape(category.image || globalFallbackImage)}" alt="${htmlEscape(category.name)}">
            </div>
            <span>${category.name}</span>
        </a>
    `;
    }).join('');

    sectionsContainer.innerHTML = categories.map(category => {
        const categoryId = category._id || category.id;
        return `
        <section class="category-section">
            <div class="category-section__banner" style="background-image: url('${htmlEscape(category.image || globalFallbackImage)}')">
                <div class="category-section__heading">
                    <span class="eyebrow">${category.name}</span>
                    <h3>${category.name}</h3>
                    <p>${category.description || ''}</p>
                </div>
            </div>
            <div class="category-section__content">
                <div class="container">
                    <div class="section-header mb-4">
                        <div>
                            <h4 class="mb-0">${htmlEscape(category.name)} Products</h4>
                        </div>
                        <a href="/category/${categoryId}" class="btn btn-outline-primary btn-sm">
                            View all products <i class="fas fa-arrow-right ms-2"></i>
                        </a>
                    </div>
                    <div class="category-products" id="category-products-${categoryId}">
                        ${CategoryProductMarkup(category.products)}
                    </div>
                </div>
            </div>
        </section>
    `;
    }).join('');
}

function CategoryProductMarkup(products = []) {
    if (!Array.isArray(products) || !products.length) {
        return '<p class="text-muted">Products coming soon.</p>';
    }

    return products.map(product => createCategoryProductCard(product)).join('');
}

function renderBrandMarquee(section) {
    if (!Array.isArray(section?.data?.logos)) return;
    const container = document.querySelector('.brand-marquee__inner');
    if (!container) return;

    container.innerHTML = section.data.logos.map(logo => `
        <div class="brand-marquee__item"><img src="${htmlEscape(logo.image || globalFallbackImage)}" alt="${htmlEscape(logo.alt || '')}"></div>
    `).join('');
}

function renderStoreCta(section) {
    const overlay = document.querySelector('.store-cta__overlay');
    const media = document.querySelector('.store-cta__media');
    if (!overlay || !media) return;

    const data = section.data || {};
    const primaryAction = data.primaryAction || {};
    const secondaryAction = data.secondaryAction || {};

    overlay.innerHTML = `
        <span class="eyebrow">${data.eyebrow || ''}</span>
        <h2>${data.title || ''}</h2>
        <p>${data.description || ''}</p>
        <div class="store-cta__actions">
            ${primaryAction.label ? `<a href="${primaryAction.href || '#'}" class="btn btn-primary" ${primaryAction.external ? 'target="_blank" rel="noopener"' : ''}>${primaryAction.label}</a>` : ''}
            ${secondaryAction.label ? `<a href="${secondaryAction.href || '#'}" class="btn btn-outline-primary" ${secondaryAction.external ? 'target="_blank" rel="noopener"' : ''}>${secondaryAction.label}</a>` : ''}
                </div>
            `;
            
    if (data.image) {
        media.style.backgroundImage = `url('${htmlEscape(data.image)}')`;
    }
}

function renderProductStrip(section) {
    const target = (section.config?.mode || '').toLowerCase();
    let containerId = null;
    switch (target) {
        case 'trending':
            containerId = 'tradingItems';
            break;
        case 'discounted':
            containerId = 'discountedProducts';
            break;
        case 'new':
        case 'newarrival':
        case 'new-arrival':
            containerId = 'newArrivals';
            break;
        default:
            return;
    }

    const container = document.getElementById(containerId);
    if (!container) return;

    const products = section.data?.products || [];
    container.innerHTML = products.map(product => createProductCard(product)).join('');
}

function renderBlogHighlights(section) {
    if (!Array.isArray(section?.data?.articles)) return;
    const container = document.querySelector('.blog-highlights .row');
    if (!container) return;

    container.innerHTML = section.data.articles.map(article => `
        <div class="col-lg-4 col-md-6">
            <article class="blog-card">
                <div class="blog-card__media" style="background-image: url('${htmlEscape(article.image || globalFallbackImage)}');"></div>
                <div class="blog-card__body">
                    ${article.tag ? `<span class="blog-card__tag">${article.tag}</span>` : ''}
                    <h5>${article.title || ''}</h5>
                    <p>${article.description || ''}</p>
                    ${article.link ? `<a href="${article.link}" class="blog-card__link">Read article</a>` : ''}
                            </div>
            </article>
                        </div>
    `).join('');
}

function renderCustomSection(section) {
    console.info('Unhandled custom section rendering', section);
}

async function loadStaticBrands() {
    try {
        console.log('Loading static brands from /api/brands/public...');
        
        // Use fetch instead of fetchJSON if it doesn't exist
        let brands;
        let response;
        
        if (typeof fetchJSON === 'function') {
            console.log('Using fetchJSON function');
            brands = await fetchJSON('/api/brands/public');
        } else {
            console.log('Using native fetch');
            response = await fetch('/api/brands/public', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Fetch response status:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            
            brands = await response.json();
        }
        
        console.log('✅ Brands received from API:', brands);
        console.log('   Type:', Array.isArray(brands) ? 'Array' : typeof brands);
        console.log('   Count:', Array.isArray(brands) ? brands.length : 'N/A');
        
        // Handle different response formats
        const brandsArray = Array.isArray(brands) ? brands : (brands.brands || brands.data || []);
        
        if (!Array.isArray(brandsArray) || brandsArray.length === 0) {
            console.log('No brands found, hiding section');
            // Hide the section if no brands are available
            const staticBrandSection = document.getElementById('static-brand-section');
            if (staticBrandSection) {
                staticBrandSection.style.display = 'none';
            }
            return;
        }
        
        const brandContainer = document.getElementById('static-brand-marquee');
        const staticBrandSection = document.getElementById('static-brand-section');
        
        if (!brandContainer) {
            console.warn('Brand marquee container not found');
            return;
        }
        
        if (!staticBrandSection) {
            console.warn('Static brand section not found');
            return;
        }
        
        // Clear existing content
        brandContainer.innerHTML = '';
        
        // Add brands to the container
        brandsArray.forEach(brand => {
            let logoUrl = brand.image || '';
            const brandName = brand.name || brand.alt || 'Brand';
            const brandAlt = brand.alt || brandName;
            const brandLink = brand.link || '';
            
            // Clean up the image URL
            if (logoUrl) {
                logoUrl = String(logoUrl).trim();
                // Remove any invalid values
                if (logoUrl === 'null' || logoUrl === 'undefined' || logoUrl === '') {
                    console.warn('Brand has invalid image URL:', brandName, logoUrl);
                    logoUrl = '';
                }
            }
            
            if (!logoUrl) {
                console.warn('Brand missing image URL:', brandName);
                return; // Skip brands without images
            }
            
            try {
                console.log('Adding brand:', String(brandName || ''), 'with image:', String(logoUrl || ''));
            } catch (err) {
                console.log('Adding brand with image');
            }
            
            const brandItem = document.createElement('div');
            brandItem.className = 'brand-marquee__item';
            
            const img = document.createElement('img');
            img.src = logoUrl;
            img.alt = brandAlt;
            img.loading = 'lazy';
            
            // Add error handler
            img.onerror = function() {
                try {
                    console.error('❌ Failed to load brand image:', String(logoUrl || ''), 'for brand:', String(brandName || ''));
                } catch (err) {
                    console.error('❌ Failed to load brand image');
                }
                // Hide broken image and remove item
                this.style.display = 'none';
                const parent = this.closest('.brand-marquee__item');
                if (parent && parent.parentNode) {
                    try {
                        console.warn('Removing brand item due to image load failure:', String(brandName || ''));
                    } catch (err) {
                        console.warn('Removing brand item due to image load failure');
                    }
                    parent.parentNode.removeChild(parent);
                }
            };
            
            // Add success handler
            img.onload = function() {
                try {
                    console.log('✅ Loaded brand image:', String(brandName || ''), 'from:', String(logoUrl || ''));
                } catch (err) {
                    console.log('✅ Loaded brand image successfully');
                }
            };
            
            if (brandLink) {
                const link = document.createElement('a');
                link.href = brandLink;
                link.target = '_blank';
                link.rel = 'noopener';
                link.appendChild(img);
                brandItem.appendChild(link);
            } else {
                brandItem.appendChild(img);
            }
            
            brandContainer.appendChild(brandItem);
        });
        
        // Show the section if brands were loaded
        if (brandsArray.length > 0) {
            staticBrandSection.style.display = 'block';
            console.log(`Successfully loaded ${brandsArray.length} brand logos`);
        } else {
            staticBrandSection.style.display = 'none';
        }
        
        if (typeof window.Logger !== 'undefined') {
            window.Logger.info(`Loaded ${brandsArray.length} brand logos`);
        }
    } catch (error) {
        console.error('Failed to load brands:', error);
        // Hide the section on error
        const staticBrandSection = document.getElementById('static-brand-section');
        if (staticBrandSection) {
            staticBrandSection.style.display = 'none';
        }
    }
}

async function loadDepartments() {
    try {
        const departments = await fetchJSON('/api/departments');
        if (!Array.isArray(departments) || departments.length === 0) {
            if (typeof window.Logger !== 'undefined') {
                window.Logger.warn('No departments found');
            } else {
                console.warn('No departments found');
            }
            return;
        }
        
            const menu = document.getElementById('departmentsMenu');
            const showcase = document.getElementById('departmentsShowcase');
        const footerDepartments = document.getElementById('footerDepartments');

        if (menu) {
            menu.innerHTML = departments.map(dept => {
                const deptId = dept._id || dept.id;
                return `
                <li><a class="dropdown-item" href="/department/${deptId}">${htmlEscape(dept.name)}</a></li>
            `;
            }).join('');

            const msg = `✓ Loaded ${departments.length} departments into navbar`;
            if (typeof window.Logger !== 'undefined') {
                window.Logger.info(msg, { count: departments.length });
            } else {
                console.log(msg);
            }
        }
        
        // Also load categories for navbar dropdowns
        await loadCategoriesForNavbar();

        if (showcase) {
            showcase.innerHTML = departments.map(dept => {
                const deptId = dept._id || dept.id;
                return `
                <div class="col-lg-3 col-md-4 col-sm-6">
                    <div class="department-card">
                        <div class="department-media">
                            <img src="${htmlEscape(resolveImageUrl(dept))}" alt="${htmlEscape(dept.name)}">
                        </div>
                        <div class="department-body">
                            <h5>${htmlEscape(dept.name)}</h5>
                            <p>${htmlEscape(dept.description || '')}</p>
                            <a href="/department/${deptId}" class="btn btn-outline-primary btn-sm">View Categories</a>
                        </div>
                    </div>
                </div>
            `;
            }).join('');
        }

        // Load departments in footer
        if (footerDepartments) {
            footerDepartments.innerHTML = departments.slice(0, 6).map(dept => {
                const deptId = dept._id || dept.id;
                return `
                <li><a href="/department/${deptId}">${htmlEscape(dept.name)}</a></li>
            `;
            }).join('');
        }
    } catch (error) {
        const errorMsg = 'Error loading departments';
        if (typeof window.Logger !== 'undefined') {
            window.Logger.error(errorMsg, error, {});
        } else {
            console.error(errorMsg, error);
        }
    }
}

// Load categories for navbar dropdowns
async function loadCategoriesForNavbar() {
    try {
        const categories = await fetchJSON('/api/categories');
        if (!Array.isArray(categories) || categories.length === 0) {
            return;
        }
        
        // Group categories by department or by name similarity
        const makeupMenu = document.getElementById('makeupMenu');
        const skincareMenu = document.getElementById('skincareMenu');
        const haircareMenu = document.getElementById('haircareMenu');
        
        if (makeupMenu) {
            const makeupCategories = categories.filter(cat => 
                cat.name.toLowerCase().includes('makeup') || 
                cat.name.toLowerCase().includes('cosmetic') ||
                cat.name.toLowerCase().includes('lipstick') ||
                cat.name.toLowerCase().includes('foundation') ||
                cat.name.toLowerCase().includes('eyeshadow')
            );
            if (makeupCategories.length > 0) {
                makeupMenu.innerHTML = makeupCategories.slice(0, 10).map(cat => {
                    const catId = cat._id || cat.id;
                    return `<li><a class="dropdown-item" href="/category/${catId}">${htmlEscape(cat.name)}</a></li>`;
                }).join('');
            }
        }
        
        if (skincareMenu) {
            const skincareCategories = categories.filter(cat => 
                cat.name.toLowerCase().includes('skin') || 
                cat.name.toLowerCase().includes('face') ||
                cat.name.toLowerCase().includes('cream') ||
                cat.name.toLowerCase().includes('serum') ||
                cat.name.toLowerCase().includes('moisturizer')
            );
            if (skincareCategories.length > 0) {
                skincareMenu.innerHTML = skincareCategories.slice(0, 10).map(cat => {
                    const catId = cat._id || cat.id;
                    return `<li><a class="dropdown-item" href="/category/${catId}">${htmlEscape(cat.name)}</a></li>`;
                }).join('');
            }
        }
        
        if (haircareMenu) {
            const haircareCategories = categories.filter(cat => 
                cat.name.toLowerCase().includes('hair') || 
                cat.name.toLowerCase().includes('shampoo') ||
                cat.name.toLowerCase().includes('conditioner') ||
                cat.name.toLowerCase().includes('oil')
            );
            if (haircareCategories.length > 0) {
                haircareMenu.innerHTML = haircareCategories.slice(0, 10).map(cat => {
                    const catId = cat._id || cat.id;
                    return `<li><a class="dropdown-item" href="/category/${catId}">${htmlEscape(cat.name)}</a></li>`;
                }).join('');
            }
        }
    } catch (error) {
        if (typeof window.Logger !== 'undefined') {
            window.Logger.warn('Error loading categories for navbar', { error: error.message });
        } else {
            console.warn('Error loading categories for navbar:', error);
        }
    }
}

function resolveImageUrl(entity) {
    if (!entity) return globalFallbackImage;
    if (entity.imageUpload && entity.imageUpload.url) return entity.imageUpload.url;
    if (entity.image) return entity.image;
    return globalFallbackImage;
}

function createProductCard(product) {
    if (!product) return '';

    // Extract product ID - handle both string and object formats
    let productId = '';
    if (product._id) {
        productId = typeof product._id === 'string' ? product._id : product._id.toString();
    } else if (product.id) {
        productId = typeof product.id === 'string' ? product.id : product.id.toString();
    }
    
    if (!productId) {
        console.error('Product missing ID:', product);
        return ''; // Don't render card if no ID
    }
    
    const name = htmlEscape(product.name || 'Product');
    const image = htmlEscape(product.image || globalFallbackImage);
    const discount = Number(product.discount) || 0;
    const priceValue = Number(product.price);
    const hasNumericPrice = !Number.isNaN(priceValue);
    const finalPrice = hasNumericPrice
        ? (discount > 0 ? priceValue * (1 - discount / 100) : priceValue)
        : null;

    const priceMarkup = hasNumericPrice
        ? `
            <div class="product-price">
                ${discount > 0
                    ? `<span class="product-price__current">Rs. ${finalPrice.toFixed(2)}</span>
                       <span class="product-price__old">Rs. ${priceValue.toFixed(2)}</span>`
                    : `<span class="product-price__current">Rs. ${priceValue.toFixed(2)}</span>`}
            </div>
        `
        : '';
    
    return `
        <div class="col-lg-3 col-md-4 col-sm-6">
            <div class="product-card">
                <div class="product-img">
                    <img src="${image}" alt="${name}">
                </div>
                <div class="product-body">
                    <h6>${name}</h6>
                    ${product.category?.name ? `<span class="product-meta">${htmlEscape(product.category.name)}</span>` : ''}
                    ${priceMarkup}
                    <div class="product-actions">
                        <a href="/product/${htmlEscape(productId)}" class="btn btn-outline-primary btn-sm view-product" data-id="${htmlEscape(productId)}">View</a>
                        <button type="button" class="btn btn-primary btn-sm add-to-cart" data-id="${htmlEscape(productId)}" data-product-id="${htmlEscape(productId)}">Add to cart</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createCategoryProductCard(product) {
    if (!product) return '';

    // Extract product ID - handle both string and object formats
    let productId = '';
    if (product._id) {
        productId = typeof product._id === 'string' ? product._id : product._id.toString();
    } else if (product.id) {
        productId = typeof product.id === 'string' ? product.id : product.id.toString();
    }
    
    if (!productId) {
        console.error('Product missing ID in category card:', product);
        return ''; // Don't render card if no ID
    }
    
    const name = htmlEscape(product.name || 'Product');
    const image = htmlEscape(product.image || globalFallbackImage);
    const priceValue = Number(product.price);
    const hasNumericPrice = !Number.isNaN(priceValue);

    return `
        <div class="product-card category-card-lite">
            <div class="product-img">
                <img src="${image}" alt="${name}">
            </div>
            <div class="product-body">
                <h6>${name}</h6>
                ${hasNumericPrice ? `<span class="product-price__current">Rs. ${priceValue.toFixed(2)}</span>` : ''}
                <div class="product-actions">
                    <a href="/product/${htmlEscape(productId)}" class="btn btn-outline-primary btn-sm view-product" data-id="${htmlEscape(productId)}">View</a>
                    <button type="button" class="btn btn-primary btn-sm add-to-cart" data-id="${htmlEscape(productId)}" data-product-id="${htmlEscape(productId)}">Add to cart</button>
                </div>
            </div>
        </div>
    `;
}

function bindHeroCarouselEvents() {
    const prevButton = document.querySelector('.hero-carousel__nav--prev');
    const nextButton = document.querySelector('.hero-carousel__nav--next');
    const dotsContainer = document.getElementById('heroDots');

    if (prevButton) {
        prevButton.onclick = () => {
            moveHeroSlide(heroCarousel.currentIndex - 1);
            restartHeroAutoplay();
        };
    }

    if (nextButton) {
        nextButton.onclick = () => {
            moveHeroSlide(heroCarousel.currentIndex + 1);
            restartHeroAutoplay();
        };
    }

    if (dotsContainer) {
        dotsContainer.onclick = event => {
            const target = event.target.closest('.hero-dot');
            if (!target) return;
            const index = Number(target.dataset.index);
            if (!Number.isNaN(index)) {
                moveHeroSlide(index);
                restartHeroAutoplay();
            }
        };
    }
}

function moveHeroSlide(targetIndex) {
    const slideCount = heroCarousel.slides.length;
    if (!slideCount) return;

    const normalizedIndex = (targetIndex + slideCount) % slideCount;
    heroCarousel.currentIndex = normalizedIndex;

    const slideElements = document.querySelectorAll('.hero-slide');
    const dotElements = document.querySelectorAll('.hero-dot');
    const track = document.querySelector('.hero-carousel__track');

    // Move the track container - this is the correct approach for flexbox layout
    if (track) {
        // Calculate the percentage to move (negative because we're moving left)
        const translateX = -normalizedIndex * 100;
        track.style.transform = `translateX(${translateX}%)`;
    }

    // Remove any individual slide transforms (they shouldn't have any)
    slideElements.forEach((slide) => {
        slide.style.transform = '';
        slide.style.left = '';
        slide.style.right = '';
    });

    // Update slide active states
    slideElements.forEach((slide, index) => {
        slide.classList.toggle('is-active', index === normalizedIndex);
    });

    // Update dot active states
    dotElements.forEach((dot, index) => {
        dot.classList.toggle('is-active', index === normalizedIndex);
    });
}

function startHeroAutoplay() {
    stopHeroAutoplay();
    if (heroCarousel.slides.length <= 1) return;

    heroCarousel.timer = window.setInterval(() => {
        moveHeroSlide(heroCarousel.currentIndex + 1);
    }, heroCarousel.delay);
}

function stopHeroAutoplay() {
    if (heroCarousel.timer) {
        window.clearInterval(heroCarousel.timer);
        heroCarousel.timer = null;
    }
}

function restartHeroAutoplay() {
    stopHeroAutoplay();
    startHeroAutoplay();
}

function initialiseMessenger() {
    const toggle = document.querySelector(messengerSelectors.toggle);
    const windowPanel = document.querySelector(messengerSelectors.window);
    const closeButton = document.querySelector(messengerSelectors.close);
    const sendButton = document.querySelector(messengerSelectors.send);
    const input = document.querySelector(messengerSelectors.input);

    toggle?.addEventListener('click', () => {
        windowPanel?.classList.toggle('active');
    });

    closeButton?.addEventListener('click', () => {
        windowPanel?.classList.remove('active');
    });

    sendButton?.addEventListener('click', () => {
        const message = input?.value.trim();
        if (!message) return;

        addUserMessage(message);
        if (input) input.value = '';

        window.setTimeout(() => {
            const aiResponse = generateAIResponse(message);
            addBotMessage(aiResponse);
        }, 1000);
    });

    input?.addEventListener('keypress', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            sendButton?.click();
        }
    });
}

function initialiseNewsletter() {
    const form = document.querySelector('.newsletter-form');
    if (!form) return;

    form.addEventListener('submit', event => {
        event.preventDefault();
        const emailInput = form.querySelector('input[type="email"]');
        const email = emailInput?.value.trim();
        if (!email) return;

        alert(`Thank you for subscribing with email: ${email}`);
        if (emailInput) emailInput.value = '';
    });
}

function initialiseGlobalDelegates() {
    // Use event delegation to handle dynamically created buttons
    document.addEventListener('click', async event => {
        // Debug: log what was clicked
        const target = event.target;
        const clickedElement = target.closest('button, a');
        
        // Handle search popup toggle
        const searchTrigger = event.target.closest('.push_side[data-id="#search_pupop"]');
        if (searchTrigger) {
            event.preventDefault();
            const searchPopup = document.getElementById('search_pupop');
            if (searchPopup) {
                searchPopup.classList.add('active');
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    setTimeout(() => searchInput.focus(), 100);
                }
            }
            return false;
        }

        // Handle search popup close
        const closeSearch = event.target.closest('.close-push');
        if (closeSearch) {
            const searchPopup = document.getElementById('search_pupop');
            if (searchPopup) {
                searchPopup.classList.remove('active');
            }
            return false;
        }

        // Handle mobile menu toggle
        const mobileMenuTrigger = event.target.closest('.js-mobile-menu');
        if (mobileMenuTrigger) {
            event.preventDefault();
            toggleMobileMenu();
            return false;
        }

        // Handle dropdown toggle for departments
        const dropdownToggle = event.target.closest('.dropdown-toggle');
        if (dropdownToggle) {
            event.preventDefault();
            const menuItem = dropdownToggle.closest('.menu-item');
            if (menuItem) {
                menuItem.classList.toggle('show');
            }
            return false;
        }

        // Close dropdowns when clicking outside
        if (!event.target.closest('.menu-item.has-children')) {
            document.querySelectorAll('.menu-item.show').forEach(item => {
                if (!item.contains(event.target)) {
                    item.classList.remove('show');
                }
            });
        }
        
        // Handle add to cart buttons (on product cards)
        const addButton = event.target.closest('.add-to-cart');
        if (addButton) {
            event.preventDefault();
            event.stopPropagation();
            const productId = addButton.dataset.id || addButton.dataset.productId;
            console.log('Add to cart clicked, productId:', productId, 'Button:', addButton);
            if (productId) {
                await handleAddToCart(productId);
            } else {
                console.error('Add to cart button missing product ID. Button attributes:', {
                    id: addButton.id,
                    class: addButton.className,
                    dataset: addButton.dataset,
                    innerHTML: addButton.innerHTML
                });
                alert('Unable to add product to cart. Product ID is missing.');
            }
            return false;
        }

        // Note: "Add to Cart" buttons only appear on product cards, not on sliders, banners, categories, or departments

        // Handle cart icon click - navigate to cart page
        const cartIcon = event.target.closest('.cart-icon a, .cart-block a');
        if (cartIcon && !event.target.closest('.cart-count')) {
            event.preventDefault();
            window.location.href = '/cart.html';
            return false;
        }

        // Handle view product buttons
        const viewButton = event.target.closest('.view-product');
        if (viewButton) {
            event.preventDefault();
            const productId = viewButton.dataset.id || viewButton.dataset.productId;
            if (productId) {
                handleViewProduct(productId);
            }
            return false;
        }
    }, true); // Use capture phase to catch events earlier

    // Close search popup when clicking outside
    document.addEventListener('click', event => {
        const searchPopup = document.getElementById('search_pupop');
        if (searchPopup && searchPopup.classList.contains('active')) {
            if (!searchPopup.contains(event.target) && !event.target.closest('.push_side[data-id="#search_pupop"]')) {
                searchPopup.classList.remove('active');
            }
        }
    });

    // Close search popup on ESC key
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            const searchPopup = document.getElementById('search_pupop');
            if (searchPopup && searchPopup.classList.contains('active')) {
                searchPopup.classList.remove('active');
            }
        }
    });
}

function toggleMobileMenu() {
    // Create mobile menu if it doesn't exist
    let mobileMenu = document.getElementById('mobile-menu-panel');
    if (!mobileMenu) {
        mobileMenu = document.createElement('div');
        mobileMenu.id = 'mobile-menu-panel';
        mobileMenu.className = 'mobile-menu-panel';
        
        const menuContent = document.createElement('div');
        menuContent.className = 'mobile-menu-content';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'mobile-menu-close';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = () => toggleMobileMenu();
        
        const menuList = document.createElement('ul');
        menuList.className = 'mobile-menu-list';
        menuList.id = 'mobileMenuList';
        
        menuContent.appendChild(closeBtn);
        menuContent.appendChild(menuList);
        mobileMenu.appendChild(menuContent);
        document.body.appendChild(mobileMenu);
        
        // Populate mobile menu
        loadMobileMenu();
    }
    
    mobileMenu.classList.toggle('active');
    document.body.classList.toggle('mobile-menu-open');
}

function loadMobileMenu() {
    const mobileMenuList = document.getElementById('mobileMenuList');
    if (!mobileMenuList) return;

    // Clone main menu items
    const mainMenu = document.getElementById('menu-main-menu');
    if (mainMenu) {
        mobileMenuList.innerHTML = Array.from(mainMenu.children).map(li => {
            const clone = li.cloneNode(true);
            // Remove dropdown toggle behavior for mobile
            const dropdownToggle = clone.querySelector('.dropdown-toggle');
            if (dropdownToggle) {
                dropdownToggle.addEventListener('click', function(e) {
                    e.preventDefault();
                    clone.classList.toggle('expanded');
                });
            }
            return clone.outerHTML;
        }).join('');
    }
}

// Guest cart functions
function getGuestCart() {
    try {
        const cartStr = localStorage.getItem('guestCart');
        return cartStr ? JSON.parse(cartStr) : { items: [] };
    } catch (e) {
        return { items: [] };
    }
}

function saveGuestCart(cart) {
    localStorage.setItem('guestCart', JSON.stringify(cart));
}

function getGuestCartCount() {
    const cart = getGuestCart();
    return cart.items.reduce((total, item) => total + (item.quantity || 0), 0);
}

function addToGuestCart(productId, quantity = 1, price = 0, discount = 0) {
    const cart = getGuestCart();
    const existingItemIndex = cart.items.findIndex(item => item.productId === productId);
    
    if (existingItemIndex >= 0) {
        cart.items[existingItemIndex].quantity += quantity;
    } else {
        cart.items.push({
            productId: productId,
            quantity: quantity,
            price: price,
            discount: discount
        });
    }
    
    saveGuestCart(cart);
    return getGuestCartCount();
}

async function mergeGuestCartWithUserCart() {
    const guestCart = getGuestCart();
    if (!guestCart.items || guestCart.items.length === 0) {
        return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        return;
    }

    try {
        // Add each item from guest cart to user cart
        for (const item of guestCart.items) {
            try {
                await fetchJSON('/api/cart/add', {
                    method: 'POST',
                    body: {
                        productId: item.productId,
                        quantity: item.quantity
                    }
                });
            } catch (error) {
                console.error(`Failed to add product ${item.productId} to cart:`, error);
            }
        }

        // Clear guest cart after successful merge
        localStorage.removeItem('guestCart');
        await loadCartCount();
    } catch (error) {
        console.error('Failed to merge guest cart:', error);
    }
}

async function loadCartCount() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            // Show guest cart count if not logged in
            const guestCount = getGuestCartCount();
            updateCartCount(guestCount);
            return;
        }

        const response = await fetchJSON('/api/cart/count', {
            method: 'GET'
        });

        if (response && typeof response.count === 'number') {
            updateCartCount(response.count);
        }
    } catch (error) {
        // If user is not logged in or token is invalid, show guest cart count
        const guestCount = getGuestCartCount();
        updateCartCount(guestCount);
    }
}

function updateCartCount(count) {
    const cartCountEl = document.querySelector('.cart-count');
    if (cartCountEl) {
        cartCountEl.textContent = String(count || 0);
    }
}

async function handleAddToCart(productId) {
    console.log('handleAddToCart called with productId:', productId);
    
    if (!productId) {
        console.error('handleAddToCart: No productId provided');
        alert('Product ID is missing. Cannot add to cart.');
        return;
    }

    const token = localStorage.getItem('token');
    
    // If not logged in, add to guest cart
    if (!token) {
        console.log('handleAddToCart: No token found, adding to guest cart');
        
        // Fetch product details to get price
        try {
            const productResponse = await fetchJSON(`/api/products/${productId}`);
            if (productResponse) {
                const cartCount = addToGuestCart(
                    productId,
                    1,
                    productResponse.price || 0,
                    productResponse.discount || 0
                );
                updateCartCount(cartCount);
                alert('Product added to cart! Sign in to save your cart.');
            } else {
                alert('Product not found.');
            }
        } catch (error) {
            console.error('Error fetching product details:', error);
            // Add to guest cart with default values
            const cartCount = addToGuestCart(productId, 1, 0, 0);
            updateCartCount(cartCount);
            alert('Product added to cart! Sign in to save your cart.');
        }
        return;
    }

    console.log('handleAddToCart: Making API call with productId:', productId);

    try {
        const response = await fetchJSON('/api/cart/add', {
            method: 'POST',
            body: { productId, quantity: 1 }
        });

        console.log('handleAddToCart: API response:', response);
        console.log('handleAddToCart: Response totalItems:', response?.totalItems);

        if (response && typeof response.totalItems === 'number') {
            updateCartCount(response.totalItems);
            console.log('handleAddToCart: Cart count updated to:', response.totalItems);
            alert('Product added to cart!');
        } else {
            // Fallback: reload cart count from API
            console.warn('handleAddToCart: Response missing totalItems, reloading cart count from API');
            try {
                await loadCartCount();
            } catch (countError) {
                console.error('handleAddToCart: Error loading cart count:', countError);
                // Last resort: increment manually
                const cartCountEl = document.querySelector('.cart-count');
                if (cartCountEl) {
                    const currentCount = Number(cartCountEl.textContent) || 0;
                    updateCartCount(currentCount + 1);
                }
            }
            alert('Product added to cart!');
        }
    } catch (error) {
        console.error('Add to cart failed', error);
        console.error('Error details:', {
            message: error.message,
            status: error.status,
            stack: error.stack
        });
        
        let errorMessage = 'Unable to add product to cart.';
        if (error.status === 401) {
            errorMessage = 'Please log in to add products to cart.';
            localStorage.removeItem('token');
            setTimeout(() => {
                window.location.href = '/login';
            }, 1500);
        } else if (error.status === 400 || error.status === 404) {
            errorMessage = error.message || 'Product not available.';
        }
        
        alert(errorMessage);
    }
}

function handleViewProduct(productId) {
    if (!productId) return;
    window.location.href = `/product/${productId}`;
}

function addUserMessage(message) {
    const container = document.querySelector(messengerSelectors.messages);
    if (!container) return;

    container.insertAdjacentHTML('beforeend', `
        <div class="message user-message">
            <p>${message}</p>
        </div>
    `);
    scrollToBottom();
}

function addBotMessage(message) {
    const container = document.querySelector(messengerSelectors.messages);
    if (!container) return;

    container.insertAdjacentHTML('beforeend', `
        <div class="message bot-message">
            <p>${message}</p>
        </div>
    `);
    scrollToBottom();
}

function scrollToBottom() {
    const messengerBody = document.querySelector(messengerSelectors.body);
    if (!messengerBody) return;
    messengerBody.scrollTop = messengerBody.scrollHeight;
}

function generateAIResponse(userMessage) {
    const message = userMessage.toLowerCase();
    
    if (message.includes('hello') || message.includes('hi')) {
        return 'Hello! How can I help you today? You can ask me about our products, departments, or current offers.';
    }
    if (message.includes('medicine') || message.includes('medicines')) {
        return "We have a wide range of medicines for various health conditions. Our medicine department includes categories like allergy medicine, heart medicine, stomach medicine, and more. Would you like to know about any specific category?";
    }
    if (message.includes('cosmetics') || message.includes('makeup')) {
        return 'Our cosmetics department offers a variety of products including color cosmetics, skincare, and beauty accessories. We have products from top brands at competitive prices.';
    }
    if (message.includes('perfume') || message.includes('fragrance')) {
        return 'We have an extensive collection of perfumes for men and women from international brands. You can find both luxury and affordable options in our perfume department.';
    }
    if (message.includes('discount') || message.includes('offer') || message.includes('sale')) {
        return "We currently have special discounts on selected products. You can check our 'Special Offers' section on the homepage for the latest deals. Would you like to know about any specific department's offers?";
    }
    if (message.includes('delivery') || message.includes('shipping')) {
        return 'We offer home delivery across Pakistan. Standard delivery takes 3-5 working days, while express delivery takes 1-2 working days in major cities. Delivery charges may apply based on your location.';
    }
    if (message.includes('payment')) {
        return 'We accept multiple payment methods including cash on delivery, credit/debit cards, and online bank transfers. All transactions are secure and encrypted.';
    }
    if (message.includes('return') || message.includes('refund')) {
        return 'We have a 7-day return policy for most products. Items must be unused, in original packaging, and accompanied by the receipt. Some restrictions apply to medicines and personal care items.';
    }
    return 'Thank you for your message. For more specific information, you can browse our departments or contact our customer service at +92 300 1234567. Is there anything else I can help you with?';
}

function fetchOptionsFrom({ method = 'GET', body, headers, ...rest } = {}) {
    const options = { method, headers: { ...(headers || {}) }, ...rest };

    if (body !== undefined) {
        options.body = typeof body === 'string' ? body : JSON.stringify(body);
        if (!options.headers['Content-Type']) {
            options.headers['Content-Type'] = 'application/json';
        }
    }

    return options;
}

async function fetchJSON(url, options) {
    const fetchOpts = fetchOptionsFrom(options);
    
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token && !fetchOpts.headers['x-auth-token']) {
        fetchOpts.headers['x-auth-token'] = token;
    }
    
    const response = await fetch(url, fetchOpts);

    if (!response.ok) {
        const error = new Error(`Request failed with status ${response.status}`);
        error.status = response.status;
        
        // Try to get error message from response
        try {
            const errorData = await response.json();
            error.message = errorData.message || error.message;
        } catch (e) {
            // If response is not JSON, use default message
        }
        
        throw error;
    }

    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
        return response.json();
    }

    return response.text();
}

function htmlEscape(content = '') {
    return content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Export functions to window for use in other scripts
if (typeof window !== 'undefined') {
    window.handleAddToCart = handleAddToCart;
    window.addToGuestCart = addToGuestCart;
    window.loadCartCount = loadCartCount;
    window.getGuestCart = getGuestCart;
    window.htmlEscape = htmlEscape;
    window.resolveImageUrl = resolveImageUrl;
    window.globalFallbackImage = globalFallbackImage;
}