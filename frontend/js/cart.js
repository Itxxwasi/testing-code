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

function removeFromGuestCart(productId) {
    const cart = getGuestCart();
    cart.items = cart.items.filter(item => item.productId !== productId);
    saveGuestCart(cart);
}

function updateGuestCartQuantity(productId, quantity) {
    const cart = getGuestCart();
    const itemIndex = cart.items.findIndex(item => item.productId === productId);
    if (itemIndex >= 0) {
        if (quantity <= 0) {
            cart.items.splice(itemIndex, 1);
        } else {
            cart.items[itemIndex].quantity = quantity;
        }
        saveGuestCart(cart);
    }
}

$(document).ready(function() {
    const token = localStorage.getItem('token');
    
    // Set token for all AJAX requests if logged in
    if (token) {
        $.ajaxSetup({
            headers: {
                'x-auth-token': token
            }
        });
    }
    
    // Load cart on page load (works for both guest and logged-in users)
    loadCart();
    loadCartCount();
    loadDepartments();
    
    // Auto-open checkout modal if cart has items and URL has ?checkout parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('checkout') === 'true') {
        // Wait for cart to load, then open modal
        let checkCount = 0;
        const checkCart = setInterval(() => {
            checkCount++;
            const cartItems = $('#cartItems').children().length;
            const isEmptyCart = $('#emptyCart').is(':visible');
            
            if (cartItems > 0 && !isEmptyCart) {
                clearInterval(checkCart);
                $('#checkoutModal').modal('show');
            } else if (checkCount > 10 || isEmptyCart) {
                // Stop checking after 5 seconds or if cart is empty
                clearInterval(checkCart);
            }
        }, 500);
    }
    
    // Checkout button click
    $('#checkoutBtn').click(function() {
        const token = localStorage.getItem('token');
        // Show/hide guest customer fields based on login status
        if (!token) {
            $('#guestCustomerFields').show();
            $('#shippingName').attr('required', true);
            $('#guestEmail').attr('required', true);
        } else {
            $('#guestCustomerFields').hide();
            $('#shippingName').removeAttr('required');
            $('#guestEmail').removeAttr('required');
        }
        $('#checkoutModal').modal('show');
    });
    
    // Handle modal shown event - ensure proper focus management
    $('#checkoutModal').on('shown.bs.modal', function() {
        // Focus on first input for accessibility (after Bootstrap sets aria-hidden to false)
        setTimeout(() => {
            $('#shippingStreet').focus();
        }, 100);
    });
    
    // Handle modal hide event - remove focus before hiding to prevent aria-hidden warning
    $('#checkoutModal').on('hide.bs.modal', function() {
        // Remove focus from any focused element inside modal before it's hidden
        const focusedElement = $(this).find(':focus');
        if (focusedElement.length) {
            focusedElement.blur();
        }
    });
    
    // Same as shipping address checkbox - hide billing fields by default
    $('#billingAddressFields').hide();
    
    $('#sameAsShipping').change(function() {
        if ($(this).is(':checked')) {
            $('#billingAddressFields').hide();
            copyShippingToBilling();
        } else {
            $('#billingAddressFields').show();
        }
    });
    
    // Place order button
    $('#placeOrderBtn').click(function() {
        // Remove focus from button before hiding modal to prevent aria-hidden warning
        $(this).blur();
        placeOrder();
    });
});

async function loadCart() {
    const token = localStorage.getItem('token');
    
    // If not logged in, load guest cart
    if (!token) {
        const guestCart = getGuestCart();
        if (!guestCart.items || guestCart.items.length === 0) {
            $('#emptyCart').show();
            $('#cartContent').hide();
            return;
        }
        
        // Fetch product details for guest cart items
        const cartItems = [];
        for (const item of guestCart.items) {
            try {
                const product = await $.get(`/api/products/${item.productId}`);
                cartItems.push({
                    product: product,
                    productId: item.productId, // Preserve productId for guest cart
                    quantity: item.quantity,
                    price: item.price || product.price || 0,
                    discount: item.discount || product.discount || 0
                });
            } catch (error) {
                console.error(`Failed to load product ${item.productId}:`, error);
            }
        }
        
        if (cartItems.length === 0) {
            $('#emptyCart').show();
            $('#cartContent').hide();
            return;
        }
        
        renderCartItems(cartItems);
        updateCartSummary({ items: cartItems });
        return;
    }
    
    // Load user cart from API
    $.get('/api/cart')
        .done(function(data) {
            console.log('Cart data loaded:', data);
            console.log('Cart items count:', data.items ? data.items.length : 0);
            
            if (!data.items || data.items.length === 0) {
                console.log('Cart is empty');
                $('#emptyCart').show();
                $('#cartContent').hide();
                return;
            }
            
            // Log each item to debug
            data.items.forEach((item, index) => {
                console.log(`Cart item ${index}:`, {
                    product: item.product,
                    productId: item.product?._id || item.product?.id,
                    quantity: item.quantity,
                    price: item.price
                });
            });
            
            renderCartItems(data.items);
            updateCartSummary(data);
        })
        .fail(function(error) {
            console.error('Error loading cart:', error);
            console.error('Error response:', error.responseJSON);
            if (error.status === 401) {
                // Try loading guest cart if API fails
                const guestCart = getGuestCart();
                if (guestCart.items && guestCart.items.length > 0) {
                    loadCart(); // Recursive call will load guest cart
                } else {
                    $('#emptyCart').show();
                    $('#cartContent').hide();
                }
            } else {
                const errorMsg = error.responseJSON?.message || 'Error loading cart. Please try again.';
                showAlert(errorMsg, 'danger');
            }
        });
}

function renderCartItems(items) {
    let html = '';
    let validItemsCount = 0;
    
    if (!items || items.length === 0) {
        $('#emptyCart').show();
        $('#cartContent').hide();
        return;
    }
    
    items.forEach(function(item) {
        const product = item.product;
        if (!product) {
            console.warn('Cart item missing product, skipping:', item);
            return;
        }
        
        validItemsCount++;
        
        // Handle product ID - could be string or object (for user cart) or productId (for guest cart)
        let productId = '';
        if (item.productId) {
            // Guest cart item
            productId = typeof item.productId === 'string' ? item.productId : item.productId.toString();
        } else if (product._id) {
            // User cart item
            productId = typeof product._id === 'string' ? product._id : product._id.toString();
        } else if (product.id) {
            productId = typeof product.id === 'string' ? product.id : product.id.toString();
        }
        
        if (!productId) {
            console.warn('Product missing ID:', product, item);
            return;
        }
        
        const productName = product.name || 'Unknown Product';
        const productImage = product.image || (product.imageUpload && product.imageUpload.url) || 'https://via.placeholder.com/100';
        const itemPrice = item.price || 0;
        const discount = item.discount || 0;
        const quantity = item.quantity || 1;
        const finalPrice = itemPrice * (1 - discount / 100);
        const itemSubtotal = item.subtotal || (finalPrice * quantity);
        
        html += `
            <div class="cart-item" data-product-id="${productId}">
                <div class="row align-items-center">
                    <div class="col-md-2">
                        <img src="${productImage}" alt="${productName}" class="cart-item-image">
                    </div>
                    <div class="col-md-4">
                        <h6>${productName}</h6>
                        ${product.category?.name ? `<small class="text-muted">${product.category.name}</small>` : ''}
                    </div>
                    <div class="col-md-2">
                        <div class="price-info">
                            <div>Rs. ${finalPrice.toFixed(2)}</div>
                            ${discount > 0 ? `<small class="text-muted text-decoration-line-through">Rs. ${itemPrice.toFixed(2)}</small>` : ''}
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="quantity-controls">
                            <button class="quantity-btn decrease-quantity" data-product-id="${productId}" type="button">
                                <i class="fas fa-minus"></i>
                            </button>
                            <input type="number" class="form-control quantity-input" value="${quantity}" min="1" data-product-id="${productId}" readonly>
                            <button class="quantity-btn increase-quantity" data-product-id="${productId}" type="button">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
                    <div class="col-md-1 text-end">
                        <div class="item-subtotal mb-2">
                            <strong>Rs. ${itemSubtotal.toFixed(2)}</strong>
                        </div>
                        <button class="btn btn-sm btn-danger remove-item" data-product-id="${productId}" type="button">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    if (validItemsCount === 0) {
        console.warn('No valid items to render');
        $('#emptyCart').show();
        $('#cartContent').hide();
        return;
    }
    
    $('#cartItems').html(html);
    $('#emptyCart').hide();
    $('#cartContent').show();
    
    // Add event handlers
    $('.increase-quantity').click(function() {
        const productId = $(this).data('product-id');
        updateQuantity(productId, 1);
    });
    
    $('.decrease-quantity').click(function() {
        const productId = $(this).data('product-id');
        updateQuantity(productId, -1);
    });
    
    $('.quantity-input').change(function() {
        const productId = $(this).data('product-id');
        const newQuantity = parseInt($(this).val(), 10);
        if (newQuantity > 0) {
            setQuantity(productId, newQuantity);
        }
    });
    
    $('.remove-item').click(function() {
        const productId = $(this).data('product-id');
        removeItem(productId);
    });
}

function updateQuantity(productId, change) {
    const token = localStorage.getItem('token');
    
    // Handle guest cart
    if (!token) {
        const guestCart = getGuestCart();
        const item = guestCart.items.find(i => i.productId === productId);
        if (!item) return;
        
        const newQuantity = item.quantity + change;
        if (newQuantity < 1) {
            removeItem(productId);
        } else {
            updateGuestCartQuantity(productId, newQuantity);
            loadCart();
            loadCartCount();
        }
        return;
    }
    
    // Handle user cart
    $.get('/api/cart')
        .done(function(data) {
            const item = data.items.find(i => {
                const pid = i.product._id || i.product.id;
                const pidStr = typeof pid === 'string' ? pid : pid.toString();
                return pidStr === productId;
            });
            if (!item) return;
            
            const newQuantity = item.quantity + change;
            if (newQuantity < 1) {
                removeItem(productId);
            } else {
                setQuantity(productId, newQuantity);
            }
        })
        .fail(function(error) {
            console.error('Error loading cart for quantity update:', error);
        });
}

function setQuantity(productId, quantity) {
    const token = localStorage.getItem('token');
    
    // Handle guest cart
    if (!token) {
        updateGuestCartQuantity(productId, quantity);
        loadCart();
        loadCartCount();
        return;
    }
    
    // Handle user cart
    $.ajax({
        url: '/api/cart/update',
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({ productId, quantity })
    })
    .done(function(data) {
        loadCart();
        loadCartCount();
    })
    .fail(function(error) {
        console.error('Error updating quantity:', error);
        const message = error.responseJSON?.message || 'Error updating quantity';
        showAlert(message, 'danger');
    });
}

function removeItem(productId) {
    if (!confirm('Are you sure you want to remove this item from cart?')) {
        return;
    }
    
    const token = localStorage.getItem('token');
    
    // Handle guest cart
    if (!token) {
        removeFromGuestCart(productId);
        loadCart();
        loadCartCount();
        showAlert('Item removed from cart', 'success');
        return;
    }
    
    // Handle user cart
    $.ajax({
        url: `/api/cart/remove/${productId}`,
        method: 'DELETE'
    })
    .done(function(data) {
        loadCart();
        loadCartCount();
        showAlert('Item removed from cart', 'success');
    })
    .fail(function(error) {
        console.error('Error removing item:', error);
        showAlert('Error removing item', 'danger');
    });
}

function updateCartSummary(data) {
    // Calculate subtotal from items if total is not provided
    let subtotal = data.total || 0;
    if (subtotal === 0 && data.items) {
        subtotal = data.items.reduce((sum, item) => {
            const itemPrice = item.price || 0;
            const discount = item.discount || 0;
            const quantity = item.quantity || 1;
            const finalPrice = itemPrice * (1 - discount / 100);
            return sum + (finalPrice * quantity);
        }, 0);
    }
    
    const shipping = 0; // Can be calculated based on address
    const tax = 0; // Can be calculated
    const total = subtotal + shipping + tax;
    
    $('#cartSubtotal').text('Rs. ' + subtotal.toFixed(2));
    $('#cartShipping').text('Rs. ' + shipping.toFixed(2));
    $('#cartTax').text('Rs. ' + tax.toFixed(2));
    $('#cartTotal').text('Rs. ' + total.toFixed(2));
}

function copyShippingToBilling() {
    $('#billingStreet').val($('#shippingStreet').val());
    $('#billingCity').val($('#shippingCity').val());
    $('#billingState').val($('#shippingState').val());
    $('#billingZipCode').val($('#shippingZipCode').val());
    $('#billingCountry').val($('#shippingCountry').val());
}

async function placeOrder() {
    const token = localStorage.getItem('token');
    const isGuest = !token;
    
    // Validate form
    if (!$('#checkoutForm')[0].checkValidity()) {
        $('#checkoutForm')[0].reportValidity();
        return;
    }
    
    // Copy billing address if same as shipping
    if ($('#sameAsShipping').is(':checked')) {
        copyShippingToBilling();
    }
    
    const shippingAddress = {
        street: $('#shippingStreet').val(),
        city: $('#shippingCity').val(),
        state: $('#shippingState').val(),
        zipCode: $('#shippingZipCode').val(),
        country: $('#shippingCountry').val(),
        phone: $('#shippingPhone').val()
    };
    
    const billingAddress = {
        street: $('#billingStreet').val(),
        city: $('#billingCity').val(),
        state: $('#billingState').val(),
        zipCode: $('#billingZipCode').val(),
        country: $('#billingCountry').val()
    };
    
    let orderData;
    let apiUrl;
    
    if (isGuest) {
        // Guest checkout - get items from guest cart
        const guestCart = getGuestCart();
        if (!guestCart.items || guestCart.items.length === 0) {
            showAlert('Your cart is empty. Please add items to your cart.', 'warning');
            return;
        }
        
        // Get guest customer info from form
        const guestCustomer = {
            name: $('#shippingName').val() || 'Guest Customer',
            email: $('#guestEmail').val() || '',
            phone: $('#shippingPhone').val() || ''
        };
        
        // Validate guest customer info
        if (!guestCustomer.email || !guestCustomer.phone) {
            showAlert('Please provide your email and phone number for order confirmation.', 'warning');
            return;
        }
        
        // Prepare items for guest order
        const items = guestCart.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            discount: item.discount || 0
        }));
        
        orderData = {
            items: items,
            shippingAddress: shippingAddress,
            billingAddress: billingAddress,
            paymentMethod: $('#paymentMethod').val(),
            notes: $('#orderNotes').val() || '',
            guestCustomer: guestCustomer
        };
        
        apiUrl = '/api/orders/guest';
    } else {
        // Authenticated user checkout
        orderData = {
            shippingAddress: shippingAddress,
            billingAddress: billingAddress,
            paymentMethod: $('#paymentMethod').val(),
            notes: $('#orderNotes').val() || ''
        };
        
        apiUrl = '/api/orders';
    }
    
    try {
        const response = await $.ajax({
            url: apiUrl,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(orderData),
            headers: token ? { 'x-auth-token': token } : {}
        });
        
        // Remove focus from button before hiding modal
        $('#placeOrderBtn').blur();
        // Hide modal
        $('#checkoutModal').modal('hide');
        showAlert('Order placed successfully! Order Number: ' + (response.orderNumber || response._id), 'success');
        
        // Clear cart and reload
        if (isGuest) {
            // Clear guest cart
            localStorage.removeItem('guestCart');
        }
        
        setTimeout(() => {
            loadCart();
            loadCartCount();
        }, 2000);
        
        // Optionally redirect to order confirmation page
        // window.location.href = `/order/${response._id}`;
        
    } catch (error) {
        console.error('Error placing order:', error);
        console.error('Error details:', {
            status: error.status,
            statusText: error.statusText,
            responseJSON: error.responseJSON,
            responseText: error.responseText
        });
        
        let message = 'Error placing order. Please try again.';
        
        if (error.responseJSON) {
            message = error.responseJSON.message || message;
            if (error.responseJSON.requestId) {
                console.error('Request ID for support:', error.responseJSON.requestId);
                message += ` (Request ID: ${error.responseJSON.requestId})`;
            }
        } else if (error.status === 0) {
            message = 'Network error. Please check your internet connection.';
        } else if (error.status === 500) {
            message = 'Server error. Please try again later or contact support.';
        } else if (error.status === 400) {
            message = error.responseText || 'Invalid request. Please check your information.';
        }
        
        showAlert(message, 'danger');
    }
}

function loadCartCount() {
    const token = localStorage.getItem('token');
    
    // Show guest cart count if not logged in
    if (!token) {
        const guestCount = getGuestCartCount();
        $('.cart-count').text(guestCount);
        return;
    }
    
    // Load user cart count
    $.get('/api/cart/count')
        .done(function(data) {
            $('.cart-count').text(data.count || 0);
        })
        .fail(function() {
            // Fallback to guest cart count if API fails
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
                menu.html(departments.map(dept => `
                    <li><a class="dropdown-item" href="/department/${dept._id}">${dept.name}</a></li>
                `).join(''));
            }
            
            if (footer.length) {
                footer.html(departments.map(dept => `
                    <li><a href="/department/${dept._id}">${dept.name}</a></li>
                `).join(''));
            }
        })
        .fail(function() {
            console.error('Error loading departments');
        });
}

function showAlert(message, type) {
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert" style="position: fixed; top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    $('body').append(alertHtml);
    
    setTimeout(function() {
        $('.alert').alert('close');
    }, 5000);
}

