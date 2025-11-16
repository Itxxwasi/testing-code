$(document).ready(function() {
    loadCartCount();
    loadDepartments();
    loadFilters();
    
    // Check URL parameters for filters
    const urlParams = new URLSearchParams(window.location.search);
    const filter = urlParams.get('filter');
    if (filter) {
        // Set filter based on URL
        if (filter === 'trending') {
            // Products will be filtered by isTrending on backend
        } else if (filter === 'discounted') {
            // Products will be filtered by discount > 0 on backend
        } else if (filter === 'new') {
            // Products will be filtered by isNewArrival on backend
        }
    }
    
    loadProducts();

    // Filter handlers
    $('#applyFilters').click(function() {
        loadProducts();
    });

    $('#clearFilters').click(function() {
        $('#searchInput').val('');
        $('#departmentFilter').val('');
        $('#categoryFilter').val('');
        $('#minPrice').val('');
        $('#maxPrice').val('');
        $('#sortBy').val('name');
        loadProducts();
    });

    // Update category filter when department changes
    $('#departmentFilter').change(function() {
        const deptId = $(this).val();
        updateCategoryFilter(deptId);
    });

    // Enter key on search
    $('#searchInput').keypress(function(e) {
        if (e.which === 13) {
            loadProducts();
        }
    });
});

let currentPage = 1;

function loadFilters() {
    // Load will be done when products load
}

function updateCategoryFilter(departmentId) {
    const categorySelect = $('#categoryFilter');
    categorySelect.html('<option value="">All Categories</option>');

    if (!departmentId) {
        // Load all categories
        $.get('/api/categories')
            .done(function(categories) {
                categories.forEach(cat => {
                    const catId = cat._id || cat.id;
                    categorySelect.append(`<option value="${catId}">${cat.name}</option>`);
                });
            });
        return;
    }

    // Load categories for selected department
    $.get(`/api/categories?department=${departmentId}`)
        .done(function(categories) {
            categories.forEach(cat => {
                const catId = cat._id || cat.id;
                categorySelect.append(`<option value="${catId}">${cat.name}</option>`);
            });
        });
}

function loadProducts(page = 1) {
    currentPage = page;
    
    const params = {
        page: page,
        limit: 20
    };

    const search = $('#searchInput').val().trim();
    if (search) params.search = search;

    const departmentId = $('#departmentFilter').val();
    if (departmentId) params.departmentId = departmentId;

    const categoryId = $('#categoryFilter').val();
    if (categoryId) params.categoryId = categoryId;

    const minPrice = $('#minPrice').val();
    if (minPrice) params.minPrice = minPrice;

    const maxPrice = $('#maxPrice').val();
    if (maxPrice) params.maxPrice = maxPrice;

    const sort = $('#sortBy').val();
    if (sort) params.sort = sort;

    // Check URL for filter parameter
    const urlParams = new URLSearchParams(window.location.search);
    const filter = urlParams.get('filter');
    if (filter) params.filter = filter;

    const queryString = new URLSearchParams(params).toString();

    $.get(`/api/public/products?${queryString}`)
        .done(function(data) {
            const { products, pagination, filters } = data;

            // Update filter dropdowns
            updateFilterDropdowns(filters);

            // Update products info
            $('#productsInfo').text(`Showing ${products.length} of ${pagination.total} products`);

            // Render products
            renderProducts(products);

            // Render pagination
            renderPagination(pagination);

            // Update URL without reload
            const newUrl = `/products?${queryString}`;
            window.history.pushState({}, '', newUrl);
        })
        .fail(function(error) {
            console.error('Error loading products:', error);
            $('#productsGrid').html('<div class="col-12"><div class="alert alert-danger">Error loading products. Please try again.</div></div>');
        });
}

function updateFilterDropdowns(filters) {
    // Update department filter
    const deptSelect = $('#departmentFilter');
    const currentDept = deptSelect.val();
    deptSelect.html('<option value="">All Departments</option>');
    if (filters.departments) {
        filters.departments.forEach(dept => {
            const deptId = dept._id || dept.id;
            const selected = currentDept === deptId ? 'selected' : '';
            deptSelect.append(`<option value="${deptId}" ${selected}>${dept.name}</option>`);
        });
    }

    // Update category filter based on selected department
    updateCategoryFilter(currentDept);
}

function renderProducts(products) {
    const container = $('#productsGrid');
    const noProducts = $('#noProducts');
    
    if (!products || products.length === 0) {
        container.html('');
        noProducts.show();
        return;
    }

    noProducts.hide();
    
    container.html(products.map(product => {
        const productId = product._id || product.id;
        const productImage = product.imageUpload?.url || product.image || 'https://via.placeholder.com/300x300';
        const finalPrice = product.price * (1 - (product.discount || 0) / 100);
        const categoryName = product.category?.name || 'Uncategorized';
        const departmentName = product.department?.name || '';
        
        return `
            <div class="col-lg-3 col-md-4 col-sm-6">
                <div class="card h-100 shadow-sm product-card">
                    <div class="position-relative product-img">
                        <img src="${productImage}" alt="${product.name}">
                        ${product.discount > 0 ? `<span class="badge bg-danger position-absolute top-0 end-0 m-2">-${product.discount}%</span>` : ''}
                    </div>
                    <div class="card-body d-flex flex-column">
                        <small class="text-muted">${categoryName}${departmentName ? ` • ${departmentName}` : ''}</small>
                        <h6 class="card-title mt-2">${product.name}</h6>
                        <p class="card-text text-muted small flex-grow-1">${product.description?.substring(0, 100)}${product.description?.length > 100 ? '...' : ''}</p>
                        <div class="mt-auto">
                            <div class="mb-2">
                                <strong class="text-primary">Rs. ${finalPrice.toFixed(2)}</strong>
                                ${product.discount > 0 ? `<small class="text-muted text-decoration-line-through ms-2">Rs. ${product.price.toFixed(2)}</small>` : ''}
                            </div>
                            <div class="d-grid gap-2">
                                <button class="btn btn-primary add-to-cart" data-id="${productId}" data-product-id="${productId}">
                                    <i class="fas fa-shopping-cart"></i> Add to Cart
                                </button>
                                <a href="/product/${productId}" class="btn btn-outline-primary btn-sm">View Details</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join(''));

    // Attach event handlers
    $('.add-to-cart').click(function() {
        const productId = $(this).data('id');
        handleAddToCart(productId);
    });
}

function renderPagination(pagination) {
    const nav = $('#paginationNav');
    const ul = $('#pagination');
    
    if (pagination.pages <= 1) {
        nav.hide();
        return;
    }

    nav.show();
    ul.html('');

    // Previous button
    if (pagination.page > 1) {
        ul.append(`<li class="page-item"><a class="page-link" href="#" data-page="${pagination.page - 1}">Previous</a></li>`);
    }

    // Page numbers
    for (let i = 1; i <= pagination.pages; i++) {
        const active = i === pagination.page ? 'active' : '';
        ul.append(`<li class="page-item ${active}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`);
    }

    // Next button
    if (pagination.page < pagination.pages) {
        ul.append(`<li class="page-item"><a class="page-link" href="#" data-page="${pagination.page + 1}">Next</a></li>`);
    }

    // Attach click handlers
    $('.page-link').click(function(e) {
        e.preventDefault();
        const page = $(this).data('page');
        loadProducts(page);
        $('html, body').animate({ scrollTop: 0 }, 'slow');
    });
}

// Guest cart helper functions
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

function handleAddToCart(productId) {
    const token = localStorage.getItem('token');
    
    // If not logged in, add to guest cart
    if (!token) {
        // Fetch product details to get price
        $.get(`/api/products/${productId}`)
            .done(function(product) {
                if (product) {
                    const cartCount = addToGuestCart(
                        productId,
                        1,
                        product.price || 0,
                        product.discount || 0
                    );
                    $('.cart-count').text(cartCount);
                    alert('Product added to cart! Sign in to save your cart.');
                } else {
                    alert('Product not found.');
                }
            })
            .fail(function() {
                // Add to guest cart with default values if API call fails
                const cartCount = addToGuestCart(productId, 1, 0, 0);
                $('.cart-count').text(cartCount);
                alert('Product added to cart! Sign in to save your cart.');
            });
        return;
    }

    $.ajaxSetup({
        headers: {
            'x-auth-token': token
        }
    });

    $.ajax({
        url: '/api/cart/add',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ productId, quantity: 1 })
    })
    .done(function(data) {
        alert('Product added to cart!');
        loadCartCount();
    })
    .fail(function(error) {
        console.error('Error adding to cart:', error);
        alert('Error adding product to cart. Please try again.');
    });
}

function loadCartCount() {
    const token = localStorage.getItem('token');
    if (!token) {
        // Show guest cart count if not logged in
        const guestCount = getGuestCartCount();
        $('.cart-count').text(guestCount);
        return;
    }

    $.ajaxSetup({
        headers: {
            'x-auth-token': token
        }
    });

    $.get('/api/cart/count')
        .done(function(data) {
            $('.cart-count').text(data.count || 0);
        })
        .fail(function() {
            // If API fails, show guest cart count
            const guestCount = getGuestCartCount();
            $('.cart-count').text(guestCount);
        });
}

function loadDepartments() {
    $.get('/api/departments')
        .done(function(departments) {
            const menu = $('#departmentsMenu');
            const footer = $('#footerDepartments');
            
            if (menu.length) {
                menu.html(departments.map(dept => {
                    const deptId = dept._id || dept.id;
                    return `<li><a class="dropdown-item" href="/department/${deptId}">${dept.name}</a></li>`;
                }).join(''));
            }
            
            if (footer.length) {
                footer.html(departments.map(dept => {
                    const deptId = dept._id || dept.id;
                    return `<li><a href="/department/${deptId}">${dept.name}</a></li>`;
                }).join(''));
            }
        })
        .fail(function() {
            console.error('Error loading departments');
        });
}

