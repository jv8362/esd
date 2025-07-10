import express from 'express';
import cors from 'cors';
import { initWebSocket, getESDStatus, getSafetyStatus } from './pi_websocket_server.js';

// Create Express app
const app = express();
const PORT = process.env.PORT || 6789;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'ESD Wrist Strap Detection System Backend',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// ESD Status API Routes
app.get('/api/esd/status', (req, res) => {
  try {
    const status = getESDStatus();
    const safetyStatus = getSafetyStatus();
    
    res.json({
      success: true,
      data: {
        status,
        safetyStatus,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting ESD status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get ESD status'
    });
  }
});

app.get('/api/esd/safety', (req, res) => {
  try {
    const safetyStatus = getSafetyStatus();
    const status = getESDStatus();
    
    res.json({
      success: true,
      data: {
        safetyStatus,
        isSafe: safetyStatus === 'SAFE',
        operatorPresent: status.operatorPresent,
        wristStrapConnected: status.wristStrapConnected,
        properlyGrounded: status.properlyGrounded,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting safety status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get safety status'
    });
  }
});

app.get('/api/esd/alerts', (req, res) => {
  try {
    const status = getESDStatus();
    
    res.json({
      success: true,
      data: {
        alerts: status.alerts,
        alertCount: status.alerts.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get alerts'
    });
  }
});

// System health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
      esdStatus: getESDStatus()
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler - catch all unmatched routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`🚀 ESD Backend Server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/ws`);
  console.log(`🌐 API endpoint: http://localhost:${PORT}/api`);
});

// Start the WebSocket server attached to the HTTP server
initWebSocket(server);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});