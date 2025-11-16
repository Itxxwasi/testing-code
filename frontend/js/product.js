$(document).ready(function() {
    // Get product ID from URL
    const pathParts = window.location.pathname.split('/');
    const productId = pathParts[pathParts.length - 1];
    
    if (!productId) {
        showError('Product ID not found');
        return;
    }

    // Load cart count
    loadCartCount();
    
    // Load product details
    loadProduct(productId);
    
    // Quantity controls
    $('#increaseQty').click(function() {
        const qtyInput = $('#productQuantity');
        const currentQty = parseInt(qtyInput.val(), 10);
        const maxQty = parseInt(qtyInput.attr('max'), 10);
        if (currentQty < maxQty) {
            qtyInput.val(currentQty + 1);
        }
    });
    
    $('#decreaseQty').click(function() {
        const qtyInput = $('#productQuantity');
        const currentQty = parseInt(qtyInput.val(), 10);
        if (currentQty > 1) {
            qtyInput.val(currentQty - 1);
        }
    });
    
    // Add to cart button
    $('#addToCartBtn').click(function() {
        const productId = $(this).data('product-id');
        const quantity = parseInt($('#productQuantity').val(), 10);
        if (productId) {
            addToCart(productId, quantity);
        }
    });
    
    // Add to wishlist button
    $('#addToWishlistBtn').click(function() {
        alert('Wishlist functionality coming soon!');
    });
});

function loadProduct(productId) {
    console.log('Loading product:', productId);
    
    $.get(`/api/public/products/${productId}`)
        .done(function(product) {
            console.log('Product loaded:', product);
            renderProduct(product);
        })
        .fail(function(error) {
            console.error('Error loading product:', error);
            if (error.status === 404) {
                showError('Product not found');
            } else {
                showError('Error loading product. Please try again.');
            }
        });
}

function renderProduct(product) {
    const productId = product._id || product.id;
    const productImage = product.imageUpload?.url || product.image || 'https://via.placeholder.com/600x600';
    const finalPrice = product.price * (1 - (product.discount || 0) / 100);
    const hasDiscount = product.discount > 0;
    const isSoldOut = product.stockQuantity === 0 || product.isOutOfStock || false;
    const categoryName = product.category?.name || 'Uncategorized';
    const departmentName = product.department?.name || 'Unknown';
    const departmentId = product.department?._id || product.department;
    const categoryId = product.category?._id || product.category;
    
    // Hide loading, show content
    $('#productLoading').hide();
    $('#productContent').show();
    
    // Product Image
    $('#productImage').attr('src', productImage).attr('alt', product.name);
    
    // Product Badges
    let badgesHtml = '';
    if (hasDiscount) {
        badgesHtml += `<span class="badge bg-danger product-badge">-${product.discount}%</span>`;
    }
    if (isSoldOut) {
        badgesHtml += `<span class="badge bg-secondary product-badge">Out of Stock</span>`;
    }
    $('#productBadges').html(badgesHtml);
    
    // Breadcrumb
    let breadcrumbHtml = '<li class="breadcrumb-item"><a href="/">Home</a></li>';
    if (departmentId) {
        breadcrumbHtml += `<li class="breadcrumb-item"><a href="/department/${departmentId}">${departmentName}</a></li>`;
    }
    if (categoryId) {
        breadcrumbHtml += `<li class="breadcrumb-item"><a href="/category/${categoryId}">${categoryName}</a></li>`;
    }
    breadcrumbHtml += `<li class="breadcrumb-item active">${product.name}</li>`;
    $('#productBreadcrumb').html(breadcrumbHtml);
    
    // Product Name
    $('#productName').text(product.name);
    
    // Product Price
    let priceHtml = '';
    if (hasDiscount) {
        priceHtml += `<span class="text-muted text-decoration-line-through me-2">Rs. ${product.price.toFixed(2)}</span>`;
    }
    priceHtml += `<span class="text-primary fs-3 fw-bold">Rs. ${finalPrice.toFixed(2)}</span>`;
    $('#productPrice').html(priceHtml);
    
    // Product Description
    $('#productDescription').html(product.description || 'No description available.');
    
    // Product Meta
    $('#productCategory').html(`<a href="/category/${categoryId}">${categoryName}</a>`);
    $('#productDepartment').html(`<a href="/department/${departmentId}">${departmentName}</a>`);
    
    const stockText = isSoldOut ? '<span class="text-danger">Out of Stock</span>' : 
                     (product.stockQuantity ? `<span class="text-success">${product.stockQuantity} available</span>` : 
                     '<span class="text-success">In Stock</span>');
    $('#productStock').html(stockText);
    
    // Quantity input max
    if (product.stockQuantity) {
        $('#productQuantity').attr('max', Math.min(product.stockQuantity, 10));
    }
    
    // Add to cart button
    const addToCartBtn = $('#addToCartBtn');
    addToCartBtn.data('product-id', productId);
    if (isSoldOut) {
        addToCartBtn.prop('disabled', true).text('Out of Stock');
    } else {
        addToCartBtn.prop('disabled', false);
    }
    
    // Update page title
    document.title = `${product.name} - D.Watson Cosmetics`;
}

function showError(message) {
    $('#productLoading').hide();
    $('#productError').show().find('p').first().text(message);
}

function addToCart(productId, quantity = 1) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        // Guest cart - fetch product details first
        $.get(`/api/public/products/${productId}`)
            .done(function(product) {
                const productPrice = product.price || 0;
                const productDiscount = product.discount || 0;
                
                // Add to guest cart
                let guestCart = JSON.parse(localStorage.getItem('guestCart') || '{"items":[]}');
                const existingItemIndex = guestCart.items.findIndex(item => item.productId === productId);
                
                if (existingItemIndex >= 0) {
                    guestCart.items[existingItemIndex].quantity += quantity;
                } else {
                    guestCart.items.push({
                        productId: productId,
                        quantity: quantity,
                        price: productPrice,
                        discount: productDiscount
                    });
                }
                
                localStorage.setItem('guestCart', JSON.stringify(guestCart));
                const cartCount = guestCart.items.reduce((sum, item) => sum + item.quantity, 0);
                $('.cart-count').text(cartCount);
                alert('Product added to cart! Sign in to save your cart.');
            })
            .fail(function() {
                alert('Error adding product to cart. Please try again.');
            });
        return;
    }
    
    // User cart - make API call
    $.ajax({
        url: '/api/cart/add',
        method: 'POST',
        headers: {
            'x-auth-token': token,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify({ productId, quantity })
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
        // Guest cart count
        try {
            const guestCart = JSON.parse(localStorage.getItem('guestCart') || '{"items":[]}');
            const cartCount = guestCart.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
            $('.cart-count').text(cartCount);
        } catch (e) {
            $('.cart-count').text('0');
        }
        return;
    }
    
    // User cart count
    $.ajax({
        url: '/api/cart/count',
        headers: {
            'x-auth-token': token
        }
    })
    .done(function(data) {
        $('.cart-count').text(data.count || 0);
    })
    .fail(function() {
        // Fallback to guest cart count
        try {
            const guestCart = JSON.parse(localStorage.getItem('guestCart') || '{"items":[]}');
            const cartCount = guestCart.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
            $('.cart-count').text(cartCount);
        } catch (e) {
            $('.cart-count').text('0');
        }
    });
}
