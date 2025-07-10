import { WebSocketServer } from 'ws';
import WebSocket from 'ws';

let wss;
const clients = new Set();

// ESD Status tracking
let esdStatus = {
  operatorPresent: false,
  wristStrapConnected: false,
  properlyGrounded: false,
  lastUpdate: null,
  alerts: []
};

// Helper function to determine ESD safety status
const getESDSafetyStatus = (operatorPresent, wristStrapConnected, properlyGrounded) => {
  if (!operatorPresent) return 'NO_OPERATOR';
  if (!wristStrapConnected) return 'WRIST_STRAP_NOT_CONNECTED';
  if (!properlyGrounded) return 'NOT_PROPERLY_GROUNDED';
  return 'SAFE';
};

// Helper function to log ESD events
const logESDEvent = (eventType, details) => {
  const timestamp = new Date();
  const event = {
    type: eventType,
    details,
    timestamp: timestamp.toISOString(),
    esdStatus: { ...esdStatus }
  };
  
  console.log(`ESD Event: ${eventType}`, event);
  
  // Store in alerts for recent history
  esdStatus.alerts.unshift(event);
  if (esdStatus.alerts.length > 50) {
    esdStatus.alerts.pop(); // Keep only last 50 alerts
  }
  
  return event;
};

// Helper function to broadcast status to all connected clients
const broadcastStatus = () => {
  const statusMessage = JSON.stringify({
    type: 'esd_status_update',
    status: esdStatus,
    safetyStatus: getESDSafetyStatus(
      esdStatus.operatorPresent,
      esdStatus.wristStrapConnected,
      esdStatus.properlyGrounded
    ),
    timestamp: new Date().toISOString()
  });

  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(statusMessage);
    }
  });
};

export const initWebSocket = (server) => {
  wss = new WebSocketServer({
    server,
    path: '/ws',
    clientTracking: false,
    pingInterval: 30000,
    pingTimeout: 60000
  });

  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection for ESD monitoring');
    
    // Disable socket timeouts entirely
    ws._socket.setKeepAlive(true);
    ws._socket.setTimeout(0);

    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    
    clients.add(ws);

    // Send current status to new client
    ws.send(JSON.stringify({
      type: 'esd_status_update',
      status: esdStatus,
      safetyStatus: getESDSafetyStatus(
        esdStatus.operatorPresent,
        esdStatus.wristStrapConnected,
        esdStatus.properlyGrounded
      ),
      timestamp: new Date().toISOString()
    }));

    // Handle incoming messages from Raspberry Pi
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data);
        
        if (message.type === 'esd_sensor_data') {
          const { irSensor, touchSensor, groundStatus } = message;
          
          // Update ESD status
          const previousStatus = { ...esdStatus };
          esdStatus.operatorPresent = irSensor === 1; // Assuming 1 = operator detected
          esdStatus.wristStrapConnected = touchSensor === 1; // Assuming 1 = wrist strap connected
          esdStatus.properlyGrounded = groundStatus === 1; // Assuming 1 = properly grounded
          esdStatus.lastUpdate = new Date().toISOString();

          // Log significant status changes
          if (previousStatus.operatorPresent !== esdStatus.operatorPresent) {
            logESDEvent('OPERATOR_STATUS_CHANGE', {
              previous: previousStatus.operatorPresent,
              current: esdStatus.operatorPresent
            });
          }

          if (previousStatus.wristStrapConnected !== esdStatus.wristStrapConnected) {
            logESDEvent('WRIST_STRAP_STATUS_CHANGE', {
              previous: previousStatus.wristStrapConnected,
              current: esdStatus.wristStrapConnected
            });
          }

          if (previousStatus.properlyGrounded !== esdStatus.properlyGrounded) {
            logESDEvent('GROUNDING_STATUS_CHANGE', {
              previous: previousStatus.properlyGrounded,
              current: esdStatus.properlyGrounded
            });
          }

          // Check for safety violations
          const safetyStatus = getESDSafetyStatus(
            esdStatus.operatorPresent,
            esdStatus.wristStrapConnected,
            esdStatus.properlyGrounded
          );

          if (safetyStatus !== 'SAFE') {
            logESDEvent('SAFETY_VIOLATION', {
              safetyStatus,
              operatorPresent: esdStatus.operatorPresent,
              wristStrapConnected: esdStatus.wristStrapConnected,
              properlyGrounded: esdStatus.properlyGrounded
            });
          }

          // Broadcast updated status to all clients
          broadcastStatus();

          // Send acknowledgment back to Raspberry Pi
          ws.send(JSON.stringify({
            type: 'esd_data_ack',
            received: true,
            timestamp: new Date().toISOString()
          }));
        }

        // Handle system commands
        if (message.type === 'system_command') {
          switch (message.command) {
            case 'get_status':
              ws.send(JSON.stringify({
                type: 'esd_status_response',
                status: esdStatus,
                safetyStatus: getESDSafetyStatus(
                  esdStatus.operatorPresent,
                  esdStatus.wristStrapConnected,
                  esdStatus.properlyGrounded
                ),
                timestamp: new Date().toISOString()
              }));
              break;
              
            case 'get_alerts':
              ws.send(JSON.stringify({
                type: 'esd_alerts_response',
                alerts: esdStatus.alerts,
                timestamp: new Date().toISOString()
              }));
              break;
              
            case 'clear_alerts':
              esdStatus.alerts = [];
              ws.send(JSON.stringify({
                type: 'esd_alerts_cleared',
                timestamp: new Date().toISOString()
              }));
              break;
          }
        }

      } catch (error) {
        console.error('Message handling error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: new Date().toISOString()
        }));
      }
    });

    // Handle close
    ws.on('close', () => {
      console.log('WebSocket connection closed');
      clients.delete(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  // Set up ping/pong for connection health
  const interval = setInterval(() => {
    clients.forEach((ws) => {
      if (ws.isAlive === false) {
        clients.delete(ws);
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });
};

// Export functions for external access
export const getESDStatus = () => esdStatus;
export const getSafetyStatus = () => getESDSafetyStatus(
  esdStatus.operatorPresent,
  esdStatus.wristStrapConnected,
  esdStatus.properlyGrounded
);
export { WebSocketServer };