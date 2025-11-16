/**
 * Logger Utility
 * Provides structured logging for debugging and error tracking
 */

const Logger = {
    // Log levels
    levels: {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        NONE: 4
    },

    // Current log level (default: INFO in production, DEBUG in development)
    currentLevel: (typeof window !== 'undefined' && window.location && window.location.hostname === 'localhost') 
        ? 0  // DEBUG in development
        : 1, // INFO in production

    // Log storage for debugging
    logs: [],

    // Maximum logs to store
    maxLogs: 1000,

    /**
     * Format log message with timestamp and context
     */
    formatMessage(level, message, context = {}) {
        const timestamp = new Date().toISOString();
        const contextStr = Object.keys(context).length > 0 
            ? ` | Context: ${JSON.stringify(context)}` 
            : '';
        return `[${timestamp}] [${level}] ${message}${contextStr}`;
    },

    /**
     * Store log entry
     */
    storeLog(level, message, context) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context,
            stack: level === 'ERROR' ? new Error().stack : null
        };
        
        this.logs.push(logEntry);
        
        // Keep only last maxLogs entries
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
    },

    /**
     * Debug log
     */
    debug(message, context = {}) {
        if (this.currentLevel <= this.levels.DEBUG) {
            const formatted = this.formatMessage('DEBUG', message, context);
            console.debug(formatted);
            this.storeLog('DEBUG', message, context);
        }
    },

    /**
     * Info log
     */
    info(message, context = {}) {
        if (this.currentLevel <= this.levels.INFO) {
            const formatted = this.formatMessage('INFO', message, context);
            console.info(formatted);
            this.storeLog('INFO', message, context);
        }
    },

    /**
     * Warning log
     */
    warn(message, context = {}) {
        if (this.currentLevel <= this.levels.WARN) {
            const formatted = this.formatMessage('WARN', message, context);
            console.warn(formatted);
            this.storeLog('WARN', message, context);
        }
    },

    /**
     * Error log with stack trace
     */
    error(message, error = null, context = {}) {
        if (this.currentLevel <= this.levels.ERROR) {
            const formatted = this.formatMessage('ERROR', message, context);
            console.error(formatted);
            
            if (error) {
                console.error('Error details:', error);
                if (error.stack) {
                    console.error('Stack trace:', error.stack);
                }
            }
            
            this.storeLog('ERROR', message, {
                ...context,
                error: error ? {
                    message: error.message,
                    name: error.name,
                    stack: error.stack
                } : null
            });
        }
    },

    /**
     * Log section rendering
     */
    logSectionRender(sectionName, sectionType, success = true, error = null) {
        const context = {
            sectionName,
            sectionType,
            success
        };
        
        if (success) {
            this.debug(`Section rendered: ${sectionName} (${sectionType})`, context);
        } else {
            this.error(`Failed to render section: ${sectionName} (${sectionType})`, error, context);
        }
    },

    /**
     * Log API call
     */
    logApiCall(url, method = 'GET', success = true, error = null, duration = null) {
        const context = {
            url,
            method,
            success,
            duration
        };
        
        if (success) {
            this.debug(`API call: ${method} ${url}`, duration ? { ...context, duration: `${duration}ms` } : context);
        } else {
            this.error(`API call failed: ${method} ${url}`, error, context);
        }
    },

    /**
     * Get all logs
     */
    getLogs(level = null) {
        if (level) {
            return this.logs.filter(log => log.level === level);
        }
        return this.logs;
    },

    /**
     * Get logs as formatted string
     */
    getLogsAsString(level = null) {
        const logs = this.getLogs(level);
        return logs.map(log => {
            const contextStr = Object.keys(log.context).length > 0 
                ? ` | ${JSON.stringify(log.context)}` 
                : '';
            const stackStr = log.stack ? `\nStack: ${log.stack}` : '';
            return `[${log.timestamp}] [${log.level}] ${log.message}${contextStr}${stackStr}`;
        }).join('\n');
    },

    /**
     * Clear logs
     */
    clearLogs() {
        this.logs = [];
        this.info('Logs cleared');
    },

    /**
     * Export logs to console
     */
    exportLogs() {
        console.group('📋 Application Logs');
        console.log(this.getLogsAsString());
        console.groupEnd();
    },

    /**
     * Set log level
     */
    setLevel(level) {
        if (typeof level === 'string') {
            level = this.levels[level.toUpperCase()] || this.levels.INFO;
        }
        this.currentLevel = level;
        this.info(`Log level set to: ${level}`);
    }
};

// Export to window for global access
if (typeof window !== 'undefined') {
    window.Logger = Logger;
    
    // Add helper function to window for easy access
    window.logDebug = (msg, ctx) => Logger.debug(msg, ctx);
    window.logInfo = (msg, ctx) => Logger.info(msg, ctx);
    window.logWarn = (msg, ctx) => Logger.warn(msg, ctx);
    window.logError = (msg, err, ctx) => Logger.error(msg, err, ctx);
    
    // Export logs function
    window.exportLogs = () => Logger.exportLogs();
    window.getLogs = () => Logger.getLogs();
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Logger;
}

