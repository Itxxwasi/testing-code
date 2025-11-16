const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Department = require('../models/Department');

// Helper function to get date range based on period
function getDateRange(period) {
    const now = new Date();
    const start = new Date();
    
    switch (period) {
        case 'daily':
            start.setHours(0, 0, 0, 0);
            break;
        case 'weekly':
            start.setDate(now.getDate() - 7);
            start.setHours(0, 0, 0, 0);
            break;
        case 'monthly':
            start.setMonth(now.getMonth() - 1);
            start.setHours(0, 0, 0, 0);
            break;
        case 'yearly':
            start.setFullYear(now.getFullYear() - 1);
            start.setHours(0, 0, 0, 0);
            break;
        default:
            // All time
            start.setFullYear(2000);
    }
    
    return { start, end: now };
}

// Sales report with filters
router.get('/sales', adminAuth, async (req, res) => {
    try {
        const { 
            period = 'all', 
            departmentId, 
            categoryId, 
            productId,
            startDate,
            endDate,
            status
        } = req.query;
        
        // Build date filter
        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        } else if (period !== 'all') {
            const { start, end } = getDateRange(period);
            dateFilter.createdAt = { $gte: start, $lte: end };
        }
        
        // Build status filter
        const statusFilter = status ? { status } : { status: { $ne: 'cancelled' } };
        
        // Get orders with filters
        let orders = await Order.find({ ...dateFilter, ...statusFilter })
            .populate({
                path: 'items.product',
                select: 'name category department price',
                populate: [
                    {
                        path: 'category',
                        select: 'name _id'
                    },
                    {
                        path: 'department',
                        select: 'name _id'
                    }
                ]
            });
        
        // Filter by department, category, or product
        if (departmentId || categoryId || productId) {
            orders = orders.filter(order => {
                return order.items.some(item => {
                    if (!item.product) return false;
                    
                    if (productId && item.product._id && item.product._id.toString() === productId) return true;
                    
                    if (categoryId) {
                        const catId = typeof item.product.category === 'object' && item.product.category?._id
                            ? item.product.category._id.toString()
                            : (typeof item.product.category === 'string' ? item.product.category : null);
                        if (catId === categoryId) return true;
                    }
                    
                    if (departmentId) {
                        const deptId = typeof item.product.department === 'object' && item.product.department?._id
                            ? item.product.department._id.toString()
                            : (typeof item.product.department === 'string' ? item.product.department : null);
                        if (deptId === departmentId) return true;
                    }
                    
                    return false;
                });
            });
        }
        
        // Calculate totals
        const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
        const totalOrders = orders.length;
        const totalItems = orders.reduce((sum, order) => {
            return sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
        }, 0);
        
        // Collect all department and category IDs that need to be fetched
        const deptIdsToFetch = new Set();
        const catIdsToFetch = new Set();
        
        orders.forEach(order => {
            order.items.forEach(item => {
                if (!item.product) return;
                
                // Collect department IDs
                if (item.product.department) {
                    if (typeof item.product.department === 'string') {
                        deptIdsToFetch.add(item.product.department);
                    } else if (typeof item.product.department === 'object' && !item.product.department.name) {
                        deptIdsToFetch.add(item.product.department._id?.toString());
                    }
                }
                
                // Collect category IDs
                if (item.product.category) {
                    if (typeof item.product.category === 'string') {
                        catIdsToFetch.add(item.product.category);
                    } else if (typeof item.product.category === 'object' && !item.product.category.name) {
                        catIdsToFetch.add(item.product.category._id?.toString());
                    }
                }
            });
        });
        
        // Fetch missing department names
        const deptMap = {};
        if (deptIdsToFetch.size > 0) {
            const departments = await Department.find({ _id: { $in: Array.from(deptIdsToFetch) } })
                .select('name _id');
            departments.forEach(dept => {
                deptMap[dept._id.toString()] = dept.name;
            });
        }
        
        // Fetch missing category names
        const catMap = {};
        if (catIdsToFetch.size > 0) {
            const categories = await Category.find({ _id: { $in: Array.from(catIdsToFetch) } })
                .select('name _id');
            categories.forEach(cat => {
                catMap[cat._id.toString()] = cat.name;
            });
        }
        
        // Sales by department
        const salesByDepartment = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                // Skip if product is null or deleted
                if (!item.product) {
                    console.warn('Order item has null product:', item);
                    return;
                }
                
                // Handle department - could be populated object or ObjectId
                let deptId = null;
                let deptName = 'Unknown';
                
                if (item.product.department) {
                    if (typeof item.product.department === 'object' && item.product.department._id) {
                        // Populated department
                        deptId = item.product.department._id.toString();
                        deptName = item.product.department.name || deptMap[deptId] || 'Unknown';
                    } else if (typeof item.product.department === 'string') {
                        // ObjectId string - fetch from map
                        deptId = item.product.department;
                        deptName = deptMap[deptId] || 'Unknown';
                    }
                }
                
                if (deptId) {
                    if (!salesByDepartment[deptId]) {
                        salesByDepartment[deptId] = {
                            id: deptId,
                            name: deptName,
                            sales: 0,
                            orders: 0,
                            items: 0
                        };
                    }
                    const itemTotal = item.subtotal || 0;
                    salesByDepartment[deptId].sales += itemTotal;
                    salesByDepartment[deptId].items += item.quantity || 0;
                }
            });
        });
        // Count orders per department
        orders.forEach(order => {
            const hasDeptItems = order.items.some(item => {
                if (!item.product || !item.product.department) return false;
                const deptId = typeof item.product.department === 'object' && item.product.department._id
                    ? item.product.department._id.toString()
                    : (typeof item.product.department === 'string' ? item.product.department : null);
                return departmentId ? deptId === departmentId : deptId;
            });
            if (hasDeptItems) {
                // Count order only once per department
                for (const item of order.items) {
                    if (!item.product || !item.product.department) continue;
                    const deptId = typeof item.product.department === 'object' && item.product.department._id
                        ? item.product.department._id.toString()
                        : (typeof item.product.department === 'string' ? item.product.department : null);
                    if (deptId && salesByDepartment[deptId]) {
                        salesByDepartment[deptId].orders += 1;
                        break; // Count order only once per department
                    }
                }
            }
        });
        
        // Sales by category
        const salesByCategory = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                // Skip if product is null or deleted
                if (!item.product) {
                    console.warn('Order item has null product:', item);
                    return;
                }
                
                // Handle category - could be populated object or ObjectId
                let catId = null;
                let catName = 'Unknown';
                
                if (item.product.category) {
                    if (typeof item.product.category === 'object' && item.product.category._id) {
                        // Populated category
                        catId = item.product.category._id.toString();
                        catName = item.product.category.name || catMap[catId] || 'Unknown';
                    } else if (typeof item.product.category === 'string') {
                        // ObjectId string - fetch from map
                        catId = item.product.category;
                        catName = catMap[catId] || 'Unknown';
                    }
                }
                
                if (catId) {
                    if (!salesByCategory[catId]) {
                        salesByCategory[catId] = {
                            id: catId,
                            name: catName,
                            sales: 0,
                            orders: 0,
                            items: 0
                        };
                    }
                    const itemTotal = item.subtotal || 0;
                    salesByCategory[catId].sales += itemTotal;
                    salesByCategory[catId].items += item.quantity || 0;
                }
            });
        });
        
        // Sales by product
        const salesByProduct = {};
        orders.forEach(order => {
            order.items.forEach(item => {
                const prodId = item.product._id.toString();
                const prodName = item.product.name || 'Unknown';
                if (!salesByProduct[prodId]) {
                    salesByProduct[prodId] = {
                        id: prodId,
                        name: prodName,
                        sales: 0,
                        orders: 0,
                        items: 0,
                        price: item.price
                    };
                }
                salesByProduct[prodId].sales += item.subtotal;
                salesByProduct[prodId].items += item.quantity;
            });
        });
        
        // Sales by status
        const salesByStatus = {};
        orders.forEach(order => {
            if (!salesByStatus[order.status]) {
                salesByStatus[order.status] = {
                    status: order.status,
                    count: 0,
                    sales: 0
                };
            }
            salesByStatus[order.status].count += 1;
            salesByStatus[order.status].sales += order.total;
        });
        
        res.json({
            summary: {
                totalSales,
                totalOrders,
                totalItems,
                averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0
            },
            byDepartment: Object.values(salesByDepartment),
            byCategory: Object.values(salesByCategory),
            byProduct: Object.values(salesByProduct),
            byStatus: Object.values(salesByStatus),
            period,
            filters: {
                departmentId,
                categoryId,
                productId,
                startDate,
                endDate,
                status
            }
        });
    } catch (err) {
        console.error('Sales report error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Get departments for filter
router.get('/departments', adminAuth, async (req, res) => {
    try {
        const departments = await Department.find({ isActive: true })
            .select('name _id')
            .sort({ name: 1 });
        res.json(departments);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get categories for filter
router.get('/categories', adminAuth, async (req, res) => {
    try {
        const { departmentId } = req.query;
        const query = { isActive: true };
        if (departmentId) {
            query.department = departmentId;
        }
        
        const categories = await Category.find(query)
            .populate('department', 'name')
            .select('name _id department')
            .sort({ name: 1 });
        res.json(categories);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get products for filter
router.get('/products', adminAuth, async (req, res) => {
    try {
        const { categoryId, departmentId } = req.query;
        const query = { isActive: true };
        
        if (categoryId) {
            query.category = categoryId;
        }
        if (departmentId) {
            query.department = departmentId;
        }
        
        const products = await Product.find(query)
            .populate('category', 'name')
            .populate('department', 'name')
            .select('name _id category department price')
            .sort({ name: 1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

