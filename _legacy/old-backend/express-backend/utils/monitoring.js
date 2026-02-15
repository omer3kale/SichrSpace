/**
 * Application Monitoring & Analytics System
 * Step 8.5: Production monitoring implementation
 */

class ApplicationMonitor {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        byPath: {},
        byMethod: {}
      },
      payments: {
        total: 0,
        successful: 0,
        failed: 0,
        totalAmount: 0,
        byStatus: {}
      },
      users: {
        registrations: 0,
        logins: 0,
        active: new Set()
      },
      performance: {
        averageResponseTime: 0,
        slowRequests: 0,
        memoryUsage: [],
        cpuUsage: []
      },
      errors: [],
      alerts: []
    };
    
    this.startTime = Date.now();
    this.alertThresholds = {
      errorRate: 0.05, // 5% error rate
      responseTime: 2000, // 2 seconds
      memoryUsage: 0.8, // 80% memory usage
      paymentFailureRate: 0.1 // 10% payment failure rate
    };
  }
  
  // Track HTTP requests
  trackRequest(req, res, responseTime) {
    this.metrics.requests.total++;
    
    // Track by path
    const path = req.route ? req.route.path : req.path;
    this.metrics.requests.byPath[path] = (this.metrics.requests.byPath[path] || 0) + 1;
    
    // Track by method
    this.metrics.requests.byMethod[req.method] = (this.metrics.requests.byMethod[req.method] || 0) + 1;
    
    // Track response status
    if (res.statusCode >= 200 && res.statusCode < 400) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.errors++;
    }
    
    // Track performance
    this.updatePerformanceMetrics(responseTime);
    
    // Check for alerts
    this.checkAlerts();
  }
  
  // Track payment events
  trackPayment(paymentData) {
    this.metrics.payments.total++;
    
    const { status, amount, currency } = paymentData;
    
    // Track by status
    this.metrics.payments.byStatus[status] = (this.metrics.payments.byStatus[status] || 0) + 1;
    
    if (status === 'COMPLETED' || status === 'APPROVED') {
      this.metrics.payments.successful++;
      this.metrics.payments.totalAmount += parseFloat(amount);
    } else if (status === 'FAILED' || status === 'CANCELLED') {
      this.metrics.payments.failed++;
    }
    
    // Log payment event
    console.log(`💳 Payment tracked: ${status} - ${amount} ${currency}`);
    
    // Check payment failure rate
    this.checkPaymentFailureRate();
  }
  
  // Track user events
  trackUser(event, userId) {
    switch (event) {
      case 'registration':
        this.metrics.users.registrations++;
        break;
      case 'login':
        this.metrics.users.logins++;
        this.metrics.users.active.add(userId);
        break;
      case 'activity':
        this.metrics.users.active.add(userId);
        break;
    }
  }
  
  // Track errors
  trackError(error, context = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      count: 1
    };
    
    // Check if this error already exists
    const existingError = this.metrics.errors.find(e => 
      e.message === error.message && 
      JSON.stringify(e.context) === JSON.stringify(context)
    );
    
    if (existingError) {
      existingError.count++;
      existingError.lastOccurrence = errorData.timestamp;
    } else {
      this.metrics.errors.push(errorData);
    }
    
    // Keep only last 100 unique errors
    if (this.metrics.errors.length > 100) {
      this.metrics.errors = this.metrics.errors.slice(-100);
    }
    
    console.error('🚨 Error tracked:', errorData);
  }
  
  // Update performance metrics
  updatePerformanceMetrics(responseTime) {
    // Calculate average response time
    const currentAvg = this.metrics.performance.averageResponseTime;
    const totalRequests = this.metrics.requests.total;
    
    this.metrics.performance.averageResponseTime = 
      (currentAvg * (totalRequests - 1) + responseTime) / totalRequests;
    
    // Track slow requests
    if (responseTime > this.alertThresholds.responseTime) {
      this.metrics.performance.slowRequests++;
    }
  }
  
  // Check for system alerts
  checkAlerts() {
    const now = Date.now();
    const errorRate = this.metrics.requests.errors / this.metrics.requests.total;
    
    // Check error rate
    if (errorRate > this.alertThresholds.errorRate && this.metrics.requests.total > 10) {
      this.createAlert('HIGH_ERROR_RATE', {
        errorRate: (errorRate * 100).toFixed(2) + '%',
        threshold: (this.alertThresholds.errorRate * 100).toFixed(2) + '%'
      });
    }
    
    // Check average response time
    if (this.metrics.performance.averageResponseTime > this.alertThresholds.responseTime) {
      this.createAlert('SLOW_RESPONSE_TIME', {
        averageResponseTime: this.metrics.performance.averageResponseTime.toFixed(2) + 'ms',
        threshold: this.alertThresholds.responseTime + 'ms'
      });
    }
  }
  
  // Check payment failure rate
  checkPaymentFailureRate() {
    if (this.metrics.payments.total === 0) return;
    
    const failureRate = this.metrics.payments.failed / this.metrics.payments.total;
    
    if (failureRate > this.alertThresholds.paymentFailureRate && this.metrics.payments.total > 5) {
      this.createAlert('HIGH_PAYMENT_FAILURE_RATE', {
        failureRate: (failureRate * 100).toFixed(2) + '%',
        threshold: (this.alertThresholds.paymentFailureRate * 100).toFixed(2) + '%',
        totalPayments: this.metrics.payments.total,
        failedPayments: this.metrics.payments.failed
      });
    }
  }
  
  // Create system alert
  createAlert(type, data) {
    const alert = {
      type,
      data,
      timestamp: new Date().toISOString(),
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    // Check if similar alert exists in last 10 minutes
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    const recentSimilarAlert = this.metrics.alerts.find(a => 
      a.type === type && 
      new Date(a.timestamp).getTime() > tenMinutesAgo
    );
    
    if (!recentSimilarAlert) {
      this.metrics.alerts.push(alert);
      console.warn('🚨 System Alert:', alert);
      
      // Keep only last 50 alerts
      if (this.metrics.alerts.length > 50) {
        this.metrics.alerts = this.metrics.alerts.slice(-50);
      }
    }
  }
  
  // Get system health status
  getHealthStatus() {
    const uptime = Date.now() - this.startTime;
    const errorRate = this.metrics.requests.total > 0 ? 
      this.metrics.requests.errors / this.metrics.requests.total : 0;
    
    const status = {
      status: errorRate < 0.01 ? 'healthy' : errorRate < 0.05 ? 'degraded' : 'unhealthy',
      uptime: {
        ms: uptime,
        human: this.formatUptime(uptime)
      },
      metrics: this.getMetricsSummary(),
      alerts: this.metrics.alerts.slice(-10), // Last 10 alerts
      lastUpdated: new Date().toISOString()
    };
    
    return status;
  }
  
  // Get metrics summary
  getMetricsSummary() {
    return {
      requests: {
        total: this.metrics.requests.total,
        errorRate: this.metrics.requests.total > 0 ? 
          ((this.metrics.requests.errors / this.metrics.requests.total) * 100).toFixed(2) + '%' : '0%',
        averageResponseTime: this.metrics.performance.averageResponseTime.toFixed(2) + 'ms'
      },
      payments: {
        total: this.metrics.payments.total,
        successRate: this.metrics.payments.total > 0 ? 
          ((this.metrics.payments.successful / this.metrics.payments.total) * 100).toFixed(2) + '%' : '0%',
        totalAmount: '€' + this.metrics.payments.totalAmount.toFixed(2)
      },
      users: {
        registrations: this.metrics.users.registrations,
        logins: this.metrics.users.logins,
        activeUsers: this.metrics.users.active.size
      }
    };
  }
  
  // Format uptime in human-readable format
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
  
  // Reset daily metrics (call this daily)
  resetDailyMetrics() {
    // Reset active users set (but keep count for the day)
    this.metrics.users.active.clear();
    
    // Log daily summary before reset
    console.log('📊 Daily metrics summary:', this.getMetricsSummary());
    
    // Archive current metrics if needed (implement database storage)
    this.archiveMetrics();
  }
  
  // Archive metrics to database
  async archiveMetrics() {
    try {
      const dailyMetrics = {
        date: new Date().toISOString().split('T')[0],
        requests: this.metrics.requests.total,
        payments: this.metrics.payments.total,
        registrations: this.metrics.users.registrations,
        logins: this.metrics.users.logins,
        errors: this.metrics.requests.errors,
        averageResponseTime: this.metrics.performance.averageResponseTime,
        totalPaymentAmount: this.metrics.payments.totalAmount
      };
      
      // Store to database (implement based on your database choice)
      console.log('📈 Archiving daily metrics:', dailyMetrics);
      
    } catch (error) {
      console.error('❌ Failed to archive metrics:', error);
    }
  }
}

// PayPal-specific analytics
class PayPalAnalytics {
  constructor() {
    this.payments = [];
    this.webhookEvents = [];
  }
  
  // Track PayPal payment
  trackPayment(paymentData) {
    const payment = {
      id: paymentData.id,
      status: paymentData.status,
      amount: parseFloat(paymentData.amount),
      currency: paymentData.currency,
      timestamp: new Date().toISOString(),
      apartmentId: paymentData.apartmentId,
      userId: paymentData.userId
    };
    
    this.payments.push(payment);
    
    // Keep only last 1000 payments in memory
    if (this.payments.length > 1000) {
      this.payments = this.payments.slice(-1000);
    }
  }
  
  // Track webhook events
  trackWebhookEvent(eventType, eventData) {
    const event = {
      type: eventType,
      data: eventData,
      timestamp: new Date().toISOString()
    };
    
    this.webhookEvents.push(event);
    
    // Keep only last 500 webhook events
    if (this.webhookEvents.length > 500) {
      this.webhookEvents = this.webhookEvents.slice(-500);
    }
  }
  
  // Get payment analytics
  getPaymentAnalytics(timeframe = '24h') {
    const now = Date.now();
    const timeframes = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    const cutoff = now - timeframes[timeframe];
    const recentPayments = this.payments.filter(p => 
      new Date(p.timestamp).getTime() > cutoff
    );
    
    const analytics = {
      timeframe,
      totalPayments: recentPayments.length,
      successfulPayments: recentPayments.filter(p => p.status === 'COMPLETED').length,
      failedPayments: recentPayments.filter(p => p.status === 'FAILED').length,
      totalAmount: recentPayments
        .filter(p => p.status === 'COMPLETED')
        .reduce((sum, p) => sum + p.amount, 0),
      averageAmount: 0,
      paymentsByHour: {},
      statusBreakdown: {}
    };
    
    // Calculate average amount
    if (analytics.successfulPayments > 0) {
      analytics.averageAmount = analytics.totalAmount / analytics.successfulPayments;
    }
    
    // Group payments by hour
    recentPayments.forEach(payment => {
      const hour = new Date(payment.timestamp).getHours();
      analytics.paymentsByHour[hour] = (analytics.paymentsByHour[hour] || 0) + 1;
    });
    
    // Status breakdown
    recentPayments.forEach(payment => {
      analytics.statusBreakdown[payment.status] = 
        (analytics.statusBreakdown[payment.status] || 0) + 1;
    });
    
    return analytics;
  }
}

// Initialize monitoring instances
const appMonitor = new ApplicationMonitor();
const paypalAnalytics = new PayPalAnalytics();

// Express middleware for automatic monitoring
const monitoringMiddleware = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  
  // Track user activity
  if (req.user && req.user.id) {
    appMonitor.trackUser('activity', req.user.id);
  }
  
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    appMonitor.trackRequest(req, res, responseTime);
  });
  
  next();
};

// Health check endpoint handler
const healthCheckHandler = (req, res) => {
  const health = appMonitor.getHealthStatus();
  
  // Set appropriate status code based on health
  const statusCode = health.status === 'healthy' ? 200 : 
                    health.status === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json(health);
};

// Metrics endpoint handler
const metricsHandler = (req, res) => {
  const timeframe = req.query.timeframe || '24h';
  
  const metrics = {
    application: appMonitor.getMetricsSummary(),
    paypal: paypalAnalytics.getPaymentAnalytics(timeframe),
    system: {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      pid: process.pid,
      platform: process.platform,
      nodeVersion: process.version
    }
  };
  
  res.json(metrics);
};

// Start daily metrics reset
setInterval(() => {
  appMonitor.resetDailyMetrics();
}, 24 * 60 * 60 * 1000); // Reset every 24 hours

module.exports = {
  ApplicationMonitor,
  PayPalAnalytics,
  appMonitor,
  paypalAnalytics,
  monitoringMiddleware,
  healthCheckHandler,
  metricsHandler
};
