const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // Get token from header
    const token = req.header('x-auth-token');
    
    // Check if not token
    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    // Verify token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
        
        // Check if decoded user exists
        if (!decoded.user) {
            return res.status(401).json({ message: 'Invalid token format' });
        }
        
        // Check if user is admin
        if (decoded.user.role !== 'admin') {
            console.error('Admin access denied. User role:', decoded.user.role, 'User ID:', decoded.user.id);
            return res.status(403).json({ 
                message: 'Access denied. Admin privileges required.',
                role: decoded.user.role || 'user'
            });
        }
        
        req.user = decoded.user;
        next();
    } catch (err) {
        console.error('Admin auth error:', err.message);
        res.status(401).json({ message: 'Token is not valid' });
    }
};