// Guest cart helper functions (same as main.js)
function getGuestCart() {
    try {
        const cartStr = localStorage.getItem('guestCart');
        return cartStr ? JSON.parse(cartStr) : { items: [] };
    } catch (e) {
        return { items: [] };
    }
}

 $(document).ready(function() {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = '/admin';
        return;
    }
    
    // Login form submission
    $('#loginForm').submit(function(e) {
        e.preventDefault();
        
        const email = $('#email').val();
        const password = $('#password').val();
        
        // Show loading state
        const submitBtn = $(this).find('button[type="submit"]');
        const originalText = submitBtn.text();
        submitBtn.text('Logging in...').prop('disabled', true);
        
        // Make API call
        $.ajax({
            url: '/api/auth/login',
            method: 'POST',
            data: {
                email: email,
                password: password
            },
            success: async function(response) {
                // Store token
                localStorage.setItem('token', response.token);
                
                // Merge guest cart with user cart (for regular users)
                // Note: This page redirects to /admin, but some users might login here
                try {
                    const guestCart = getGuestCart();
                    if (guestCart && guestCart.items && guestCart.items.length > 0) {
                        // Add each item from guest cart to user cart
                        for (const item of guestCart.items) {
                            try {
                                await $.ajax({
                                    url: '/api/cart/add',
                                    method: 'POST',
                                    headers: {
                                        'x-auth-token': response.token,
                                        'Content-Type': 'application/json'
                                    },
                                    data: JSON.stringify({
                                        productId: item.productId,
                                        quantity: item.quantity
                                    })
                                });
                            } catch (error) {
                                console.error(`Failed to add product ${item.productId} to cart:`, error);
                            }
                        }
                        // Clear guest cart after successful merge
                        localStorage.removeItem('guestCart');
                    }
                } catch (error) {
                    console.error('Failed to merge guest cart:', error);
                }
                
                // Redirect to admin dashboard
                window.location.href = '/admin';
            },
            error: function(xhr) {
                // Show error message
                let errorMessage = 'Login failed. Please try again.';
                
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                }
                
                showAlert(errorMessage, 'danger');
                
                // Reset button state
                submitBtn.text(originalText).prop('disabled', false);
            }
        });
    });
});

// Alert function
function showAlert(message, type) {
    // Remove any existing alerts
    $('.alert').remove();
    
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    $('.login-body').prepend(alertHtml);
    
    // Auto-dismiss after 5 seconds
    setTimeout(function() {
        const alertElement = document.querySelector('.alert');
        if (alertElement && typeof bootstrap !== 'undefined') {
            const bsAlert = new bootstrap.Alert(alertElement);
            bsAlert.close();
        } else {
            // Fallback: just remove the alert
            $('.alert').fadeOut(300, function() {
                $(this).remove();
            });
        }
    }, 5000);
}