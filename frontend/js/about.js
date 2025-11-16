$(document).ready(function() {
    loadCartCount();
    loadDepartments();
});

function loadCartCount() {
    const token = localStorage.getItem('token');
    if (!token) return;

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
            $('.cart-count').text('0');
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

