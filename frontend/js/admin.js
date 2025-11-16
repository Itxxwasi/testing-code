 $(document).ready(function() {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    // Set token for all AJAX requests
    $.ajaxSetup({
        headers: {
            'x-auth-token': token
        }
    });
    
    // Fix aria-hidden accessibility issue for Bootstrap 5 modals
    // Ensure aria-hidden is properly managed when modals are shown/hidden
    $(document).on('show.bs.modal', '.modal', function(event) {
        const modal = event.target;
        if (modal) {
            // Remove aria-hidden before modal is shown
            $(modal).removeAttr('aria-hidden');
        }
    });
    
    $(document).on('shown.bs.modal', '.modal', function(event) {
        const modal = event.target;
        if (modal) {
            // Ensure aria-hidden is false when modal is fully shown
            $(modal).removeAttr('aria-hidden');
            $(modal).attr('aria-hidden', 'false');
        }
    });
    
    $(document).on('hide.bs.modal', '.modal', function(event) {
        const modal = event.target;
        if (modal) {
            // Keep modal accessible during hide transition
            // Don't set aria-hidden until fully hidden
        }
    });
    
    $(document).on('hidden.bs.modal', '.modal', function(event) {
        const modal = event.target;
        if (modal) {
            // Set aria-hidden to true only after modal is fully hidden
            $(modal).attr('aria-hidden', 'true');
        }
    });
    
    // Verify user is admin before loading dashboard
    verifyAdminAccess();
    
    // Sidebar navigation
    $('.sidebar-menu a').click(function(e) {
        e.preventDefault();
        
        // Remove active class from all links and sections
        $('.sidebar-menu li').removeClass('active');
        $('.content-section').removeClass('active');
        
        // Add active class to clicked link
        $(this).parent().addClass('active');
        
        // Show corresponding section
        const sectionId = $(this).attr('href').substring(1) + '-section';
        $(`#${sectionId}`).addClass('active');

        // On small screens, close the sidebar after selecting a menu item
        if (window.innerWidth <= 991) {
            $('.sidebar').removeClass('active');
        }
        
        // Load data for the section
        loadSectionData(sectionId);
    });

    // Sidebar toggle for mobile/tablet
    $('#sidebarToggle').on('click', function() {
        $('.sidebar').toggleClass('active');
    });
    
    // Logout
    $('#logout, #logoutLink').click(function(e) {
        e.preventDefault();
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });
    
    // Department handlers
    $('#add-department-btn').click(function() {
        resetDepartmentForm();
        $('#departmentModalTitle').text('Add Department');
        $('#departmentModal').modal('show');
    });
    
    $('#saveDepartment').click(function() {
        saveDepartment();
    });
    
    // Category handlers
    $('#add-category-btn').click(function() {
        resetCategoryForm();
        loadDepartmentsToSelect('#categoryDepartment');
        $('#categoryModalTitle').text('Add Category');
        $('#categoryModal').modal('show');
    });
    
    $('#saveCategory').click(function() {
        saveCategory();
    });
    
    // Product handlers
    $('#add-product-btn').click(function() {
        resetProductForm();
        loadDepartmentsToSelect('#productDepartment');
        $('#productModalTitle').text('Add Product');
        $('#productModal').modal('show');
    });
    
    $('#saveProduct').click(function() {
        saveProduct();
    });
    
    // Toggle custom collection name input
    $('#toggleCustomCollection').click(function() {
        const customInput = $('#productCollectionCustom');
        const selectInput = $('#productCollection');
        if (customInput.is(':visible')) {
            customInput.hide();
            selectInput.show();
            $(this).text('Use custom collection name');
        } else {
            customInput.show();
            selectInput.hide();
            $(this).text('Use preset collections');
        }
    });
    
    // Sync custom collection to select when typing
    $('#productCollectionCustom').on('input', function() {
        if ($(this).val()) {
            $('#productCollection').val('');
        }
    });
    
    // Sync select to custom when changed
    $('#productCollection').change(function() {
        if ($(this).val()) {
            $('#productCollectionCustom').val('');
        }
    });
    
    // Product type filter dropdown handler (replaces filter buttons)
    $('#filter-type').on('change', function() {
        currentProductFilter = $(this).val() || '';
        console.log('Product type filter changed to:', currentProductFilter);
        loadProducts(1);
    });
    
    // Product search handler
    let searchTimeout;
    $('#product-search-input').on('input', function() {
        clearTimeout(searchTimeout);
        const searchValue = $(this).val().trim();
        searchTimeout = setTimeout(function() {
            currentProductSearch = searchValue;
            loadProducts(1);
        }, 500); // Debounce search by 500ms
    });
    
    // Apply advanced filters
    $('#apply-filters-btn').click(function() {
        // Get product type filter
        currentProductFilter = $('#filter-type').val() || '';
        // Get other filters
        currentProductFilters.category = $('#filter-category').val() || '';
        currentProductFilters.department = $('#filter-department').val() || '';
        currentProductFilters.minPrice = $('#filter-min-price').val() || '';
        currentProductFilters.maxPrice = $('#filter-max-price').val() || '';
        currentProductFilters.minDiscount = $('#filter-min-discount').val() || '';
        currentProductFilters.section = $('#filter-section').val() || '';
        console.log('Applied filters:', {
            type: currentProductFilter,
            ...currentProductFilters
        });
        loadProducts(1);
    });
    
    // Also apply section filter when dropdown changes directly
    $('#filter-section').on('change', function() {
        currentProductFilters.section = $(this).val() || '';
        console.log('Section filter changed to:', currentProductFilters.section);
        loadProducts(1);
    });
    
    // Clear all filters
    $('#clear-filters-btn').click(function() {
        currentProductFilter = '';
        currentProductSearch = '';
        currentProductFilters = {
            category: '',
            department: '',
            minPrice: '',
            maxPrice: '',
            minDiscount: '',
            section: ''
        };
        
        // Reset UI
        $('#product-search-input').val('');
        $('#filter-type').val('');
        $('#filter-category').val('');
        $('#filter-department').val('');
        $('#filter-min-price').val('');
        $('#filter-max-price').val('');
        $('#filter-min-discount').val('');
        $('#filter-section').val('');
        
        loadProducts(1);
    });
    
    // Slider handlers
    $('#add-slider-btn').click(function() {
        resetSliderForm();
        $('#sliderModalTitle').text('Add Slider');
        $('#sliderModal').modal('show');
    });
    
    $('#saveSlider').click(function() {
        saveSlider();
    });
    
    // Banner handlers
    $('#add-banner-btn').click(function() {
        resetBannerForm();
        $('#bannerModalTitle').text('Add Banner');
        $('#bannerModal').modal('show');
    });
    
    $('#saveBanner').click(function() {
        saveBanner();
    });
    
// Video Banner handlers
$('#add-video-banner-btn').click(function() {
    resetVideoBannerForm();
    $('#videoBannerModalTitle').text('Add Video Banner');
    $('#videoBannerModal').modal('show');
});

$('#add-video-banner-to-homepage-btn').click(async function() {
    try {
        // First check if there are any active video banners
        const response = await $.get('/api/admin/video-banners');
        console.log('Video banners response for homepage:', response);
        
        // Handle different response formats
        const videoBanners = Array.isArray(response) ? response : (response.videoBanners || response.data || []);
        
        if (!Array.isArray(videoBanners)) {
            console.error('Invalid video banners response format:', response);
            showAlert('Error: Invalid response format from server. Please check console for details.', 'danger');
            return;
        }
        
        const activeBanners = videoBanners.filter(b => b.isActive);
        
        if (activeBanners.length === 0) {
            showAlert('No active video banners found. Please create and activate a video banner first.', 'warning');
            return;
        }
        
        // Check if a video banner homepage section already exists
        const existingSections = await $.get('/api/homepage-sections');
        const videoBannerSection = existingSections.find(s => s.type === 'videoBanner' && s.isActive);
        
        if (videoBannerSection) {
            if (confirm('A video banner homepage section already exists. Do you want to activate and publish it instead?')) {
                // Activate and publish existing section
                await $.ajax({
                    url: `/api/homepage-sections/${videoBannerSection._id}`,
                    method: 'PUT',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        isActive: true,
                        isPublished: true
                    })
                });
                showAlert('Video banner section activated and published! It will now appear on the homepage.', 'success');
                loadHomepageSections();
                // Switch to homepage sections tab
                $('.sidebar-menu a[href="#homepage-sections"]').click();
                return;
            }
        }
        
        // Create new homepage section for video banner
        const firstBanner = activeBanners[0];
        const sectionName = firstBanner.title || 'Video Banner';
        
        const sectionPayload = {
            name: sectionName,
            type: 'videoBanner',
            title: firstBanner.title || undefined,
            description: firstBanner.description || undefined,
            config: {
                videoBannerId: firstBanner._id
            },
            ordering: 0,
            isActive: true,
            isPublished: true,
            displayOn: {
                desktop: true,
                tablet: true,
                mobile: true
            }
        };
        
        await $.ajax({
            url: '/api/homepage-sections',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(sectionPayload)
        });
        
        showAlert('Video banner section added to homepage successfully! It will appear on the main page.', 'success');
        loadHomepageSections();
        
        // Switch to homepage sections tab to show the new section
        setTimeout(function() {
            $('.sidebar-menu a[href="#homepage-sections"]').click();
        }, 500);
        
    } catch (error) {
        console.error('Error adding video banner to homepage:', error);
        let errorMessage = 'Error adding video banner to homepage';
        if (error.responseJSON && error.responseJSON.message) {
            errorMessage = error.responseJSON.message;
        }
        showAlert(errorMessage, 'danger');
    }
});

$('#videoBannerType').change(function() {
    const type = $(this).val();
    if (type === 'file') {
        $('#videoBannerFileUploadDiv').show();
        $('#videoBannerUrl').prop('required', false);
    } else {
        $('#videoBannerFileUploadDiv').hide();
        $('#videoBannerUrl').prop('required', true);
    }
});

$('#saveVideoBanner').click(function() {
    saveVideoBanner();
});

// Setup video banner poster preview
initImageField({
    urlInput: '#videoBannerPoster',
    fileInput: '#videoBannerPosterFile',
    preview: '#videoBannerPosterPreview'
});

// Brand handlers
$('#add-brand-btn').click(function() {
    resetBrandForm();
    $('#brandModalTitle').text('Add Brand');
    $('#brandModal').modal('show');
});
    
    $('#saveBrand').click(function() {
        saveBrand();
    });
    
    // Setup brand image preview
    initImageField({ urlInput: '#brandImage', fileInput: '#brandImageFile', preview: '#brandImagePreview' });
    
    // Homepage Section handlers
    $('#add-homepage-section-btn').click(function() {
        resetHomepageSectionForm();
        $('#homepageSectionModalTitle').text('Add Homepage Section');
        $('#homepageSectionModal').modal('show');
    });
    
    $('#saveHomepageSection').click(function() {
        saveHomepageSection();
    });
    
    $('#homepageSectionType').change(function() {
        loadHomepageSectionConfig($(this).val());
    });
    
    $('#reorder-homepage-sections-btn').click(function() {
        toggleHomepageSectionReorder();
    });
    
    // LEGACY SECTIONS - NO LONGER USED
    // $('#add-section-btn').click(function() {
    //     resetSectionForm();
    //     $('#sectionModalTitle').text('Add Section');
    //     $('#sectionModal').modal('show');
    // });
    
    // $('#saveSection').click(function() {
    //     saveSection();
    // });
    
    // Order handlers
    $('#orderStatusFilter').change(function() {
        loadOrders(1);
    });
    
    $('#confirmOrderBtn').click(function() {
        const orderId = $(this).data('order-id');
        confirmOrder(orderId);
    });
    
    $('#updateOrderStatusBtn').click(function() {
        const orderId = $(this).data('order-id');
        const currentStatus = $(this).data('current-status');
        showOrderStatusModal(orderId, currentStatus);
    });
    
    $('#orderStatusSelect').change(function() {
        if ($(this).val() === 'cancelled') {
            $('#cancelledReasonDiv').show();
        } else {
            $('#cancelledReasonDiv').hide();
        }
    });
    
    $('#saveOrderStatus').click(function() {
        updateOrderStatus();
    });
    
    // Report handlers
    $('#reportPeriod').change(function() {
        if ($(this).val() === 'custom') {
            $('#customDateRange').show();
            $('#customDateRangeEnd').show();
        } else {
            $('#customDateRange').hide();
            $('#customDateRangeEnd').hide();
        }
    });
    
    $('#reportDepartment').change(function() {
        const departmentId = $(this).val();
        loadReportCategories(departmentId);
        loadReportProducts(null, departmentId);
    });
    
    $('#reportCategory').change(function() {
        const categoryId = $(this).val();
        const departmentId = $('#reportDepartment').val();
        loadReportProducts(categoryId, departmentId);
    });
    
    $('#generateReport').click(function() {
        generateSalesReport();
    });
    
    $('#exportReport').click(function() {
        exportReport();
    });
    
    // Department change handler for product form
    $('#productDepartment').change(function() {
        const departmentId = $(this).val();
        loadCategoriesToSelect('#productCategory', departmentId);
    });

    // Setup image previews
    initImageField({ urlInput: '#departmentImage', fileInput: '#departmentImageFile', preview: '#departmentImagePreview' });
    initImageField({ urlInput: '#categoryImage', fileInput: '#categoryImageFile', preview: '#categoryImagePreview' });
    initImageField({ urlInput: '#productImage', fileInput: '#productImageFile', preview: '#productImagePreview' });
    initImageField({ urlInput: '#sliderImage', fileInput: '#sliderImageFile', preview: '#sliderImagePreview' });
    initImageField({ urlInput: '#bannerImage', fileInput: '#bannerImageFile', preview: '#bannerImagePreview' });

    setImagePreview('#departmentImagePreview', null);
    setImagePreview('#categoryImagePreview', null);
    setImagePreview('#productImagePreview', null);
    setImagePreview('#sliderImagePreview', null);
    setImagePreview('#bannerImagePreview', null);
});

// Verify admin access
function verifyAdminAccess() {
    $.get('/api/admin/dashboard')
        .done(function(data) {
            // User is admin, load dashboard
            loadDashboardData();
        })
        .fail(function(xhr) {
            if (xhr.status === 403) {
                // User is not admin
                const response = xhr.responseJSON || {};
                showAlert('Access denied. Admin privileges required. You are logged in as a regular user.', 'danger');
                
                // Clear token and redirect after 3 seconds
                setTimeout(function() {
                    localStorage.removeItem('token');
                    window.location.href = '/';
                }, 3000);
            } else if (xhr.status === 401) {
                // Token is invalid
                showAlert('Session expired. Please login again.', 'warning');
                setTimeout(function() {
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                showAlert('Error accessing admin dashboard. Please try again.', 'danger');
            }
        });
}

// Functions to load data
function loadDashboardData() {
    $.get('/api/admin/dashboard')
        .done(function(data) {
            $('#departments-count').text(data.departments);
            $('#categories-count').text(data.categories);
            $('#products-count').text(data.products);
            $('#users-count').text(data.users);
        })
        .fail(function(xhr) {
            const message = xhr.responseJSON?.message || 'Error loading dashboard data';
            if (xhr.status === 403) {
                showAlert('Access denied. Admin privileges required.', 'danger');
            } else {
                showAlert(message, 'danger');
            }
        });
}

function loadSectionData(sectionId) {
    switch(sectionId) {
        case 'departments-section':
            loadDepartments();
            break;
        case 'categories-section':
            loadCategories();
            break;
        case 'products-section':
            loadProducts(1);
            loadFilterCategories();
            loadFilterDepartments();
            // Sections filter is static - no need to load
            break;
        case 'sliders-section':
            loadSliders();
            break;
        case 'banners-section':
            loadBanners();
            break;
        case 'video-banners-section':
            loadVideoBanners();
            break;
        case 'brands-section':
            loadBrands();
            break;
        case 'homepage-sections-section':
            loadHomepageSections();
            break;
        // LEGACY SECTIONS - NO LONGER USED
        // case 'sections-section':
        //     loadSections();
        //     break;
        case 'users-section':
            loadUsers(1);
            break;
        case 'orders-section':
            loadOrders(1);
            break;
        case 'reports-section':
            loadReportFilters();
            break;
    }
}

function loadDepartments() {
    $.get('/api/admin/departments')
        .done(function(departments) {
            let html = '';
            
            departments.forEach(function(dept) {
                const imageUrl = resolveItemImage(dept) || IMAGE_PLACEHOLDER;
                html += `
                    <tr>
                        <td>${dept.name}</td>
                        <td>${dept.description || ''}</td>
                        <td><img src="${imageUrl}" alt="${dept.name}" class="table-thumb"></td>
                        <td>
                            <span class="badge ${dept.isActive ? 'bg-success' : 'bg-danger'}">
                                ${dept.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-primary btn-action edit-department" data-id="${dept._id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger btn-action delete-department" data-id="${dept._id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            $('#departments-table').html(html);
            
            // Add event handlers
            $('.edit-department').click(function() {
                const id = $(this).data('id');
                editDepartment(id);
            });
            
            $('.delete-department').click(function() {
                const id = $(this).data('id');
                deleteDepartment(id);
            });
        })
        .fail(function() {
            showAlert('Error loading departments', 'danger');
        });
}

function loadCategories() {
    $.get('/api/admin/categories')
        .done(function(categories) {
            let html = '';
            
            categories.forEach(function(cat) {
                const imageUrl = resolveItemImage(cat) || IMAGE_PLACEHOLDER;
                const departmentName = cat.department ? cat.department.name : 'N/A';
                html += `
                    <tr>
                        <td>${cat.name}</td>
                        <td>${departmentName}</td>
                        <td>${cat.description || ''}</td>
                        <td><img src="${imageUrl}" alt="${cat.name}" class="table-thumb"></td>
                        <td>
                            <span class="badge ${cat.isFeatured ? 'bg-primary' : 'bg-secondary'}">
                                ${cat.isFeatured ? 'Featured' : 'Regular'}
                            </span>
                        </td>
                        <td>
                            <span class="badge ${cat.isActive ? 'bg-success' : 'bg-danger'}">
                                ${cat.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-primary btn-action edit-category" data-id="${cat._id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger btn-action delete-category" data-id="${cat._id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            $('#categories-table').html(html);
            
            // Add event handlers
            $('.edit-category').click(function() {
                const id = $(this).data('id');
                editCategory(id);
            });
            
            $('.delete-category').click(function() {
                const id = $(this).data('id');
                deleteCategory(id);
            });
        })
        .fail(function() {
            showAlert('Error loading categories', 'danger');
        });
}

// Product filter state
let currentProductFilter = '';
let currentProductSearch = '';
let currentProductFilters = {
    category: '',
    department: '',
    minPrice: '',
    maxPrice: '',
    minDiscount: '',
    collection: ''
};

// Load categories for filter dropdown
function loadFilterCategories() {
    $.get('/api/admin/categories')
        .done(function(categories) {
            const select = $('#filter-category');
            select.html('<option value="">All Categories</option>');
            categories.forEach(function(category) {
                select.append(`<option value="${category._id}">${category.name}</option>`);
            });
        })
        .fail(function() {
            console.error('Error loading categories for filter');
        });
}

// Load departments for filter dropdown
function loadFilterDepartments() {
    $.get('/api/admin/departments')
        .done(function(departments) {
            const select = $('#filter-department');
            select.html('<option value="">All Departments</option>');
            departments.forEach(function(department) {
                select.append(`<option value="${department._id}">${department.name}</option>`);
            });
        })
        .fail(function() {
            console.error('Error loading departments for filter');
        });
}

// Sections filter is now static dropdown - no need to load dynamically

function loadProducts(page = 1) {
    // Prevent multiple simultaneous requests
    if (window.loadingProducts) {
        console.log('Products already loading, skipping...');
        return;
    }
    window.loadingProducts = true;
    
    // Build query parameters
    const params = {
        page: page,
        limit: 10
    };
    
    if (currentProductFilter) {
        params.filter = currentProductFilter;
    }
    
    if (currentProductSearch) {
        params.search = currentProductSearch;
    }
    
    if (currentProductFilters.category) {
        params.category = currentProductFilters.category;
    }
    
    if (currentProductFilters.department) {
        params.department = currentProductFilters.department;
    }
    
    if (currentProductFilters.minPrice) {
        params.minPrice = currentProductFilters.minPrice;
    }
    
    if (currentProductFilters.maxPrice) {
        params.maxPrice = currentProductFilters.maxPrice;
    }
    
    if (currentProductFilters.minDiscount) {
        params.minDiscount = currentProductFilters.minDiscount;
    }
    
    if (currentProductFilters.section) {
        params.section = currentProductFilters.section;
    }
    
    // Add timestamp to prevent caching
    params._t = Date.now();
    const queryString = new URLSearchParams(params).toString();
    console.log('Loading products with params:', params);
    console.log('Query string:', queryString);
    
    $.ajax({
        url: `/api/admin/products?${queryString}`,
        method: 'GET',
        cache: false,
        headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        }
    })
        .done(function(data) {
            window.loadingProducts = false; // Reset loading flag
            console.log('Products loaded:', data.products?.length || 0, 'products');
            if (currentProductFilters.section) {
                console.log('Filtered by section:', currentProductFilters.section);
            }
            let html = '';
            
            if (!data.products || data.products.length === 0) {
                html = '<tr><td colspan="11" class="text-center text-muted py-4">No products found. Try adjusting your filters.</td></tr>';
            } else {
                data.products.forEach(function(product) {
                const departmentName = product.department ? product.department.name : 'N/A';
                const categoryName = product.category ? product.category.name : 'N/A';
                // Show sections as badges
                const sections = product.sections && Array.isArray(product.sections) ? product.sections : [];
                const sectionsDisplay = sections.length > 0 
                    ? sections.map(s => `<span class="badge bg-info me-1">${s}</span>`).join('')
                    : '<span class="text-muted">-</span>';
                const finalPrice = product.discount > 0 
                    ? product.price * (1 - product.discount / 100) 
                    : product.price;
                const imageUrl = resolveItemImage(product) || IMAGE_PLACEHOLDER;
                
                html += `
                    <tr>
                        <td><img src="${imageUrl}" alt="${product.name}" class="table-thumb"></td>
                        <td>${product.name}</td>
                        <td>${departmentName}</td>
                        <td>${categoryName}</td>
                        <td>${sectionsDisplay}</td>
                        <td>Rs. ${finalPrice.toFixed(2)}</td>
                        <td>${product.discount}%</td>
                        <td>${product.stock}</td>
                        <td>
                            <span class="badge ${product.isFeatured ? 'bg-primary' : 'bg-secondary'}">
                                ${product.isFeatured ? 'Featured' : 'Regular'}
                            </span>
                        </td>
                        <td>
                            <!-- Backend already filters only active products, so always show Active here -->
                            <span class="badge bg-success">
                                Active
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-primary btn-action edit-product" data-id="${product._id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger btn-action delete-product" data-id="${product._id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
                });
            }
            
            $('#products-table').html(html);
            
            // Update result count
            const resultCount = data.total || data.products.length;
            const resultText = resultCount === 1 ? 'product' : 'products';
            let filterInfo = '';
            if (currentProductFilter || currentProductSearch || currentProductFilters.category || currentProductFilters.department) {
                filterInfo = ` (filtered)`;
            }
            $('#products-result-count').text(`Showing ${data.products.length} of ${resultCount} ${resultText}${filterInfo}`);
            
            // Add pagination
            let paginationHtml = '';
            
            if (data.currentPage > 1) {
                paginationHtml += `<li class="page-item"><a class="page-link" href="#" data-page="${data.currentPage - 1}">Previous</a></li>`;
            }
            
            for (let i = 1; i <= data.totalPages; i++) {
                paginationHtml += `
                    <li class="page-item ${i === data.currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" data-page="${i}">${i}</a>
                    </li>
                `;
            }
            
            if (data.currentPage < data.totalPages) {
                paginationHtml += `<li class="page-item"><a class="page-link" href="#" data-page="${data.currentPage + 1}">Next</a></li>`;
            }
            
            $('#products-pagination').html(paginationHtml);
            
            // Add event handlers
            $('.edit-product').click(function() {
                const id = $(this).data('id');
                editProduct(id);
            });
            
            $('.delete-product').click(function() {
                const id = $(this).data('id');
                deleteProduct(id);
            });
            
            $('.page-link').click(function(e) {
                e.preventDefault();
                const page = $(this).data('page');
                loadProducts(page);
            });
        })
        .fail(function(xhr, status, error) {
            window.loadingProducts = false; // Reset loading flag
            console.error('Error loading products:', {
                status: xhr.status,
                statusText: xhr.statusText,
                error: error,
                responseText: xhr.responseText
            });
            
            // Handle cache errors specifically (304 Not Modified)
            if (xhr.status === 304 || (error && error.toString().includes('CACHE'))) {
                console.warn('Cache error detected, retrying without cache...');
                // Clear browser cache for this URL and retry
                if (!window.cacheRetryCount) {
                    window.cacheRetryCount = 0;
                }
                window.cacheRetryCount++;
                
                if (window.cacheRetryCount < 3) {
                    // Retry with a new timestamp
                    setTimeout(function() {
                        params._t = Date.now() + Math.random();
                        const retryQueryString = new URLSearchParams(params).toString();
                        $.ajax({
                            url: `/api/admin/products?${retryQueryString}`,
                            method: 'GET',
                            cache: false,
                            headers: {
                                'Cache-Control': 'no-cache',
                                'Pragma': 'no-cache'
                            }
                        })
                        .done(function(data) {
                            window.cacheRetryCount = 0; // Reset on success
                            // Manually trigger the success handler
                            loadProducts(page);
                        })
                        .fail(function() {
                            window.cacheRetryCount = 0;
                            showAlert('Error loading products. Please refresh the page.', 'danger');
                        });
                    }, 100);
                } else {
                    window.cacheRetryCount = 0;
                    showAlert('Cache error. Please clear your browser cache or refresh the page.', 'warning');
                }
            } else {
                showAlert('Error loading products: ' + (error || xhr.statusText || 'Unknown error'), 'danger');
            }
        });
}

function loadSliders() {
    $.get('/api/admin/sliders')
        .done(function(sliders) {
            let html = '';
            
            sliders.forEach(function(slider) {
                const imageUrl = resolveItemImage(slider) || IMAGE_PLACEHOLDER;
                html += `
                    <tr>
                        <td>${slider.title}</td>
                        <td>${slider.description}</td>
                        <td><img src="${imageUrl}" alt="${slider.title}" class="table-thumb"></td>
                        <td>${slider.link}</td>
                        <td>${slider.order}</td>
                        <td>
                            <span class="badge ${slider.isActive ? 'bg-success' : 'bg-danger'}">
                                ${slider.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-primary btn-action edit-slider" data-id="${slider._id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger btn-action delete-slider" data-id="${slider._id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            $('#sliders-table').html(html);
            
            // Add event handlers
            $('.edit-slider').click(function() {
                const id = $(this).data('id');
                editSlider(id);
            });
            
            $('.delete-slider').click(function() {
                const id = $(this).data('id');
                deleteSlider(id);
            });
        })
        .fail(function() {
            showAlert('Error loading sliders', 'danger');
        });
}

function loadBanners() {
    $.get('/api/admin/banners')
        .done(function(banners) {
            let html = '';
            
            banners.forEach(function(banner) {
                const imageUrl = resolveItemImage(banner) || IMAGE_PLACEHOLDER;
                html += `
                    <tr>
                        <td>${banner.title}</td>
                        <td>${banner.description}</td>
                        <td><img src="${imageUrl}" alt="${banner.title}" class="table-thumb"></td>
                        <td>${banner.position}</td>
                        <td>
                            <span class="badge ${banner.isActive ? 'bg-success' : 'bg-danger'}">
                                ${banner.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-primary btn-action edit-banner" data-id="${banner._id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger btn-action delete-banner" data-id="${banner._id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            $('#banners-table').html(html);
            
            // Add event handlers
            $('.edit-banner').click(function() {
                const id = $(this).data('id');
                editBanner(id);
            });
            
            $('.delete-banner').click(function() {
                const id = $(this).data('id');
                deleteBanner(id);
            });
        })
        .fail(function() {
            showAlert('Error loading banners', 'danger');
        });
}

// LEGACY SECTIONS - NO LONGER USED
/*
function loadSections() {
    console.log('Loading sections...');
    $.get('/api/admin/sections')
        .done(function(sections) {
            console.log('Sections loaded:', sections);
            let html = '';
            
            if (!sections || sections.length === 0) {
                html = '<tr><td colspan="7" class="text-center">No sections found</td></tr>';
            } else {
                sections.forEach(function(section) {
                    const sectionId = section._id || section.id;
                    html += `
                        <tr>
                            <td>${section.name || 'Unnamed'}</td>
                            <td><span class="badge bg-info">${section.type || 'N/A'}</span></td>
                            <td>${section.title || '-'}</td>
                            <td>${section.ordering !== undefined ? section.ordering : 0}</td>
                            <td>
                                <span class="badge ${section.isActive ? 'bg-success' : 'bg-danger'}">
                                    ${section.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td>
                                <span class="badge ${section.isPublished ? 'bg-primary' : 'bg-secondary'}">
                                    ${section.isPublished ? 'Published' : 'Draft'}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-sm btn-primary btn-action edit-section" data-id="${sectionId}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-danger btn-action delete-section" data-id="${sectionId}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }
            
            $('#sections-table').html(html);
            
            // Add event handlers
            $('.edit-section').click(function() {
                const id = $(this).data('id');
                console.log('Edit section clicked:', id);
                editSection(id);
            });
            
            $('.delete-section').click(function() {
                const id = $(this).data('id');
                console.log('Delete section clicked:', id);
                deleteSection(id);
            });
            
            console.log('Sections table updated');
        })
        .fail(function(error) {
            console.error('Error loading sections:', error);
            const errorMsg = error?.responseJSON?.message || 'Error loading sections';
            showAlert(errorMsg, 'danger');
            $('#sections-table').html('<tr><td colspan="7" class="text-center text-danger">Error loading sections</td></tr>');
        });
}
*/

function loadUsers(page) {
    $.get(`/api/admin/users?page=${page}`)
        .done(function(data) {
            let html = '';
            
            data.users.forEach(function(user) {
                html += `
                    <tr>
                        <td>${user.name}</td>
                        <td>${user.email}</td>
                        <td>${user.phone || 'N/A'}</td>
                        <td>
                            <span class="badge ${user.role === 'admin' ? 'bg-danger' : 'bg-primary'}">
                                ${user.role}
                            </span>
                        </td>
                        <td>
                            <span class="badge ${user.isActive ? 'bg-success' : 'bg-danger'}">
                                ${user.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-primary btn-action edit-user" data-id="${user._id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger btn-action delete-user" data-id="${user._id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            $('#users-table').html(html);
            
            // Add pagination
            let paginationHtml = '';
            
            if (data.currentPage > 1) {
                paginationHtml += `<li class="page-item"><a class="page-link" href="#" data-page="${data.currentPage - 1}">Previous</a></li>`;
            }
            
            for (let i = 1; i <= data.totalPages; i++) {
                paginationHtml += `
                    <li class="page-item ${i === data.currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" data-page="${i}">${i}</a>
                    </li>
                `;
            }
            
            if (data.currentPage < data.totalPages) {
                paginationHtml += `<li class="page-item"><a class="page-link" href="#" data-page="${data.currentPage + 1}">Next</a></li>`;
            }
            
            $('#users-pagination').html(paginationHtml);
            
            // Add event handlers
            $('.edit-user').click(function() {
                const id = $(this).data('id');
                editUser(id);
            });
            
            $('.delete-user').click(function() {
                const id = $(this).data('id');
                deleteUser(id);
            });
            
            $('.page-link').click(function(e) {
                e.preventDefault();
                const page = $(this).data('page');
                loadUsers(page);
            });
        })
        .fail(function() {
            showAlert('Error loading users', 'danger');
        });
}

function loadOrders(page) {
    const status = $('#orderStatusFilter').val() || '';
    const url = `/api/orders/admin/all?page=${page}&limit=20${status ? '&status=' + status : ''}`;
    
    $.get(url)
        .done(function(data) {
            let html = '';
            
            if (!data.orders || data.orders.length === 0) {
                html = '<tr><td colspan="7" class="text-center">No orders found</td></tr>';
            } else {
                data.orders.forEach(function(order) {
                    // Handle both user orders and guest orders
                    const customerName = order.customer ? order.customer.name : (order.user ? order.user.name : (order.guestCustomer ? order.guestCustomer.name : 'Unknown'));
                    const customerEmail = order.customer ? order.customer.email : (order.user ? order.user.email : (order.guestCustomer ? order.guestCustomer.email : ''));
                    const customerType = order.customer ? order.customer.type : (order.user ? 'user' : 'guest');
                    const date = new Date(order.createdAt).toLocaleDateString();
                    const itemCount = order.items ? order.items.reduce((sum, item) => sum + (item.quantity || 0), 0) : 0;
                    const statusClass = getStatusClass(order.status);
                    
                    html += `
                        <tr>
                            <td>${order.orderNumber || order._id}</td>
                            <td>${customerName}<br><small class="text-muted">${customerEmail}</small></td>
                            <td>${date}</td>
                            <td>${itemCount}</td>
                            <td>Rs. ${order.total.toFixed(2)}</td>
                            <td>
                                <span class="badge ${statusClass}">${order.status}</span>
                            </td>
                            <td>
                                <button class="btn btn-sm btn-primary btn-action view-order" data-id="${order._id}" title="View Order">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-sm btn-success btn-action update-status-btn" data-id="${order._id}" data-status="${order.status}" title="Update Status">
                                    <i class="fas fa-edit"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }
            
            $('#orders-table').html(html);
            
            // Add pagination
            let paginationHtml = '';
            if (data.totalPages > 1) {
                if (data.currentPage > 1) {
                    paginationHtml += `<li class="page-item"><a class="page-link" href="#" data-page="${data.currentPage - 1}">Previous</a></li>`;
                }
                
                for (let i = 1; i <= data.totalPages; i++) {
                    paginationHtml += `
                        <li class="page-item ${i === data.currentPage ? 'active' : ''}">
                            <a class="page-link" href="#" data-page="${i}">${i}</a>
                        </li>
                    `;
                }
                
                if (data.currentPage < data.totalPages) {
                    paginationHtml += `<li class="page-item"><a class="page-link" href="#" data-page="${data.currentPage + 1}">Next</a></li>`;
                }
            }
            
            $('#orders-pagination').html(paginationHtml);
            
            // Add event handlers
            $('.view-order').click(function() {
                const id = $(this).data('id');
                viewOrder(id);
            });
            
            $('.update-status-btn').click(function() {
                const id = $(this).data('id');
                const status = $(this).data('status');
                showOrderStatusModal(id, status);
            });
            
            $('.page-link').click(function(e) {
                e.preventDefault();
                const page = $(this).data('page');
                loadOrders(page);
            });
        })
        .fail(function() {
            showAlert('Error loading orders', 'danger');
        });
}

function getStatusClass(status) {
    const classes = {
        'pending': 'bg-warning',
        'confirmed': 'bg-info',
        'processing': 'bg-primary',
        'shipped': 'bg-secondary',
        'delivered': 'bg-success',
        'cancelled': 'bg-danger'
    };
    return classes[status] || 'bg-secondary';
}

async function viewOrder(id) {
    try {
        const order = await $.get(`/api/orders/${id}`);
        
        let itemsHtml = '';
        order.items.forEach(item => {
            const productName = item.product ? item.product.name : 'Unknown Product';
            const itemTotal = item.subtotal || (item.price * item.quantity * (1 - (item.discount || 0) / 100));
            itemsHtml += `
                <tr>
                    <td>${productName}</td>
                    <td>${item.quantity}</td>
                    <td>Rs. ${item.price.toFixed(2)}</td>
                    <td>${item.discount || 0}%</td>
                    <td>Rs. ${itemTotal.toFixed(2)}</td>
                </tr>
            `;
        });
        
        // Handle both user orders and guest orders
        let customerName = 'Unknown';
        let customerEmail = 'N/A';
        let customerPhone = 'N/A';
        
        if (order.customer) {
            // Order from admin route (formatted)
            customerName = order.customer.name || 'Unknown';
            customerEmail = order.customer.email || 'N/A';
            customerPhone = order.customer.phone || 'N/A';
        } else if (order.user) {
            // User order
            customerName = order.user.name || 'Unknown';
            customerEmail = order.user.email || 'N/A';
            customerPhone = order.user.phone || 'N/A';
        } else if (order.guestCustomer) {
            // Guest order
            customerName = order.guestCustomer.name || 'Unknown';
            customerEmail = order.guestCustomer.email || 'N/A';
            customerPhone = order.guestCustomer.phone || 'N/A';
        }
        
        // Also check shipping address for phone number if not found
        if (customerPhone === 'N/A' && order.shippingAddress && order.shippingAddress.phone) {
            customerPhone = order.shippingAddress.phone;
        }
        
        const customerInfo = `
            <p><strong>Name:</strong> ${customerName}</p>
            <p><strong>Email:</strong> ${customerEmail}</p>
            <p><strong>Phone:</strong> ${customerPhone}</p>
        `;
        
        const shippingAddress = order.shippingAddress ? `
            <p>${order.shippingAddress.street || ''}</p>
            <p>${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''} ${order.shippingAddress.zipCode || ''}</p>
            <p>${order.shippingAddress.country || ''}</p>
        ` : '<p>No shipping address provided</p>';
        
        const orderHtml = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Order Information</h6>
                    <p><strong>Order Number:</strong> ${order.orderNumber}</p>
                    <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
                    <p><strong>Status:</strong> <span class="badge ${getStatusClass(order.status)}">${order.status}</span></p>
                    <p><strong>Payment Method:</strong> ${order.paymentMethod || 'N/A'}</p>
                    <p><strong>Payment Status:</strong> ${order.paymentStatus || 'N/A'}</p>
                </div>
                <div class="col-md-6">
                    <h6>Customer Information</h6>
                    ${customerInfo}
                    <h6 class="mt-3">Shipping Address</h6>
                    ${shippingAddress}
                </div>
            </div>
            <hr>
            <h6>Order Items</h6>
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Discount</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
            <div class="text-end">
                <p><strong>Subtotal:</strong> Rs. ${order.subtotal.toFixed(2)}</p>
                <p><strong>Shipping:</strong> Rs. ${(order.shippingCost || 0).toFixed(2)}</p>
                <p><strong>Tax:</strong> Rs. ${(order.tax || 0).toFixed(2)}</p>
                <h5><strong>Total: Rs. ${order.total.toFixed(2)}</strong></h5>
            </div>
        `;
        
        $('#orderModalBody').html(orderHtml);
        $('#confirmOrderBtn').data('order-id', order._id);
        $('#updateOrderStatusBtn').data('order-id', order._id).data('current-status', order.status);
        
        if (order.status === 'pending') {
            $('#confirmOrderBtn').show();
        } else {
            $('#confirmOrderBtn').hide();
        }
        
        $('#orderModal').modal('show');
    } catch (error) {
        console.error('Error loading order', error);
        showAlert('Error loading order', 'danger');
    }
}

function showOrderStatusModal(orderId, currentStatus) {
    $('#orderStatusId').val(orderId);
    $('#orderStatusSelect').val(currentStatus);
    $('#cancelledReason').val('');
    if (currentStatus === 'cancelled') {
        $('#cancelledReasonDiv').show();
    } else {
        $('#cancelledReasonDiv').hide();
    }
    $('#orderStatusModal').modal('show');
}

async function confirmOrder(orderId) {
    try {
        await $.ajax({
            url: `/api/orders/${orderId}/confirm`,
            method: 'POST'
        });
        
        $('#orderModal').modal('hide');
        showAlert('Order confirmed successfully', 'success');
        loadOrders(1);
    } catch (error) {
        console.error('Error confirming order', error);
        showAlert('Error confirming order', 'danger');
    }
}

async function updateOrderStatus() {
    const orderId = $('#orderStatusId').val();
    const status = $('#orderStatusSelect').val();
    const cancelledReason = $('#cancelledReason').val();
    
    try {
        await $.ajax({
            url: `/api/orders/${orderId}/status`,
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify({ status, cancelledReason })
        });
        
        $('#orderStatusModal').modal('hide');
        $('#orderModal').modal('hide');
        showAlert('Order status updated successfully', 'success');
        loadOrders(1);
    } catch (error) {
        console.error('Error updating order status', error);
        showAlert('Error updating order status', 'danger');
    }
}

function loadReportFilters() {
    // Load departments
    $.get('/api/admin/reports/departments')
        .done(function(departments) {
            let html = '<option value="">All Departments</option>';
            departments.forEach(dept => {
                html += `<option value="${dept._id}">${dept.name}</option>`;
            });
            $('#reportDepartment').html(html);
        });
    
    // Load categories
    loadReportCategories();
}

function loadReportCategories(departmentId) {
    const url = departmentId 
        ? `/api/admin/reports/categories?departmentId=${departmentId}`
        : '/api/admin/reports/categories';
    
    $.get(url)
        .done(function(categories) {
            let html = '<option value="">All Categories</option>';
            categories.forEach(cat => {
                html += `<option value="${cat._id}">${cat.name}</option>`;
            });
            $('#reportCategory').html(html);
        });
}

function loadReportProducts(categoryId, departmentId) {
    let url = '/api/admin/reports/products?';
    if (categoryId) url += `categoryId=${categoryId}&`;
    if (departmentId) url += `departmentId=${departmentId}`;
    
    $.get(url)
        .done(function(products) {
            let html = '<option value="">All Products</option>';
            products.forEach(prod => {
                html += `<option value="${prod._id}">${prod.name}</option>`;
            });
            $('#reportProduct').html(html);
        });
}

async function generateSalesReport() {
    const period = $('#reportPeriod').val();
    const departmentId = $('#reportDepartment').val() || undefined;
    const categoryId = $('#reportCategory').val() || undefined;
    const productId = $('#reportProduct').val() || undefined;
    const status = $('#reportStatus').val() || undefined;
    const startDate = $('#reportStartDate').val() || undefined;
    const endDate = $('#reportEndDate').val() || undefined;
    
    let url = '/api/admin/reports/sales?';
    if (period) url += `period=${period}&`;
    if (departmentId) url += `departmentId=${departmentId}&`;
    if (categoryId) url += `categoryId=${categoryId}&`;
    if (productId) url += `productId=${productId}&`;
    if (status) url += `status=${status}&`;
    if (startDate) url += `startDate=${startDate}&`;
    if (endDate) url += `endDate=${endDate}&`;
    
    try {
        const report = await $.get(url);
        
        // Update summary
        $('#reportTotalSales').text('Rs. ' + report.summary.totalSales.toFixed(2));
        $('#reportTotalOrders').text(report.summary.totalOrders);
        $('#reportTotalItems').text(report.summary.totalItems);
        $('#reportAvgOrder').text('Rs. ' + report.summary.averageOrderValue.toFixed(2));
        
        // Update by department
        let deptHtml = '';
        if (report.byDepartment.length === 0) {
            deptHtml = '<tr><td colspan="4" class="text-center">No data</td></tr>';
        } else {
            report.byDepartment.forEach(dept => {
                deptHtml += `
                    <tr>
                        <td>${dept.name}</td>
                        <td>Rs. ${dept.sales.toFixed(2)}</td>
                        <td>${dept.orders}</td>
                        <td>${dept.items}</td>
                    </tr>
                `;
            });
        }
        $('#reportByDepartment').html(deptHtml);
        
        // Update by category
        let catHtml = '';
        if (report.byCategory.length === 0) {
            catHtml = '<tr><td colspan="3" class="text-center">No data</td></tr>';
        } else {
            report.byCategory.forEach(cat => {
                catHtml += `
                    <tr>
                        <td>${cat.name}</td>
                        <td>Rs. ${cat.sales.toFixed(2)}</td>
                        <td>${cat.items}</td>
                    </tr>
                `;
            });
        }
        $('#reportByCategory').html(catHtml);
        
        // Update by product
        let prodHtml = '';
        if (report.byProduct.length === 0) {
            prodHtml = '<tr><td colspan="4" class="text-center">No data</td></tr>';
        } else {
            // Sort by sales descending and take top 20
            const topProducts = report.byProduct.sort((a, b) => b.sales - a.sales).slice(0, 20);
            topProducts.forEach(prod => {
                prodHtml += `
                    <tr>
                        <td>${prod.name}</td>
                        <td>Rs. ${prod.sales.toFixed(2)}</td>
                        <td>${prod.items}</td>
                        <td>Rs. ${prod.price.toFixed(2)}</td>
                    </tr>
                `;
            });
        }
        $('#reportByProduct').html(prodHtml);
        
        $('#reportResults').show();
    } catch (error) {
        console.error('Error generating report', error);
        showAlert('Error generating report', 'danger');
    }
}

function exportReport() {
    // Simple CSV export implementation
    const csv = [];
    csv.push(['Metric', 'Value']);
    csv.push(['Total Sales', $('#reportTotalSales').text()]);
    csv.push(['Total Orders', $('#reportTotalOrders').text()]);
    csv.push(['Total Items', $('#reportTotalItems').text()]);
    csv.push(['Average Order Value', $('#reportAvgOrder').text()]);
    
    const csvContent = csv.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Helper functions
function loadDepartmentsToSelect(selectId, options = {}) {
    const { includeInactive = false, selectedId } = options;
    const url = includeInactive ? '/api/admin/departments' : '/api/departments';

    return $.get(url).then(
        function (departments = []) {
            let html = '<option value="">Select Department</option>';

            departments.forEach(function (dept) {
                const isActive = dept.isActive !== false;
                const label = isActive ? dept.name : `${dept.name} (inactive)`;
                html += `<option value="${dept._id}">${label}</option>`;
            });

            $(selectId).html(html);

            if (selectedId) {
                $(selectId).val(String(selectedId));
            }

            return departments;
        },
        function () {
            $(selectId).html('<option value="">Unable to load departments</option>');
            showAlert('Error loading departments', 'danger');
            return [];
        }
    );
}

function loadCategoriesToSelect(selectId, departmentId, options = {}) {
    const { selectedId } = options;

    if (!departmentId) {
        $(selectId).html('<option value="">Select Department First</option>');
        return $.Deferred().resolve([]).promise();
    }

    return $.get(`/api/categories/department/${departmentId}`).then(
        function (categories = []) {
            let html = '<option value="">Select Category</option>';

            categories.forEach(function (cat) {
                const isActive = cat.isActive !== false;
                const label = isActive ? cat.name : `${cat.name} (inactive)`;
                html += `<option value="${cat._id}">${label}</option>`;
            });

            $(selectId).html(html);

            if (selectedId) {
                $(selectId).val(String(selectedId));
            }

            return categories;
        },
        function () {
            $(selectId).html('<option value="">Unable to load categories</option>');
            showAlert('Error loading categories', 'danger');
            return [];
        }
    );
}

// Form reset functions
function resetDepartmentForm() {
    $('#departmentForm')[0].reset();
    $('#departmentId').val('');
    $('#departmentImageFile').val('');
    $('#departmentImageFileId').val('');
    setImagePreview('#departmentImagePreview', null);
}

function resetCategoryForm() {
    $('#categoryForm')[0].reset();
    $('#categoryId').val('');
    $('#categoryImageFile').val('');
    $('#categoryImageFileId').val('');
    setImagePreview('#categoryImagePreview', null);
    $('#categoryDepartment').html('<option value="">Select Department</option>');
}

function resetProductForm() {
    $('#productForm')[0].reset();
    $('#productId').val('');
    $('#productImageFile').val('');
    $('#productImageFileId').val('');
    // Clear section checkboxes
    $('.product-section-checkbox').prop('checked', false);
    setImagePreview('#productImagePreview', null);
    $('#productDepartment').html('<option value="">Select Department</option>');
    $('#productCategory').html('<option value="">Select Department First</option>');
}

function resetSliderForm() {
    $('#sliderForm')[0].reset();
    $('#sliderId').val('');
    $('#sliderImageFile').val('');
    $('#sliderImageFileId').val('');
    setImagePreview('#sliderImagePreview', null);
}

function resetBannerForm() {
    $('#bannerForm')[0].reset();
    $('#bannerId').val('');
    $('#bannerImageFile').val('');
    $('#bannerImageFileId').val('');
    setImagePreview('#bannerImagePreview', null);
}

// LEGACY SECTIONS - NO LONGER USED
/*
function resetSectionForm() {
    $('#sectionForm')[0].reset();
    $('#sectionId').val('');
    $('#sectionOrdering').val('0');
    $('#sectionActive').prop('checked', true);
    $('#sectionPublished').prop('checked', false);
}
*/

// Save functions
async function saveDepartment() {
    const id = $('#departmentId').val();
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/departments/${id}` : '/api/departments';

    try {
        const uploadedMedia = await uploadImageIfNeeded('#departmentImageFile', 'departments');
        const imageUrl = ($('#departmentImage').val() || '').trim();
        const existingFileId = normaliseFileId($('#departmentImageFileId').val());

    const payload = {
            name: $('#departmentName').val(),
            description: $('#departmentDescription').val(),
            isActive: $('#departmentActive').is(':checked')
        };

        if (!uploadedMedia && !imageUrl && !existingFileId) {
            showAlert('Please provide an image via URL or by uploading a file.', 'warning');
            return;
        }

        if (uploadedMedia) {
            payload.image = uploadedMedia.url;
            payload.imageFileId = uploadedMedia._id;
            $('#departmentImageFileId').val(uploadedMedia._id);
            $('#departmentImage').val(uploadedMedia.url);
            setImagePreview('#departmentImagePreview', uploadedMedia.url);
        } else {
            if (imageUrl) {
                payload.image = imageUrl;
            }
            if (existingFileId) {
                payload.imageFileId = existingFileId;
            }
        }

        await $.ajax({
            url,
            method,
            contentType: 'application/json',
            data: JSON.stringify(payload)
        });

        $('#departmentModal').modal('hide');
        showAlert(id ? 'Department updated successfully' : 'Department added successfully', 'success');
        loadDepartments();
        loadDashboardData();
    } catch (error) {
        console.error('Error saving department', error);
        
        // Extract and display the actual error message
        let errorMessage = 'Error saving department';
        if (error.message) {
            errorMessage = error.message;
        } else if (error.responseJSON && error.responseJSON.message) {
            errorMessage = error.responseJSON.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        
        showAlert(errorMessage, 'danger');
    }
}

async function saveCategory() {
    const id = $('#categoryId').val();
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/categories/${id}` : '/api/categories';

    try {
        // Validate required fields
        const name = $('#categoryName').val()?.trim();
        const department = $('#categoryDepartment').val();
        const description = $('#categoryDescription').val()?.trim();

        if (!name) {
            showAlert('Category name is required', 'warning');
            return;
        }

        if (!department) {
            showAlert('Please select a department', 'warning');
            return;
        }

        if (!description) {
            showAlert('Category description is required', 'warning');
            return;
        }

        const uploadedMedia = await uploadImageIfNeeded('#categoryImageFile', 'categories');
        const imageUrl = ($('#categoryImage').val() || '').trim();
        const existingFileId = normaliseFileId($('#categoryImageFileId').val());

    const payload = {
            name: name,
            department: department,
            description: description,
            isFeatured: $('#categoryFeatured').is(':checked'),
            isActive: $('#categoryActive').is(':checked')
        };

        // Image is optional for updates, required for new categories
        if (!id && !uploadedMedia && !imageUrl && !existingFileId) {
            showAlert('Please provide an image via URL or by uploading a file.', 'warning');
            return;
        }

        if (uploadedMedia) {
            payload.image = uploadedMedia.url;
            payload.imageFileId = uploadedMedia._id;
            $('#categoryImageFileId').val(uploadedMedia._id);
            $('#categoryImage').val(uploadedMedia.url);
            setImagePreview('#categoryImagePreview', uploadedMedia.url);
        } else {
            if (imageUrl) {
                payload.image = imageUrl;
            }
            if (existingFileId) {
                payload.imageFileId = existingFileId;
            }
        }

        const response = await $.ajax({
            url,
            method,
            contentType: 'application/json',
            data: JSON.stringify(payload)
        });

        $('#categoryModal').modal('hide');
        showAlert(id ? 'Category updated successfully' : 'Category added successfully', 'success');
        loadCategories();
        loadDashboardData();
    } catch (error) {
        console.error('Error saving category', error);
        
        // Extract error message from response
        let errorMessage = 'Error saving category';
        if (error.responseJSON && error.responseJSON.message) {
            errorMessage = error.responseJSON.message;
        } else if (error.responseText) {
            try {
                const errorData = JSON.parse(error.responseText);
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                errorMessage = error.responseText || errorMessage;
            }
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showAlert(errorMessage, 'danger');
    }
}

async function saveProduct() {
    const id = $('#productId').val();
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/products/${id}` : '/api/products';

    try {
        // Validate required fields
        const name = $('#productName').val()?.trim();
        const category = $('#productCategory').val();
        const description = $('#productDescription').val()?.trim();
        const priceInput = $('#productPrice').val()?.trim();
        const stockInput = $('#productStock').val()?.trim();
        
        if (!name) {
            showAlert('Product name is required', 'warning');
            return;
        }
        
        if (!category) {
            showAlert('Category is required', 'warning');
            return;
        }
        
        if (!description) {
            showAlert('Product description is required', 'warning');
            return;
        }
        
        if (!priceInput) {
            showAlert('Product price is required', 'warning');
            return;
        }
        
        const price = parseFloat(priceInput);
        if (Number.isNaN(price) || price < 0) {
            showAlert('Product price must be a valid number greater than or equal to 0', 'warning');
            return;
        }
        
        if (!stockInput) {
            showAlert('Stock quantity is required', 'warning');
            return;
        }
        
        const stock = parseInt(stockInput, 10);
        if (Number.isNaN(stock) || stock < 0) {
            showAlert('Stock quantity must be a valid number greater than or equal to 0', 'warning');
            return;
        }
        
        const discountInput = $('#productDiscount').val()?.trim();
        const discount = discountInput ? parseFloat(discountInput) : 0;
        if (Number.isNaN(discount) || discount < 0 || discount > 100) {
            showAlert('Discount must be a number between 0 and 100', 'warning');
            return;
        }
        
        const uploadedMedia = await uploadImageIfNeeded('#productImageFile', 'products');
        const imageUrl = ($('#productImage').val() || '').trim();
        const existingFileId = normaliseFileId($('#productImageFileId').val());

        // Collect selected sections
        const selectedSections = [];
        $('.product-section-checkbox:checked').each(function() {
            selectedSections.push($(this).val());
        });

    const payload = {
            name: name,
            price: price,
            category: category,
            description: description,
            stock: stock,
            discount: discount,
            isFeatured: $('#productFeatured').is(':checked'),
            isTrending: $('#productTrending').is(':checked'),
            isNewArrival: $('#productNewArrival').is(':checked'),
            isBestSelling: $('#productBestSelling').is(':checked'),
            isTopSelling: $('#productTopSelling').is(':checked'),
            sections: selectedSections,
            isActive: $('#productActive').is(':checked')
        };

        if (!uploadedMedia && !imageUrl && !existingFileId) {
            showAlert('Please provide an image via URL or by uploading a file.', 'warning');
            return;
        }

        if (uploadedMedia) {
            payload.image = uploadedMedia.url;
            payload.imageFileId = uploadedMedia._id;
            $('#productImageFileId').val(uploadedMedia._id);
            $('#productImage').val(uploadedMedia.url);
            setImagePreview('#productImagePreview', uploadedMedia.url);
        } else {
            if (imageUrl) {
                payload.image = imageUrl;
            }
            if (existingFileId) {
                payload.imageFileId = existingFileId;
            }
        }

        await $.ajax({
            url,
            method,
            contentType: 'application/json',
            data: JSON.stringify(payload)
        });

        $('#productModal').modal('hide');
        showAlert(id ? 'Product updated successfully' : 'Product added successfully', 'success');
        loadProducts(1);
        loadDashboardData();
    } catch (error) {
        console.error('Error saving product', error);
        
        // Extract error message from response
        let errorMessage = 'Error saving product';
        if (error.responseJSON && error.responseJSON.message) {
            errorMessage = error.responseJSON.message;
        } else if (error.responseText) {
            try {
                const errorData = JSON.parse(error.responseText);
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                errorMessage = error.responseText || errorMessage;
            }
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showAlert(errorMessage, 'danger');
    }
}

async function saveSlider() {
    const id = $('#sliderId').val();
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/sliders/${id}` : '/api/sliders';
    const isEdit = Boolean(id);

    const titleInput = $('#sliderTitle').val().trim();
    const descriptionInput = $('#sliderDescription').val().trim();
    const linkInput = $('#sliderLink').val().trim();
    const orderInput = $('#sliderOrder').val().trim();

    const uploadedMedia = await uploadImageIfNeeded('#sliderImageFile', 'sliders');
    const imageUrl = ($('#sliderImage').val() || '').trim();
    const existingFileId = normaliseFileId($('#sliderImageFileId').val());

    if (!uploadedMedia && !imageUrl && !existingFileId) {
        showAlert('Please provide an image via URL or by uploading a file.', 'warning');
        return;
    }

    let orderValue = undefined;
    if (orderInput) {
        orderValue = parseInt(orderInput, 10);
        if (Number.isNaN(orderValue)) {
            showAlert('Order must be a number.', 'warning');
            return;
        }
    } else if (!isEdit) {
        orderValue = 0;
    }

    let titleValue = titleInput;
    if (!titleValue) {
        if (uploadedMedia?.originalName) {
            titleValue = uploadedMedia.originalName.replace(/\.[^/.]+$/, '').trim();
        } else if (!isEdit) {
            titleValue = 'Untitled Slider';
        }
    }

    let descriptionValue = descriptionInput;
    if (!descriptionValue && !isEdit) {
        descriptionValue = 'Slider description';
    }

    let linkValue = linkInput;
    if (!linkValue && !isEdit) {
        linkValue = '/';
    }

    const payload = {
        isActive: $('#sliderActive').is(':checked')
    };

    if (titleValue !== undefined) payload.title = titleValue;
    if (descriptionValue !== undefined) payload.description = descriptionValue;
    if (linkValue !== undefined) payload.link = linkValue;
    if (orderValue !== undefined) payload.order = orderValue;

    if (uploadedMedia) {
        payload.image = uploadedMedia.url;
        payload.imageFileId = uploadedMedia._id;
        $('#sliderImageFileId').val(uploadedMedia._id);
        $('#sliderImage').val(uploadedMedia.url);
        setImagePreview('#sliderImagePreview', uploadedMedia.url);
    } else {
        if (imageUrl) {
            payload.image = imageUrl;
        }
        if (existingFileId) {
            payload.imageFileId = existingFileId;
        }
    }

    try {
        await $.ajax({
            url,
            method,
            contentType: 'application/json',
            data: JSON.stringify(payload)
        });

        $('#sliderModal').modal('hide');
        showAlert(id ? 'Slider updated successfully' : 'Slider added successfully', 'success');
        loadSliders();
    } catch (error) {
        console.error('Error saving slider', error);
        
        // Extract and display the actual error message
        let errorMessage = 'Error saving slider';
        if (error.message) {
            errorMessage = error.message;
        } else if (error.responseJSON && error.responseJSON.message) {
            errorMessage = error.responseJSON.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        
        showAlert(errorMessage, 'danger');
    }
}

async function saveBanner() {
    const id = $('#bannerId').val();
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/banners/${id}` : '/api/banners';

    try {
        const uploadedMedia = await uploadImageIfNeeded('#bannerImageFile', 'banners');
        const imageUrl = ($('#bannerImage').val() || '').trim();
        const existingFileId = normaliseFileId($('#bannerImageFileId').val());
        const titleValue = ($('#bannerTitle').val() || '').trim();
        const descriptionValue = ($('#bannerDescription').val() || '').trim();
        const linkValue = ($('#bannerLink').val() || '').trim();
        const positionValue = $('#bannerPosition').val() || 'middle';
        const sizeValue = $('#bannerSize').val() || 'medium';

        const payload = {
            title: titleValue || 'Homepage Banner',
            description: descriptionValue || 'Banner description',
            link: linkValue || '/',
            position: positionValue,
            size: sizeValue,
            isActive: $('#bannerActive').is(':checked')
        };

        if (!uploadedMedia && !imageUrl && !existingFileId) {
            showAlert('Please provide an image via URL or by uploading a file.', 'warning');
            return;
        }

        if (uploadedMedia) {
            payload.image = uploadedMedia.url;
            payload.imageFileId = uploadedMedia._id;
            $('#bannerImageFileId').val(uploadedMedia._id);
            $('#bannerImage').val(uploadedMedia.url);
            setImagePreview('#bannerImagePreview', uploadedMedia.url);
        } else {
            if (imageUrl) {
                payload.image = imageUrl;
            }
            if (existingFileId) {
                payload.imageFileId = existingFileId;
            }
        }

        await $.ajax({
            url,
            method,
            contentType: 'application/json',
            data: JSON.stringify(payload)
        });

        $('#bannerModal').modal('hide');
        showAlert(id ? 'Banner updated successfully' : 'Banner added successfully', 'success');
        loadBanners();
    } catch (error) {
        console.error('Error saving banner', error);
        
        // Extract and display the actual error message
        let errorMessage = 'Error saving banner';
        if (error.message) {
            errorMessage = error.message;
        } else if (error.responseJSON && error.responseJSON.message) {
            errorMessage = error.responseJSON.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        }
        
        showAlert(errorMessage, 'danger');
    }
}

// LEGACY SECTIONS - NO LONGER USED
/*
async function saveSection() {
    const id = $('#sectionId').val();
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/admin/sections/${id}` : '/api/admin/sections';

    try {
        let config = {};
        const configText = ($('#sectionConfig').val() || '').trim();
        if (configText) {
            try {
                config = JSON.parse(configText);
            } catch (e) {
                showAlert('Invalid JSON in config field', 'warning');
                return;
            }
        }

        const payload = {
            name: $('#sectionName').val(),
            type: $('#sectionType').val(),
            title: $('#sectionTitle').val() || undefined,
            subtitle: $('#sectionSubtitle').val() || undefined,
            description: $('#sectionDescription').val() || undefined,
            ordering: parseInt($('#sectionOrdering').val(), 10) || 0,
            isActive: $('#sectionActive').is(':checked'),
            isPublished: $('#sectionPublished').is(':checked'),
            config: config
        };

        await $.ajax({
            url,
            method,
            contentType: 'application/json',
            data: JSON.stringify(payload)
        });

        $('#sectionModal').modal('hide');
        showAlert(id ? 'Section updated successfully' : 'Section added successfully', 'success');
        loadSections();
        // Note: Main page will show new/updated sections on next page load or refresh
    } catch (error) {
        console.error('Error saving section', error);
        const message = error?.responseJSON?.message || 'Error saving section';
        showAlert(message, 'danger');
    }
}
*/

// Edit functions
async function editDepartment(id) {
    try {
        const dept = await $.get(`/api/departments/${id}`);
        $('#departmentId').val(dept._id);
        $('#departmentName').val(dept.name);
        $('#departmentDescription').val(dept.description);
        $('#departmentImage').val(dept.image || '');
        $('#departmentImageFileId').val(dept.imageUpload ? dept.imageUpload._id : '');
        $('#departmentActive').prop('checked', dept.isActive);
        setImagePreview('#departmentImagePreview', resolveItemImage(dept));

        $('#departmentModalTitle').text('Edit Department');
        $('#departmentModal').modal('show');
    } catch (error) {
        console.error('Error loading department', error);
        showAlert('Error loading department', 'danger');
    }
}

async function editCategory(id) {
    try {
        const cat = await $.get(`/api/categories/${id}`);
        $('#categoryId').val(cat._id);
        $('#categoryName').val(cat.name);
        $('#categoryDescription').val(cat.description || '');
        $('#categoryImage').val(cat.image || '');
        $('#categoryImageFileId').val(cat.imageUpload ? cat.imageUpload._id : '');
        $('#categoryFeatured').prop('checked', cat.isFeatured);
        $('#categoryActive').prop('checked', cat.isActive);
        setImagePreview('#categoryImagePreview', resolveItemImage(cat));

        await loadDepartmentsToSelect('#categoryDepartment', { includeInactive: true, selectedId: cat.department ? cat.department._id : '' });
        $('#categoryDepartment').val(cat.department ? cat.department._id : '');

        $('#categoryModalTitle').text('Edit Category');
        $('#categoryModal').modal('show');
    } catch (error) {
        console.error('Error loading category', error);
        showAlert('Error loading category', 'danger');
    }
}

async function editProduct(id) {
    try {
        const product = await $.get(`/api/products/${id}`);
        $('#productId').val(product._id);
        $('#productName').val(product.name);
        $('#productPrice').val(product.price);
        $('#productDescription').val(product.description || '');
        $('#productImage').val(product.image || '');
        $('#productImageFileId').val(product.imageUpload ? product.imageUpload._id : '');
        $('#productStock').val(product.stock);
        $('#productDiscount').val(product.discount);
        $('#productFeatured').prop('checked', product.isFeatured);
        $('#productTrending').prop('checked', product.isTrending);
        $('#productNewArrival').prop('checked', product.isNewArrival);
        $('#productBestSelling').prop('checked', product.isBestSelling || false);
        $('#productTopSelling').prop('checked', product.isTopSelling || false);
        // Populate sections checkboxes
        $('.product-section-checkbox').prop('checked', false);
        if (product.sections && Array.isArray(product.sections)) {
            product.sections.forEach(function(section) {
                $(`.product-section-checkbox[value="${section}"]`).prop('checked', true);
            });
        }
        $('#productActive').prop('checked', product.isActive);
        setImagePreview('#productImagePreview', resolveItemImage(product));

        const departmentId = product.department ? product.department._id : '';
        const categoryId = product.category ? product.category._id : '';

        await loadDepartmentsToSelect('#productDepartment', { includeInactive: true, selectedId: departmentId });
        $('#productDepartment').val(departmentId);
        await loadCategoriesToSelect('#productCategory', departmentId, { selectedId: categoryId });
        $('#productCategory').val(categoryId);

        $('#productModalTitle').text('Edit Product');
        $('#productModal').modal('show');
    } catch (error) {
        console.error('Error loading product', error);
        showAlert('Error loading product', 'danger');
    }
}

async function editSlider(id) {
    try {
        const slider = await $.get(`/api/sliders/${id}`);
        $('#sliderId').val(slider._id);
        $('#sliderTitle').val(slider.title);
        $('#sliderDescription').val(slider.description || '');
        $('#sliderImage').val(slider.image || '');
        $('#sliderImageFileId').val(slider.imageUpload ? slider.imageUpload._id : '');
        $('#sliderLink').val(slider.link || '');
        $('#sliderOrder').val(slider.order || 0);
        $('#sliderActive').prop('checked', slider.isActive);
        setImagePreview('#sliderImagePreview', resolveItemImage(slider));

        $('#sliderModalTitle').text('Edit Slider');
        $('#sliderModal').modal('show');
    } catch (error) {
        console.error('Error loading slider', error);
        showAlert('Error loading slider', 'danger');
    }
}

async function editBanner(id) {
    try {
        const banner = await $.get(`/api/banners/detail/${id}`);
        $('#bannerId').val(banner._id);
        $('#bannerTitle').val(banner.title);
        $('#bannerDescription').val(banner.description || '');
        $('#bannerImage').val(banner.image || '');
        $('#bannerImageFileId').val(banner.imageUpload ? banner.imageUpload._id : '');
        $('#bannerLink').val(banner.link || '');
        $('#bannerPosition').val(banner.position || 'middle');
        $('#bannerSize').val(banner.size || 'medium');
        $('#bannerActive').prop('checked', banner.isActive);
        setImagePreview('#bannerImagePreview', resolveItemImage(banner));

        $('#bannerModalTitle').text('Edit Banner');
        $('#bannerModal').modal('show');
    } catch (error) {
        console.error('Error loading banner', error);
        showAlert('Error loading banner', 'danger');
    }
}

// LEGACY SECTIONS - NO LONGER USED
/*
async function editSection(id) {
    try {
        console.log('Loading section for edit:', id);
        const section = await $.get(`/api/admin/sections/${id}`);
        console.log('Section loaded:', section);
        
        if (!section) {
            showAlert('Section not found', 'danger');
            return;
        }

        // Reset form first to clear any previous values
        resetSectionForm();
        
        // Populate form fields
        $('#sectionId').val(section._id || '');
        $('#sectionName').val(section.name || '');
        $('#sectionType').val(section.type || '');
        $('#sectionTitle').val(section.title || '');
        $('#sectionSubtitle').val(section.subtitle || '');
        $('#sectionDescription').val(section.description || '');
        $('#sectionOrdering').val(section.ordering !== undefined ? section.ordering : 0);
        $('#sectionActive').prop('checked', section.isActive !== undefined ? section.isActive : true);
        $('#sectionPublished').prop('checked', section.isPublished !== undefined ? section.isPublished : false);
        
        // Handle config - ensure it's valid JSON
        let configValue = '{}';
        if (section.config) {
            if (typeof section.config === 'string') {
                configValue = section.config;
            } else {
                configValue = JSON.stringify(section.config, null, 2);
            }
        }
        $('#sectionConfig').val(configValue);

        $('#sectionModalTitle').text('Edit Section');
        $('#sectionModal').modal('show');
        
        console.log('Section form populated successfully');
    } catch (error) {
        console.error('Error loading section', error);
        const errorMsg = error?.responseJSON?.message || error?.message || 'Error loading section';
        showAlert(errorMsg, 'danger');
    }
}
*/

function editUser(id) {
    // This would be implemented in a real application
    showAlert('Edit user functionality not implemented', 'info');
}


// Delete functions
function deleteDepartment(id) {
    if (confirm('Are you sure you want to delete this department?')) {
        $.ajax({
            url: `/api/departments/${id}`,
            method: 'DELETE',
            success: function() {
                showAlert('Department deleted successfully', 'success');
                loadDepartments();
                loadDashboardData();
            },
            error: function() {
                showAlert('Error deleting department', 'danger');
            }
        });
    }
}

function deleteCategory(id) {
    if (confirm('Are you sure you want to delete this category?')) {
        $.ajax({
            url: `/api/categories/${id}`,
            method: 'DELETE',
            success: function() {
                showAlert('Category deleted successfully', 'success');
                loadCategories();
                loadDashboardData();
            },
            error: function() {
                showAlert('Error deleting category', 'danger');
            }
        });
    }
}

function deleteProduct(id) {
    if (confirm('Are you sure you want to delete this product?')) {
        $.ajax({
            url: `/api/products/${id}`,
            method: 'DELETE',
            success: function() {
                showAlert('Product deleted successfully', 'success');
                loadProducts(1);
                loadDashboardData();
            },
            error: function() {
                showAlert('Error deleting product', 'danger');
            }
        });
    }
}

function deleteSlider(id) {
    if (confirm('Are you sure you want to delete this slider?')) {
        $.ajax({
            url: `/api/sliders/${id}`,
            method: 'DELETE',
            success: function() {
                showAlert('Slider deleted successfully', 'success');
                loadSliders();
            },
            error: function() {
                showAlert('Error deleting slider', 'danger');
            }
        });
    }
}

function deleteBanner(id) {
    if (confirm('Are you sure you want to delete this banner?')) {
        $.ajax({
            url: `/api/banners/${id}`,
            method: 'DELETE',
            success: function() {
                showAlert('Banner deleted successfully', 'success');
                loadBanners();
            },
            error: function() {
                showAlert('Error deleting banner', 'danger');
            }
        });
    }
}

// Brand functions
function loadBrands() {
    console.log('Loading brands from /api/admin/brands...');
    console.log('Auth token present:', !!localStorage.getItem('token'));
    
    $.ajax({
        url: '/api/admin/brands',
        method: 'GET',
        headers: {
            'x-auth-token': localStorage.getItem('token') || ''
        }
    })
        .done(function(response) {
            console.log('✅ Brands API response received:', response);
            let html = '';
            
            // Handle different response formats
            const brands = Array.isArray(response) ? response : (response.brands || response.data || []);
            
            console.log(`✅ Processed ${brands.length} brands from response`);
            
            if (!Array.isArray(brands)) {
                console.error('❌ Invalid brands response format:', response);
                showAlert('Error: Invalid response format from server', 'danger');
                html = '<tr><td colspan="6" class="text-center text-danger">Error loading brands. Please check console for details.</td></tr>';
            } else if (brands.length === 0) {
                console.log('⚠️ No brands found in database');
                html = '<tr><td colspan="6" class="text-center text-muted">No brands found. Click "Add Brand" to add your first brand logo.</td></tr>';
            } else {
                console.log(`✅ Rendering ${brands.length} brands in table`);
                brands.forEach(function(brand) {
                    console.log('Processing brand:', {
                        id: brand._id,
                        name: brand.name,
                        image: brand.image,
                        hasImageUpload: !!brand.imageUpload
                    });
                    let imageUrl = resolveItemImage(brand) || brand.image || '';
                    
                    // If no image URL, use placeholder
                    if (!imageUrl || imageUrl === 'null' || imageUrl === 'undefined') {
                        imageUrl = IMAGE_PLACEHOLDER;
                    }
                    
                    console.log('  → Resolved image URL:', imageUrl);
                    html += `
                        <tr>
                            <td>${brand.order || 0}</td>
                            <td><img src="${imageUrl}" alt="${brand.name}" style="max-width: 80px; max-height: 50px; object-fit: contain;" onerror="console.error('Failed to load brand image:', '${imageUrl}'); this.src='${IMAGE_PLACEHOLDER}';"></td>
                            <td>${brand.name}</td>
                            <td>${brand.link ? `<a href="${brand.link}" target="_blank">${brand.link}</a>` : '-'}</td>
                            <td><span class="badge ${brand.isActive ? 'bg-success' : 'bg-secondary'}">${brand.isActive ? 'Active' : 'Inactive'}</span></td>
                            <td>
                                <button class="btn btn-sm btn-primary edit-brand" data-id="${brand._id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-danger delete-brand" data-id="${brand._id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }
            
            $('#brands-table').html(html);
            
            // Attach event handlers
            $('.edit-brand').click(function() {
                const id = $(this).data('id');
                editBrand(id);
            });
            
            $('.delete-brand').click(function() {
                const id = $(this).data('id');
                deleteBrand(id);
            });
        })
        .fail(function(error) {
            console.error('❌ Error loading brands:', {
                status: error.status,
                statusText: error.statusText,
                responseText: error.responseText,
                responseJSON: error.responseJSON
            });
            
            let errorMessage = 'Error loading brands';
            if (error.responseJSON && error.responseJSON.message) {
                errorMessage = error.responseJSON.message;
            } else if (error.status === 401) {
                errorMessage = 'Authentication required. Please login again.';
                console.error('❌ Authentication failed - redirecting to login');
                window.location.href = '/login.html';
                return;
            } else if (error.status === 403) {
                errorMessage = 'Access denied. Admin privileges required.';
            } else if (error.status === 404) {
                errorMessage = 'Brands endpoint not found. Please check server configuration.';
            } else if (error.status === 0) {
                errorMessage = 'Network error. Please check if the server is running.';
            } else if (error.status >= 500) {
                errorMessage = 'Server error. Please check server logs.';
            }
            
            console.error('❌ Final error message:', errorMessage);
            showAlert(errorMessage, 'danger');
            $('#brands-table').html('<tr><td colspan="6" class="text-center text-danger">' + errorMessage + '</td></tr>');
        });
}

function editBrand(id) {
    $.get(`/api/admin/brands/${id}`)
        .done(function(brand) {
            $('#brandId').val(brand._id);
            $('#brandName').val(brand.name);
            $('#brandAlt').val(brand.alt || '');
            $('#brandLink').val(brand.link || '');
            $('#brandOrder').val(brand.order || 0);
            $('#brandActive').prop('checked', brand.isActive !== false);
            $('#brandImage').val(brand.image || '');
            $('#brandImageFileId').val(brand.imageUpload || '');
            
            const imageUrl = resolveItemImage(brand);
            if (imageUrl) {
                setImagePreview('#brandImagePreview', imageUrl);
            } else {
                setImagePreview('#brandImagePreview', null);
            }
            
            $('#brandModalTitle').text('Edit Brand');
            $('#brandModal').modal('show');
        })
        .fail(function() {
            showAlert('Error loading brand', 'danger');
        });
}

async function saveBrand() {
    const id = $('#brandId').val();
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/admin/brands/${id}` : '/api/admin/brands';

    try {
        // Validate required fields
        const name = $('#brandName').val()?.trim();
        if (!name) {
            showAlert('Brand name is required', 'warning');
            return;
        }

        const uploadedMedia = await uploadImageIfNeeded('#brandImageFile', 'brands');
        const imageUrl = ($('#brandImage').val() || '').trim();
        const existingFileId = normaliseFileId($('#brandImageFileId').val());

        const payload = {
            name: name,
            alt: $('#brandAlt').val()?.trim() || undefined,
            link: $('#brandLink').val()?.trim() || undefined,
            order: parseInt($('#brandOrder').val() || '0', 10),
            isActive: $('#brandActive').is(':checked')
        };

        // Image is required for new brands
        if (!id && !uploadedMedia && !imageUrl && !existingFileId) {
            showAlert('Please provide an image via URL or by uploading a file.', 'warning');
            return;
        }

        if (uploadedMedia) {
            payload.image = uploadedMedia.url;
            payload.imageFileId = uploadedMedia._id;
            $('#brandImageFileId').val(uploadedMedia._id);
            $('#brandImage').val(uploadedMedia.url);
            setImagePreview('#brandImagePreview', uploadedMedia.url);
        } else {
            if (imageUrl) {
                payload.image = imageUrl;
            }
            if (existingFileId) {
                payload.imageFileId = existingFileId;
            }
        }

        const response = await $.ajax({
            url,
            method,
            contentType: 'application/json',
            data: JSON.stringify(payload)
        });

        console.log('Brand save response:', response);
        console.log('Brand image in response:', response.image);
        console.log('Brand imageUpload in response:', response.imageUpload);

        // Verify the brand was saved with image
        if (!response.image && !response.imageUpload) {
            console.warn('Warning: Brand saved but no image found in response');
        }

        $('#brandModal').modal('hide');
        showAlert(id ? 'Brand updated successfully' : 'Brand added successfully', 'success');
        
        // Reload brands list after a short delay to ensure database is updated
        setTimeout(function() {
            console.log('Reloading brands list...');
            loadBrands();
        }, 500);
    } catch (error) {
        console.error('Error saving brand', error);
        
        let errorMessage = 'Error saving brand';
        if (error.responseJSON && error.responseJSON.message) {
            errorMessage = error.responseJSON.message;
        } else if (error.responseText) {
            try {
                const errorData = JSON.parse(error.responseText);
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                errorMessage = error.responseText || errorMessage;
            }
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showAlert(errorMessage, 'danger');
    }
}

function deleteBrand(id) {
    if (confirm('Are you sure you want to delete this brand?')) {
        $.ajax({
            url: `/api/admin/brands/${id}`,
            method: 'DELETE',
            success: function() {
                showAlert('Brand deleted successfully', 'success');
                loadBrands();
            },
            error: function() {
                showAlert('Error deleting brand', 'danger');
            }
        });
    }
}

// Video Banner functions
function loadVideoBanners() {
    $.get('/api/admin/video-banners')
        .done(function(response) {
            console.log('Video banners API response:', response);
            
            // Handle different response formats
            const videoBanners = Array.isArray(response) ? response : (response.videoBanners || response.data || []);
            
            console.log('Processed video banners array:', videoBanners);
            
            let html = '';
            
            if (!Array.isArray(videoBanners) || videoBanners.length === 0) {
                console.log('No video banners found or invalid response format');
                html = '<tr><td colspan="7" class="text-center text-muted">No video banners found. Click "Add Video Banner" to add your first video banner.</td></tr>';
            } else {
                videoBanners.forEach(function(videoBanner) {
                    const videoUrl = videoBanner.videoUpload?.url || videoBanner.videoUrl || 'N/A';
                    const posterUrl = resolveItemImage(videoBanner) || videoBanner.posterImage || IMAGE_PLACEHOLDER;
                    
                    html += `
                        <tr>
                            <td>${videoBanner.order || 0}</td>
                            <td>${videoBanner.title}</td>
                            <td><span class="badge bg-info">${videoBanner.videoType || 'youtube'}</span></td>
                            <td><small>${videoUrl.length > 40 ? videoUrl.substring(0, 40) + '...' : videoUrl}</small></td>
                            <td><img src="${posterUrl}" alt="Poster" style="max-width: 60px; max-height: 40px; object-fit: cover;" onerror="this.src='${IMAGE_PLACEHOLDER}';"></td>
                            <td><span class="badge ${videoBanner.isActive ? 'bg-success' : 'bg-secondary'}">${videoBanner.isActive ? 'Active' : 'Inactive'}</span></td>
                            <td>
                                <button class="btn btn-sm btn-primary edit-video-banner" data-id="${videoBanner._id}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-danger delete-video-banner" data-id="${videoBanner._id}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }
            
            $('#video-banners-table').html(html);
            
            // Attach event handlers
            $('.edit-video-banner').click(function() {
                const id = $(this).data('id');
                editVideoBanner(id);
            });
            
            $('.delete-video-banner').click(function() {
                const id = $(this).data('id');
                deleteVideoBanner(id);
            });
        })
        .fail(function(error) {
            console.error('Error loading video banners:', error);
            let errorMessage = 'Error loading video banners';
            if (error.responseJSON && error.responseJSON.message) {
                errorMessage = error.responseJSON.message;
            }
            showAlert(errorMessage, 'danger');
            $('#video-banners-table').html('<tr><td colspan="7" class="text-center text-danger">' + errorMessage + '</td></tr>');
        });
}

async function saveVideoBanner() {
    const id = $('#videoBannerId').val();
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/admin/video-banners/${id}` : '/api/admin/video-banners';

    try {
        const title = $('#videoBannerTitle').val()?.trim();
        if (!title) {
            showAlert('Title is required', 'warning');
            return;
        }

        const videoType = $('#videoBannerType').val();
        const videoUrl = $('#videoBannerUrl').val()?.trim();
        const videoFileId = normaliseFileId($('#videoBannerFileId').val());

        if (!videoUrl && !videoFileId && videoType !== 'file') {
            showAlert('Video URL or video file is required', 'warning');
            return;
        }

        // Upload poster image if needed
        const uploadedPoster = await uploadImageIfNeeded('#videoBannerPosterFile', 'video-posters');
        const posterUrl = ($('#videoBannerPoster').val() || '').trim();
        const posterFileId = normaliseFileId($('#videoBannerPosterFileId').val());

        const payload = {
            title: title,
            description: $('#videoBannerDescription').val()?.trim() || undefined,
            videoUrl: videoUrl || undefined,
            videoFileId: videoFileId || undefined,
            videoType: videoType,
            posterImage: posterUrl || undefined,
            posterImageFileId: uploadedPoster?._id || posterFileId || undefined,
            link: $('#videoBannerLink').val()?.trim() || undefined,
            buttonText: $('#videoBannerButtonText').val()?.trim() || undefined,
            buttonLink: $('#videoBannerButtonLink').val()?.trim() || undefined,
            order: parseInt($('#videoBannerOrder').val() || '0', 10),
            autoplay: $('#videoBannerAutoplay').is(':checked'),
            loop: $('#videoBannerLoop').is(':checked'),
            muted: $('#videoBannerMuted').is(':checked'),
            controls: $('#videoBannerControls').is(':checked'),
            isActive: $('#videoBannerActive').is(':checked')
        };

        const response = await $.ajax({
            url,
            method,
            contentType: 'application/json',
            data: JSON.stringify(payload)
        });

        $('#videoBannerModal').modal('hide');
        
        const successMessage = id ? 'Video banner updated successfully' : 'Video banner added successfully';
        const infoMessage = 'To show this video on the homepage, go to "Homepage Sections" and add a section with type "Video Banner".';
        
        showAlert(successMessage, 'success');
        
        // Show additional info after a delay
        setTimeout(function() {
            showAlert(infoMessage, 'info');
        }, 2000);
        
        setTimeout(function() {
            loadVideoBanners();
        }, 500);
    } catch (error) {
        console.error('Error saving video banner', error);
        let errorMessage = 'Error saving video banner';
        if (error.responseJSON && error.responseJSON.message) {
            errorMessage = error.responseJSON.message;
        }
        showAlert(errorMessage, 'danger');
    }
}

function editVideoBanner(id) {
    $.get(`/api/admin/video-banners/${id}`)
        .done(function(videoBanner) {
            $('#videoBannerId').val(videoBanner._id);
            $('#videoBannerTitle').val(videoBanner.title);
            $('#videoBannerDescription').val(videoBanner.description || '');
            $('#videoBannerType').val(videoBanner.videoType || 'youtube');
            $('#videoBannerUrl').val(videoBanner.videoUrl || '');
            $('#videoBannerFileId').val(videoBanner.videoUpload?._id || '');
            $('#videoBannerPoster').val(videoBanner.posterImage || '');
            $('#videoBannerPosterFileId').val(videoBanner.posterImageUpload?._id || '');
            $('#videoBannerLink').val(videoBanner.link || '');
            $('#videoBannerButtonText').val(videoBanner.buttonText || '');
            $('#videoBannerButtonLink').val(videoBanner.buttonLink || '');
            $('#videoBannerOrder').val(videoBanner.order || 0);
            $('#videoBannerAutoplay').prop('checked', videoBanner.autoplay !== false);
            $('#videoBannerLoop').prop('checked', videoBanner.loop !== false);
            $('#videoBannerMuted').prop('checked', videoBanner.muted !== false);
            $('#videoBannerControls').prop('checked', videoBanner.controls === true);
            $('#videoBannerActive').prop('checked', videoBanner.isActive !== false);
            
            const posterUrl = resolveItemImage(videoBanner) || videoBanner.posterImage;
            if (posterUrl) {
                setImagePreview('#videoBannerPosterPreview', posterUrl);
            }
            
            const videoType = videoBanner.videoType || 'youtube';
            if (videoType === 'file') {
                $('#videoBannerFileUploadDiv').show();
                $('#videoBannerUrl').prop('required', false);
            } else {
                $('#videoBannerFileUploadDiv').hide();
                $('#videoBannerUrl').prop('required', true);
            }
            
            $('#videoBannerModalTitle').text('Edit Video Banner');
            $('#videoBannerModal').modal('show');
        })
        .fail(function(error) {
            console.error('Error loading video banner:', error);
            showAlert('Error loading video banner', 'danger');
        });
}

function deleteVideoBanner(id) {
    if (!confirm('Are you sure you want to delete this video banner?')) {
        return;
    }
    
    $.ajax({
        url: `/api/admin/video-banners/${id}`,
        method: 'DELETE'
    })
        .done(function() {
            showAlert('Video banner deleted successfully', 'success');
            loadVideoBanners();
        })
        .fail(function(error) {
            console.error('Error deleting video banner:', error);
            showAlert('Error deleting video banner', 'danger');
        });
}

function resetVideoBannerForm() {
    $('#videoBannerForm')[0].reset();
    $('#videoBannerId').val('');
    $('#videoBannerType').val('youtube');
    $('#videoBannerOrder').val('0');
    $('#videoBannerAutoplay').prop('checked', true);
    $('#videoBannerLoop').prop('checked', true);
    $('#videoBannerMuted').prop('checked', true);
    $('#videoBannerControls').prop('checked', false);
    $('#videoBannerActive').prop('checked', true);
    $('#videoBannerFileId').val('');
    $('#videoBannerPosterFileId').val('');
    $('#videoBannerFileUploadDiv').hide();
    $('#videoBannerUrl').prop('required', true);
    setImagePreview('#videoBannerPosterPreview', null);
}

function resetBrandForm() {
    $('#brandForm')[0].reset();
    $('#brandId').val('');
    $('#brandOrder').val('0');
    $('#brandActive').prop('checked', true);
    $('#brandImageFileId').val('');
    setImagePreview('#brandImagePreview', null);
}

// LEGACY SECTIONS - NO LONGER USED
/*
function deleteSection(id) {
    if (confirm('Are you sure you want to delete this section? It will be removed from the main page.')) {
        $.ajax({
            url: `/api/admin/sections/${id}`,
            method: 'DELETE',
            success: function() {
                showAlert('Section deleted successfully. The main page will be updated on refresh.', 'success');
                loadSections();
                // Note: Main page will automatically reflect the deletion on next page load or refresh
            },
            error: function() {
                showAlert('Error deleting section', 'danger');
            }
        });
    }
}
*/

// Homepage Sections Functions
function loadHomepageSections() {
    $.get('/api/homepage-sections')
        .done(function(sections) {
            if (!sections || sections.length === 0) {
                $('#homepage-sections-table').html('<tr><td colspan="7" class="text-center">No homepage sections found</td></tr>');
                $('#homepage-sections-empty').show();
                return;
            }
            
            $('#homepage-sections-empty').hide();
            let html = '';
            
            sections.forEach(function(section) {
                const sectionId = section._id || section.id;
                const typeLabel = getSectionTypeLabel(section.type);
                const typeBadge = getSectionTypeBadge(section.type);
                
                html += `
                    <tr data-section-id="${sectionId}" data-ordering="${section.ordering}">
                        <td class="text-center">${section.ordering}</td>
                        <td><strong>${section.name || 'Unnamed'}</strong></td>
                        <td><span class="badge ${typeBadge}">${typeLabel}</span></td>
                        <td>${section.title || '-'}</td>
                        <td class="text-center">
                            <span class="badge ${section.isActive ? 'bg-success' : 'bg-danger'}">
                                ${section.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td class="text-center">
                            <span class="badge ${section.isPublished ? 'bg-primary' : 'bg-secondary'}">
                                ${section.isPublished ? 'Published' : 'Draft'}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-sm btn-primary btn-action edit-homepage-section" data-id="${sectionId}" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger btn-action delete-homepage-section" data-id="${sectionId}" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
            
            $('#homepage-sections-table').html(html);
            
            // Add event handlers
            $('.edit-homepage-section').click(function() {
                const id = $(this).data('id');
                editHomepageSection(id);
            });
            
            $('.delete-homepage-section').click(function() {
                const id = $(this).data('id');
                deleteHomepageSection(id);
            });
        })
        .fail(function(error) {
            console.error('Error loading homepage sections:', error);
            const errorMsg = error?.responseJSON?.message || 'Error loading homepage sections';
            showAlert(errorMsg, 'danger');
            $('#homepage-sections-table').html('<tr><td colspan="7" class="text-center text-danger">Error loading sections</td></tr>');
        });
}

function getSectionTypeLabel(type) {
    const labels = {
        'heroSlider': 'Hero Slider',
        'scrollingText': 'Scrolling Text',
        'categoryFeatured': 'Category Featured',
        'categoryGrid': 'Category Grid',
        'categoryCircles': 'Category Circles',
        'productTabs': 'Product Tabs',
        'productCarousel': 'Product Carousel',
        'bannerFullWidth': 'Full-Width Banner',
        'videoBanner': 'Video Banner',
        'collectionLinks': 'Collection Links',
        'newsletterSocial': 'Newsletter & Social',
        'brandMarquee': 'Brand Marquee',
        'customHTML': 'Custom HTML'
    };
    return labels[type] || type;
}

function getSectionTypeBadge(type) {
    const badges = {
        'heroSlider': 'bg-primary',
        'scrollingText': 'bg-info',
        'categoryFeatured': 'bg-success',
        'categoryGrid': 'bg-success',
        'categoryCircles': 'bg-success',
        'productTabs': 'bg-warning',
        'productCarousel': 'bg-warning',
        'bannerFullWidth': 'bg-secondary',
        'videoBanner': 'bg-danger',
        'collectionLinks': 'bg-info',
        'newsletterSocial': 'bg-dark',
        'brandMarquee': 'bg-secondary',
        'customHTML': 'bg-dark'
    };
    return badges[type] || 'bg-secondary';
}

function resetHomepageSectionForm() {
    $('#homepageSectionForm')[0].reset();
    $('#homepageSectionId').val('');
    $('#homepageSectionOrdering').val('0');
    $('#homepageSectionActive').prop('checked', true);
    $('#homepageSectionPublished').prop('checked', false);
    $('#homepageSectionDisplayDesktop').prop('checked', true);
    $('#homepageSectionDisplayTablet').prop('checked', true);
    $('#homepageSectionDisplayMobile').prop('checked', true);
    $('#homepageSectionConfigArea').html('');
}

function loadHomepageSectionConfig(sectionType) {
    let configHtml = '';
    
    switch(sectionType) {
        case 'heroSlider':
            configHtml = `
                <div class="card border-primary">
                    <div class="card-header bg-primary text-white">
                        <strong>Hero Slider Configuration</strong>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <label class="form-label">Select Sliders (will be loaded from Sliders section)</label>
                            <div id="heroSliderList" class="border rounded p-3">
                                <p class="text-muted">Sliders will be listed here after section is created</p>
                            </div>
                        </div>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="configAutoplay" checked>
                                    <label class="form-check-label" for="configAutoplay">Auto-play</label>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Auto-play Speed (ms)</label>
                                <input type="number" class="form-control" id="configAutoplaySpeed" value="3000" min="1000">
                            </div>
                            <div class="col-md-6">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="configShowArrows" checked>
                                    <label class="form-check-label" for="configShowArrows">Show Navigation Arrows</label>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="configShowDots" checked>
                                    <label class="form-check-label" for="configShowDots">Show Dots Indicator</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            break;
            
        case 'scrollingText':
            configHtml = `
                <div class="card border-info">
                    <div class="card-header bg-info text-white">
                        <strong>Scrolling Text Configuration</strong>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <label class="form-label">Text Items (one per line)</label>
                            <textarea class="form-control" id="configTextItems" rows="3" placeholder="11.11 Sale is Live&#10;Get Upto 50% OFF&#10;Free Shipping on Orders Above Rs. 2000"></textarea>
                        </div>
                        <div class="row g-3">
                            <div class="col-md-4">
                                <label class="form-label">Scroll Speed (seconds)</label>
                                <input type="number" class="form-control" id="configScrollSpeed" value="12" min="5" max="30">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Background Color</label>
                                <input type="color" class="form-control form-control-color" id="configBgColor" value="#ffffff">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Text Color</label>
                                <input type="color" class="form-control form-control-color" id="configTextColor" value="#d93939">
                            </div>
                        </div>
                    </div>
                </div>
            `;
            break;
            
        case 'categoryFeatured':
        case 'categoryGrid':
            configHtml = `
                <div class="card border-success">
                    <div class="card-header bg-success text-white">
                        <strong>Category Grid Configuration</strong>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <label class="form-label">Select Categories (will be loaded from Categories section)</label>
                            <div id="categoryList" class="border rounded p-3">
                                <p class="text-muted">Categories will be listed here after section is created</p>
                            </div>
                        </div>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label">Grid Columns</label>
                                <select class="form-select" id="configGridColumns">
                                    <option value="2">2 Columns</option>
                                    <option value="3">3 Columns</option>
                                    <option value="4" selected>4 Columns</option>
                                    <option value="6">6 Columns</option>
                                    <option value="8">8 Columns</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <div class="form-check mt-4">
                                    <input class="form-check-input" type="checkbox" id="configShowTitle" checked>
                                    <label class="form-check-label" for="configShowTitle">Show Category Titles</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            break;
            
        case 'productTabs':
            configHtml = `
                <div class="card border-warning">
                    <div class="card-header bg-warning text-white">
                        <strong>Product Tabs Configuration</strong>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <label class="form-label">Tabs (JSON format)</label>
                            <textarea class="form-control" id="configTabs" rows="5" placeholder='[{"label": "New Arrivals", "filter": {"isNewArrival": true}, "limit": 8}, {"label": "Featured", "filter": {"isFeatured": true}, "limit": 8}]'></textarea>
                            <div class="form-text">Each tab should have: label, filter (optional), limit (optional)</div>
                        </div>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label">Category Filter (Optional)</label>
                                <select class="form-select" id="configCategoryId">
                                    <option value="">All Categories</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <div class="form-check mt-4">
                                    <input class="form-check-input" type="checkbox" id="configShowViewAll">
                                    <label class="form-check-label" for="configShowViewAll">Show "View All" Link</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            break;
            
        case 'productCarousel':
            configHtml = `
                <div class="card border-warning">
                    <div class="card-header bg-warning text-white">
                        <strong>Product Carousel Configuration</strong>
                    </div>
                    <div class="card-body">
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label">Category (Optional)</label>
                                <select class="form-select" id="configCategoryId">
                                    <option value="">All Categories</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Product Limit</label>
                                <input type="number" class="form-control" id="configLimit" value="10" min="1" max="50">
                            </div>
                            <div class="col-md-12">
                                <label class="form-label">Filter By</label>
                                <div class="row">
                                    <div class="col-md-4">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="configIsFeatured">
                                            <label class="form-check-label" for="configIsFeatured">Featured Products</label>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="configIsNewArrival">
                                            <label class="form-check-label" for="configIsNewArrival">New Arrivals</label>
                                        </div>
                                    </div>
                                    <div class="col-md-4">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="configIsTrending">
                                            <label class="form-check-label" for="configIsTrending">Trending</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="configAutoplay" checked>
                                    <label class="form-check-label" for="configAutoplay">Auto-play Carousel</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            break;
            
        case 'bannerFullWidth':
            configHtml = `
                <div class="card border-secondary">
                    <div class="card-header bg-secondary text-white">
                        <strong>Full-Width Banner Configuration</strong>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <label class="form-label">Select Banner (will be loaded from Banners section)</label>
                            <select class="form-select" id="configBannerId">
                                <option value="">Select Banner</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;
            break;
            
        case 'videoBanner':
            configHtml = `
                <div class="card border-danger">
                    <div class="card-header bg-danger text-white">
                        <strong>Video Banner Configuration</strong>
                    </div>
                    <div class="card-body">
                        <div class="alert alert-info">
                            <strong>Note:</strong> Video banner section will automatically use the first active video banner from the "Video Banners" section. 
                            You can optionally configure additional settings below.
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Select Video Banner (optional - will use first active if not specified)</label>
                            <select class="form-select" id="configVideoBannerId">
                                <option value="">Auto (First Active Video Banner)</option>
                            </select>
                            <div class="form-text">Video banners will be loaded from "Video Banners" section</div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Override Overlay Text (Optional)</label>
                            <input type="text" class="form-control" id="configOverlayText" placeholder="Leave empty to use video banner title">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Override CTA Button Text (Optional)</label>
                            <input type="text" class="form-control" id="configCtaText" placeholder="Leave empty to use video banner button text">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Override CTA Button Link (Optional)</label>
                            <input type="text" class="form-control" id="configCtaLink" placeholder="Leave empty to use video banner link">
                        </div>
                    </div>
                </div>
            `;
            // Load video banners for selection
            loadVideoBannersForConfig();
            break;
            
        case 'newsletterSocial':
            configHtml = `
                <div class="card border-dark">
                    <div class="card-header bg-dark text-white">
                        <strong>Newsletter & Social Configuration</strong>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <label class="form-label">Newsletter Title</label>
                            <input type="text" class="form-control" id="configNewsletterTitle" placeholder="Subscribe to our newsletter">
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Newsletter Description</label>
                            <textarea class="form-control" id="configNewsletterDesc" rows="2" placeholder="Get updates on new products and special offers"></textarea>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Social Media Links (JSON format)</label>
                            <textarea class="form-control" id="configSocialLinks" rows="4" placeholder='{"facebook": "https://facebook.com/page", "instagram": "https://instagram.com/page", "twitter": "https://twitter.com/page"}'></textarea>
                        </div>
                    </div>
                </div>
            `;
            break;
            
        case 'customHTML':
            configHtml = `
                <div class="card border-dark">
                    <div class="card-header bg-dark text-white">
                        <strong>Custom HTML Configuration</strong>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <label class="form-label">Custom HTML</label>
                            <textarea class="form-control font-monospace" id="configCustomHTML" rows="10" placeholder="<div>Your custom HTML here</div>"></textarea>
                            <div class="form-text">Enter custom HTML code. This will be rendered directly on the homepage.</div>
                        </div>
                    </div>
                </div>
            `;
            break;
            
        default:
            configHtml = '<div class="alert alert-info">No special configuration needed for this section type.</div>';
    }
    
    $('#homepageSectionConfigArea').html(configHtml);
    
    // Load data for specific types
    if (sectionType === 'heroSlider') {
        loadSlidersForConfig();
    }
    if (sectionType === 'categoryFeatured' || sectionType === 'categoryGrid') {
        loadCategoriesListForConfig();
    }
    if (sectionType === 'categoryFeatured' || sectionType === 'categoryGrid' || sectionType === 'productTabs' || sectionType === 'productCarousel') {
        loadCategoriesForConfig();
    }
    if (sectionType === 'bannerFullWidth') {
        loadBannersForConfig();
    }
}

async function loadSlidersForConfig() {
    try {
        const sliders = await $.get('/api/sliders');
        let html = '';
        sliders.forEach(slider => {
            if (slider.isActive) {
                html += `
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" name="sliderIds" value="${slider._id}" id="slider_${slider._id}">
                        <label class="form-check-label" for="slider_${slider._id}">${slider.title}</label>
                    </div>
                `;
            }
        });
        if (html) {
            $('#heroSliderList').html(html);
        } else {
            $('#heroSliderList').html('<p class="text-muted">No active sliders found. Create sliders first.</p>');
        }
    } catch (error) {
        console.error('Error loading sliders:', error);
    }
}

async function loadCategoriesForConfig() {
    try {
        const categories = await $.get('/api/categories');
        let html = '<option value="">All Categories</option>';
        categories.forEach(cat => {
            if (cat.isActive) {
                html += `<option value="${cat._id}">${cat.name}</option>`;
            }
        });
        if ($('#configCategoryId').length) {
            $('#configCategoryId').html(html);
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadCategoriesListForConfig() {
    try {
        const categories = await $.get('/api/categories');
        let html = '';
        categories.forEach(cat => {
            if (cat.isActive) {
                html += `
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" name="categoryIds" value="${cat._id}" id="category_${cat._id}">
                        <label class="form-check-label" for="category_${cat._id}">${cat.name}</label>
                    </div>
                `;
            }
        });
        if (html) {
            $('#categoryList').html(html);
        } else {
            $('#categoryList').html('<p class="text-muted">No active categories found. Create categories first.</p>');
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

async function loadBannersForConfig() {
    try {
        const banners = await $.get('/api/banners');
        let html = '<option value="">Select Banner</option>';
        banners.forEach(banner => {
            if (banner.isActive) {
                html += `<option value="${banner._id}">${banner.title}</option>`;
            }
        });
        $('#configBannerId').html(html);
    } catch (error) {
        console.error('Error loading banners:', error);
    }
}

async function loadVideoBannersForConfig() {
    try {
        const videoBanners = await $.get('/api/admin/video-banners');
        let html = '<option value="">Auto (First Active Video Banner)</option>';
        videoBanners.forEach(videoBanner => {
            if (videoBanner.isActive) {
                html += `<option value="${videoBanner._id}">${videoBanner.title} (${videoBanner.videoType || 'youtube'})</option>`;
            }
        });
        $('#configVideoBannerId').html(html);
    } catch (error) {
        console.error('Error loading video banners for config:', error);
    }
}

async function saveHomepageSection() {
    const id = $('#homepageSectionId').val();
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/homepage-sections/${id}` : '/api/homepage-sections';
    
    try {
        const sectionType = $('#homepageSectionType').val();
        const config = buildHomepageSectionConfig(sectionType);
        
        const payload = {
            name: $('#homepageSectionName').val(),
            type: sectionType,
            title: $('#homepageSectionTitle').val() || undefined,
            subtitle: $('#homepageSectionSubtitle').val() || undefined,
            description: $('#homepageSectionDescription').val() || undefined,
            config: config,
            ordering: parseInt($('#homepageSectionOrdering').val(), 10) || 0,
            isActive: $('#homepageSectionActive').is(':checked'),
            isPublished: $('#homepageSectionPublished').is(':checked'),
            displayOn: {
                desktop: $('#homepageSectionDisplayDesktop').is(':checked'),
                tablet: $('#homepageSectionDisplayTablet').is(':checked'),
                mobile: $('#homepageSectionDisplayMobile').is(':checked')
            }
        };
        
        await $.ajax({
            url,
            method,
            contentType: 'application/json',
            data: JSON.stringify(payload)
        });
        
        $('#homepageSectionModal').modal('hide');
        showAlert(id ? 'Homepage section updated successfully' : 'Homepage section added successfully', 'success');
        loadHomepageSections();
    } catch (error) {
        console.error('Error saving homepage section', error);
        const message = error?.responseJSON?.message || 'Error saving homepage section';
        showAlert(message, 'danger');
    }
}

function buildHomepageSectionConfig(sectionType) {
    const config = {};
    
    switch(sectionType) {
        case 'heroSlider':
            const sliderIds = [];
            $('input[name="sliderIds"]:checked').each(function() {
                sliderIds.push($(this).val());
            });
            config.sliderIds = sliderIds;
            config.autoplay = $('#configAutoplay').is(':checked');
            config.autoplaySpeed = parseInt($('#configAutoplaySpeed').val(), 10) || 3000;
            config.showArrows = $('#configShowArrows').is(':checked');
            config.showDots = $('#configShowDots').is(':checked');
            break;
            
        case 'scrollingText':
            const textItems = $('#configTextItems').val().split('\n').filter(item => item.trim());
            config.items = textItems;
            config.scrollSpeed = parseInt($('#configScrollSpeed').val(), 10) || 12;
            config.backgroundColor = $('#configBgColor').val() || '#ffffff';
            config.textColor = $('#configTextColor').val() || '#000000';
            break;
            
        case 'categoryFeatured':
        case 'categoryGrid':
            const categoryIds = [];
            $('input[name="categoryIds"]:checked').each(function() {
                categoryIds.push($(this).val());
            });
            config.categoryIds = categoryIds;
            config.gridColumns = parseInt($('#configGridColumns').val(), 10) || 4;
            config.showTitle = $('#configShowTitle').is(':checked');
            break;
            
        case 'productTabs':
            try {
                const tabsText = $('#configTabs').val().trim();
                if (tabsText) {
                    config.tabs = JSON.parse(tabsText);
                }
            } catch (e) {
                // Default tabs if invalid JSON
                config.tabs = [
                    {label: 'New Arrivals', filter: {isNewArrival: true}, limit: 8},
                    {label: 'Featured', filter: {isFeatured: true}, limit: 8}
                ];
            }
            config.categoryId = $('#configCategoryId').val() || null;
            config.showViewAll = $('#configShowViewAll').is(':checked');
            break;
            
        case 'productCarousel':
            config.categoryId = $('#configCategoryId').val() || null;
            config.limit = parseInt($('#configLimit').val(), 10) || 10;
            if ($('#configIsFeatured').is(':checked')) config.isFeatured = true;
            if ($('#configIsNewArrival').is(':checked')) config.isNewArrival = true;
            if ($('#configIsTrending').is(':checked')) config.isTrending = true;
            config.autoplay = $('#configAutoplay').is(':checked');
            break;
            
        case 'bannerFullWidth':
            config.bannerId = $('#configBannerId').val() || null;
            break;
            
        case 'videoBanner':
            const videoBannerId = $('#configVideoBannerId').val();
            if (videoBannerId) {
                config.videoBannerId = videoBannerId;
            }
            const overlayText = $('#configOverlayText').val()?.trim();
            if (overlayText) {
                config.overlayText = overlayText;
            }
            const ctaText = $('#configCtaText').val()?.trim();
            if (ctaText) {
                config.ctaText = ctaText;
            }
            const ctaLink = $('#configCtaLink').val()?.trim();
            if (ctaLink) {
                config.ctaLink = ctaLink;
            }
            break;
            
        case 'newsletterSocial':
            config.newsletterTitle = $('#configNewsletterTitle').val() || '';
            config.newsletterDesc = $('#configNewsletterDesc').val() || '';
            try {
                const socialText = $('#configSocialLinks').val().trim();
                if (socialText) {
                    config.socialLinks = JSON.parse(socialText);
                }
            } catch (e) {
                config.socialLinks = {};
            }
            break;
            
        case 'customHTML':
            config.html = $('#configCustomHTML').val() || '';
            break;
    }
    
    return config;
}

async function editHomepageSection(id) {
    try {
        const section = await $.get(`/api/homepage-sections/${id}`);
        
        $('#homepageSectionId').val(section._id);
        $('#homepageSectionName').val(section.name || '');
        $('#homepageSectionType').val(section.type || '');
        $('#homepageSectionTitle').val(section.title || '');
        $('#homepageSectionSubtitle').val(section.subtitle || '');
        $('#homepageSectionDescription').val(section.description || '');
        $('#homepageSectionOrdering').val(section.ordering !== undefined ? section.ordering : 0);
        $('#homepageSectionActive').prop('checked', section.isActive !== undefined ? section.isActive : true);
        $('#homepageSectionPublished').prop('checked', section.isPublished !== undefined ? section.isPublished : false);
        
        if (section.displayOn) {
            $('#homepageSectionDisplayDesktop').prop('checked', section.displayOn.desktop !== false);
            $('#homepageSectionDisplayTablet').prop('checked', section.displayOn.tablet !== false);
            $('#homepageSectionDisplayMobile').prop('checked', section.displayOn.mobile !== false);
        }
        
        // Load config for this section type
        loadHomepageSectionConfig(section.type);
        
        // Populate config fields
        if (section.config) {
            setTimeout(() => populateHomepageSectionConfig(section.type, section.config), 500);
        }
        
        $('#homepageSectionModalTitle').text('Edit Homepage Section');
        $('#homepageSectionModal').modal('show');
    } catch (error) {
        console.error('Error loading homepage section', error);
        showAlert('Error loading homepage section', 'danger');
    }
}

function populateHomepageSectionConfig(sectionType, config) {
    switch(sectionType) {
        case 'heroSlider':
            if (config.sliderIds) {
                config.sliderIds.forEach(id => {
                    $(`#slider_${id}`).prop('checked', true);
                });
            }
            if (config.autoplay !== undefined) $('#configAutoplay').prop('checked', config.autoplay);
            if (config.autoplaySpeed) $('#configAutoplaySpeed').val(config.autoplaySpeed);
            if (config.showArrows !== undefined) $('#configShowArrows').prop('checked', config.showArrows);
            if (config.showDots !== undefined) $('#configShowDots').prop('checked', config.showDots);
            break;
            
        case 'scrollingText':
            if (config.items) $('#configTextItems').val(config.items.join('\n'));
            if (config.scrollSpeed) $('#configScrollSpeed').val(config.scrollSpeed);
            if (config.backgroundColor) $('#configBgColor').val(config.backgroundColor);
            if (config.textColor) $('#configTextColor').val(config.textColor);
            break;
            
        case 'categoryFeatured':
        case 'categoryGrid':
            if (config.categoryIds) {
                config.categoryIds.forEach(id => {
                    $(`#category_${id}`).prop('checked', true);
                });
            }
            if (config.gridColumns) $('#configGridColumns').val(config.gridColumns);
            if (config.showTitle !== undefined) $('#configShowTitle').prop('checked', config.showTitle);
            break;
            
        case 'productTabs':
            if (config.tabs) $('#configTabs').val(JSON.stringify(config.tabs, null, 2));
            if (config.categoryId) $('#configCategoryId').val(config.categoryId);
            if (config.showViewAll !== undefined) $('#configShowViewAll').prop('checked', config.showViewAll);
            break;
            
        case 'productCarousel':
            if (config.categoryId) $('#configCategoryId').val(config.categoryId);
            if (config.limit) $('#configLimit').val(config.limit);
            if (config.isFeatured) $('#configIsFeatured').prop('checked', true);
            if (config.isNewArrival) $('#configIsNewArrival').prop('checked', true);
            if (config.isTrending) $('#configIsTrending').prop('checked', true);
            if (config.autoplay !== undefined) $('#configAutoplay').prop('checked', config.autoplay);
            break;
            
        case 'bannerFullWidth':
            if (config.bannerId) $('#configBannerId').val(config.bannerId);
            break;
            
        case 'videoBanner':
            if (config.videoBannerId) $('#configVideoBannerId').val(config.videoBannerId);
            if (config.overlayText) $('#configOverlayText').val(config.overlayText);
            if (config.ctaText) $('#configCtaText').val(config.ctaText);
            if (config.ctaLink) $('#configCtaLink').val(config.ctaLink);
            loadVideoBannersForConfig();
            break;
            
        case 'newsletterSocial':
            if (config.newsletterTitle) $('#configNewsletterTitle').val(config.newsletterTitle);
            if (config.newsletterDesc) $('#configNewsletterDesc').val(config.newsletterDesc);
            if (config.socialLinks) $('#configSocialLinks').val(JSON.stringify(config.socialLinks, null, 2));
            break;
            
        case 'customHTML':
            if (config.html) $('#configCustomHTML').val(config.html);
            break;
    }
}

function deleteHomepageSection(id) {
    if (confirm('Are you sure you want to delete this homepage section? It will be removed from the homepage.')) {
        $.ajax({
            url: `/api/homepage-sections/${id}`,
            method: 'DELETE',
            success: function() {
                showAlert('Homepage section deleted successfully', 'success');
                loadHomepageSections();
            },
            error: function() {
                showAlert('Error deleting homepage section', 'danger');
            }
        });
    }
}

function toggleHomepageSectionReorder() {
    const btn = $('#reorder-homepage-sections-btn');
    const isReorderMode = btn.hasClass('active');
    
    if (isReorderMode) {
        // Save order
        const order = [];
        $('#homepage-sections-table tr').each(function(index) {
            const sectionId = $(this).data('section-id');
            if (sectionId) {
                order.push({ id: sectionId, ordering: index });
            }
        });
        
        $.ajax({
            url: '/api/homepage-sections/reorder',
            method: 'PATCH',
            contentType: 'application/json',
            data: JSON.stringify({ order }),
            success: function() {
                showAlert('Section order saved successfully', 'success');
                btn.removeClass('active btn-success').addClass('btn-secondary');
                btn.html('<i class="fas fa-sort"></i> Reorder Sections');
                loadHomepageSections();
            },
            error: function() {
                showAlert('Error saving section order', 'danger');
            }
        });
    } else {
        // Enable reorder mode (simplified - could add drag & drop here)
        btn.addClass('active').removeClass('btn-secondary').addClass('btn-success');
        btn.html('<i class="fas fa-save"></i> Save Order');
        showAlert('Reorder mode enabled. Adjust ordering numbers and click "Save Order" when done.', 'info');
    }
}

function deleteUser(id) {
    if (confirm('Are you sure you want to delete this user?')) {
        // This would be implemented in a real application
        showAlert('Delete user functionality not implemented', 'info');
    }
}

// Alert function
function showAlert(message, type) {
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    $('.content').prepend(alertHtml);
    
    // Auto-dismiss after 5 seconds
    setTimeout(function() {
        $('.alert').alert('close');
    }, 5000);
}

const IMAGE_PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260"><rect width="100%" height="100%" fill="#f1f5f9" rx="16"/><text x="50%" y="52%" font-family="Arial, sans-serif" font-size="20" fill="#94a3b8" text-anchor="middle">No image selected</text></svg>`);

function resolveItemImage(item) {
    if (!item) return null;
    
    // First check imageUpload (if populated)
    if (item.imageUpload) {
        if (typeof item.imageUpload === 'object' && item.imageUpload.url) {
        return item.imageUpload.url;
    }
        // If imageUpload is just an ID, we can't use it directly
    }
    
    // Then check image field
    if (item.image) {
        const imageUrl = String(item.image).trim();
        // Return null for invalid values
        if (imageUrl && imageUrl !== 'null' && imageUrl !== 'undefined' && imageUrl !== '') {
            return imageUrl;
    }
    }
    
    return null;
}

function setImagePreview(selector, url) {
    const $preview = $(selector);
    const safeUrl = url || IMAGE_PLACEHOLDER;
    
    // Check if it's an img element or a div
    if ($preview.is('img')) {
        $preview.attr('src', safeUrl);
    } else {
        // For div elements, set as background image or innerHTML
        if (url) {
            $preview.html(`<img src="${safeUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;" alt="Preview">`);
        } else {
            $preview.html('<span class="text-muted">No image selected</span>');
        }
    }
}

function initImageField({ urlInput, fileInput, preview }) {
    const $urlInput = $(urlInput);
    const $fileInput = $(fileInput);

    $urlInput.on('input', function () {
        const value = $(this).val();
        if (value) {
            setImagePreview(preview, value);
        } else if (!$fileInput[0]?.files?.length) {
            setImagePreview(preview, null);
        }
    });

    $fileInput.on('change', function () {
        const file = this.files && this.files[0];
        if (!file) {
            const value = $urlInput.val();
            setImagePreview(preview, value || null);
            // Clear file size display
            const fileSizeDisplay = $(this).closest('.mb-3').find('[id$="FileSize"]');
            if (fileSizeDisplay.length) {
                fileSizeDisplay.text('');
            }
            return;
        }
        
        // Display file size
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const maxSizeMB = 20;
        const fileSizeDisplay = $(this).closest('.mb-3').find('[id$="FileSize"]');
        if (fileSizeDisplay.length) {
            const sizeClass = file.size > (maxSizeMB * 1024 * 1024) ? 'text-danger' : 'text-success';
            fileSizeDisplay.html(`<span class="${sizeClass}">File size: ${fileSizeMB} MB</span>`);
            if (file.size > (maxSizeMB * 1024 * 1024)) {
                fileSizeDisplay.append(` <span class="text-danger">(Exceeds ${maxSizeMB} MB limit!)</span>`);
            }
        }
        
        const reader = new FileReader();
        reader.onload = function (event) {
            setImagePreview(preview, event.target.result);
        };
        reader.readAsDataURL(file);
    });
}

async function uploadImageIfNeeded(fileInputSelector, folder) {
    const input = $(fileInputSelector)[0];
    if (!input || !input.files || !input.files.length) {
        return null;
    }

    const file = input.files[0];
    const maxSize = 20 * 1024 * 1024; // 20MB
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    
    // Client-side file size validation
    if (file.size > maxSize) {
        const errorMsg = `Image file size (${fileSizeMB} MB) exceeds maximum limit of 20 MB. Please compress the image or use a smaller file.`;
        throw new Error(errorMsg);
    }

    try {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) {
        formData.append('folder', folder);
    }

        console.log('Uploading image:', {
            filename: file.name,
            size: file.size,
            sizeMB: fileSizeMB,
            type: file.type,
            folder: folder
        });

    const response = await $.ajax({
        url: '/api/admin/media',
        method: 'POST',
        data: formData,
        processData: false,
            contentType: false,
            headers: {
                'x-auth-token': localStorage.getItem('token')
            }
    });

        console.log('Image uploaded successfully:', response);

    // Clear the file input so future saves do not re-upload
    input.value = '';
    return response;
    } catch (error) {
        console.error('Image upload error:', error);
        
        let errorMessage = 'Error uploading image';
        if (error.responseJSON && error.responseJSON.message) {
            errorMessage = error.responseJSON.message;
        } else if (error.responseText) {
            try {
                const errorData = JSON.parse(error.responseText);
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                errorMessage = error.responseText || errorMessage;
            }
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        throw new Error(errorMessage);
    }
}

function normaliseFileId(value) {
    if (!value || value === 'null' || value === 'undefined') {
        return '';
    }
    return value;
}