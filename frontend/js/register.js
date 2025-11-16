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
        window.location.href = '/';
        return;
    }
    
    // Registration form submission
    $('#registerForm').submit(function(e) {
        e.preventDefault();
        
        const name = $('#name').val().trim();
        const email = $('#email').val().trim();
        const phone = $('#phone').val().trim();
        const password = $('#password').val();
        const confirmPassword = $('#confirmPassword').val();
        
        // Validation
        if (!name) {
            showAlert('Please enter your full name', 'danger');
            return;
        }
        
        if (!email) {
            showAlert('Please enter your email address', 'danger');
            return;
        }
        
        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showAlert('Please enter a valid email address', 'danger');
            return;
        }
        
        if (password.length < 6) {
            showAlert('Password must be at least 6 characters long', 'danger');
            return;
        }
        
        if (password !== confirmPassword) {
            showAlert('Passwords do not match', 'danger');
            return;
        }
        
        // Show loading state
        const submitBtn = $(this).find('button[type="submit"]');
        const originalText = submitBtn.text();
        submitBtn.text('Registering...').prop('disabled', true);
        
        // Prepare data
        const registrationData = {
            name: name,
            email: email,
            password: password
        };
        
        // Add phone if provided
        if (phone) {
            registrationData.phone = phone;
        }
        
        // Make API call
        $.ajax({
            url: '/api/auth/register',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(registrationData),
            success: async function(response) {
                // Store token
                if (response.token) {
                    localStorage.setItem('token', response.token);
                }
                
                // Merge guest cart with user cart
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
                
                // Show success message
                showAlert('Registration successful! Redirecting...', 'success');
                
                // Redirect to home page after 1.5 seconds
                setTimeout(function() {
                    window.location.href = '/';
                }, 1500);
            },
            error: function(xhr) {
                // Show error message
                let errorMessage = 'Registration failed. Please try again.';
                
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                } else if (xhr.status === 400) {
                    errorMessage = 'Invalid registration data. Please check your inputs.';
                } else if (xhr.status === 500) {
                    errorMessage = 'Server error. Please try again later.';
                }
                
                showAlert(errorMessage, 'danger');
                
                // Reset button state
                submitBtn.text(originalText).prop('disabled', false);
            }
        });
    });
    
    // Real-time password confirmation validation
    $('#confirmPassword').on('input', function() {
        const password = $('#password').val();
        const confirmPassword = $(this).val();
        
        if (confirmPassword && password !== confirmPassword) {
            $(this).addClass('is-invalid');
        } else {
            $(this).removeClass('is-invalid');
        }
    });
});

// Alert function
function showAlert(message, type) {
    // Remove any existing alerts
    $('.alert').remove();
    
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    $('.login-body').prepend(alertHtml);
    
    // Auto-dismiss after 5 seconds (except for success messages)
    if (type !== 'success') {
        setTimeout(function() {
            $('.alert').alert('close');
        }, 5000);
    }
}

