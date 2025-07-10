# ESD Wrist Strap Detection System

A real-time Electronic Static Discharge (ESD) wrist strap detection system using Raspberry Pi with IR and touch sensors, connected to a Node.js backend via WebSocket.

## Features

- **IR Sensor Detection**: Detects if an operator is present at the workstation
- **Touch Sensor Detection**: Detects if the operator is wearing the wrist strap
- **Grounding Detection**: Verifies if the wrist strap is properly grounded
- **Real-time Monitoring**: WebSocket communication for instant status updates
- **Safety Alerts**: Automatic detection and logging of safety violations
- **REST API**: HTTP endpoints for status monitoring and data retrieval
- **Event Logging**: Comprehensive logging of all ESD events and status changes

## System Architecture

```
Raspberry Pi (Sensors) ←→ WebSocket ←→ Node.js Backend ←→ WebSocket ←→ Frontend/Client
```

### Hardware Components
- **IR Sensor**: Detects operator presence
- **Touch Sensor**: Detects wrist strap connection
- **Grounding Circuit**: Verifies proper grounding connection

## Installation

### Backend Setup

1. **Install Dependencies**:
   ```bash
   cd esd_backend
   npm install
   ```

2. **Start the Server**:
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

3. **Verify Installation**:
   - Server runs on `http://localhost:3000`
   - WebSocket endpoint: `ws://localhost:3000/ws`
   - API endpoint: `http://localhost:3000/api`

### Raspberry Pi Setup

1. **Install Python Dependencies**:
   ```bash
   pip install websockets asyncio
   ```

2. **Configure GPIO Pins** (in `raspberry_pi_client.py`):
   ```python
   # Replace mock implementations with actual GPIO readings
   import RPi.GPIO as GPIO
   
   # Define your GPIO pins
   IR_SENSOR_PIN = 17
   TOUCH_SENSOR_PIN = 18
   GROUND_PIN = 19
   
   # Initialize GPIO
   GPIO.setmode(GPIO.BCM)
   GPIO.setup(IR_SENSOR_PIN, GPIO.IN)
   GPIO.setup(TOUCH_SENSOR_PIN, GPIO.IN)
   GPIO.setup(GROUND_PIN, GPIO.IN)
   ```

3. **Run the Client**:
   ```bash
   python3 raspberry_pi_client.py
   ```

## API Documentation

### REST Endpoints

#### Get ESD Status
```http
GET /api/esd/status
```
Returns complete ESD system status including sensor readings and safety status.

**Response**:
```json
{
  "success": true,
  "data": {
    "status": {
      "operatorPresent": true,
      "wristStrapConnected": true,
      "properlyGrounded": true,
      "lastUpdate": "2024-01-15T10:30:00.000Z",
      "alerts": []
    },
    "safetyStatus": "SAFE",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Get Safety Status
```http
GET /api/esd/safety
```
Returns simplified safety status for quick monitoring.

**Response**:
```json
{
  "success": true,
  "data": {
    "safetyStatus": "SAFE",
    "isSafe": true,
    "operatorPresent": true,
    "wristStrapConnected": true,
    "properlyGrounded": true,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Get Alerts
```http
GET /api/esd/alerts
```
Returns recent ESD events and safety violations.

**Response**:
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "type": "SAFETY_VIOLATION",
        "details": {
          "safetyStatus": "WRIST_STRAP_NOT_CONNECTED",
          "operatorPresent": true,
          "wristStrapConnected": false,
          "properlyGrounded": false
        },
        "timestamp": "2024-01-15T10:25:00.000Z"
      }
    ],
    "alertCount": 1,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Health Check
```http
GET /api/health
```
Returns system health and uptime information.

### WebSocket Communication

#### Connecting to WebSocket
```javascript
const ws = new WebSocket('ws://localhost:3000/ws');
```

#### Message Types

**From Raspberry Pi to Server**:
```json
{
  "type": "esd_sensor_data",
  "irSensor": 1,        // 0 = no operator, 1 = operator detected
  "touchSensor": 1,     // 0 = not connected, 1 = connected
  "groundStatus": 1,    // 0 = not grounded, 1 = properly grounded
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**From Server to Clients**:
```json
{
  "type": "esd_status_update",
  "status": {
    "operatorPresent": true,
    "wristStrapConnected": true,
    "properlyGrounded": true,
    "lastUpdate": "2024-01-15T10:30:00.000Z",
    "alerts": []
  },
  "safetyStatus": "SAFE",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Safety Status Codes

- `SAFE`: All conditions met - operator present, wrist strap connected, properly grounded
- `NO_OPERATOR`: No operator detected at workstation
- `WRIST_STRAP_NOT_CONNECTED`: Operator present but wrist strap not connected
- `NOT_PROPERLY_GROUNDED`: Wrist strap connected but not properly grounded

## Event Types

- `OPERATOR_STATUS_CHANGE`: IR sensor detected operator presence/absence
- `WRIST_STRAP_STATUS_CHANGE`: Touch sensor detected wrist strap connection/disconnection
- `GROUNDING_STATUS_CHANGE`: Grounding status changed
- `SAFETY_VIOLATION`: Safety requirements not met

## Configuration

### Environment Variables
Create a `.env` file in the `esd_backend` directory:

```env
PORT=3000
NODE_ENV=development
WS_PATH=/ws
PING_INTERVAL=30000
PING_TIMEOUT=60000
```

### Raspberry Pi Configuration
Update `raspberry_pi_client.py`:

```python
# Server configuration
SERVER_URL = "ws://your-server-ip:3000/ws"
SEND_INTERVAL = 1.0  # Data transmission frequency

# GPIO pin configuration
IR_SENSOR_PIN = 17
TOUCH_SENSOR_PIN = 18
GROUND_PIN = 19
```

## Testing

### Test the Backend
```bash
# Start the server
npm run dev

# Test API endpoints
curl http://localhost:3000/api/esd/status
curl http://localhost:3000/api/esd/safety
curl http://localhost:3000/api/health
```

### Test WebSocket Communication
```bash
# Run the Python client (simulates sensor data)
python3 raspberry_pi_client.py
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**:
   - Check if server is running on correct port
   - Verify firewall settings
   - Check network connectivity

2. **Sensor Data Not Updating**:
   - Verify GPIO pin configuration
   - Check sensor connections
   - Review Python client logs

3. **Safety Violations Not Detected**:
   - Verify sensor logic in backend
   - Check WebSocket message format
   - Review event logging

### Logs
- Backend logs: Console output when running `npm run dev`
- Python client logs: Console output when running the client
- WebSocket events: Logged in backend console

## Security Considerations

- Use HTTPS/WSS in production
- Implement authentication for API endpoints
- Secure WebSocket connections
- Validate all incoming sensor data
- Log security events

## Production Deployment

1. **Environment Setup**:
   ```bash
   NODE_ENV=production
   PORT=3000
   ```

2. **Process Management**:
   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start server.js --name "esd-backend"
   ```

3. **Reverse Proxy** (Nginx example):
   ```nginx
   location / {
       proxy_pass http://localhost:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
   }
   ```

## License

ISC License

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review logs for error messages
3. Verify hardware connections
4. Test individual components 