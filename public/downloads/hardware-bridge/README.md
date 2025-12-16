# POS Hardware Bridge Service

A local Node.js service that enables your web-based POS system to communicate with hardware devices like printers, scanners, scales, and cash drawers.

## Overview

This hardware bridge runs on your POS machine and provides:
- **REST API** for printer commands and device control
- **WebSocket** for real-time data from scanners and scales
- **Full hardware access** to USB, Serial, and HID devices

## Supported Devices

### ✅ Receipt Printers
- ESC/POS compatible thermal printers
- Epson TM series
- Star Micronics
- Connection: USB, Network, Serial

### ✅ Barcode Label Printers
- Zebra printers
- Brother label printers
- Connection: USB, Network

### ✅ Barcode Scanners
- USB HID scanners (keyboard emulation)
- USB serial scanners
- Bluetooth scanners
- Connection: USB-HID, USB, Bluetooth

### ✅ Weight Scales
- Serial/RS-232 scales
- USB scales
- Connection: USB, Serial (RS-232)

### ✅ Cash Drawers
- RJ11/RJ12 connected via receipt printer
- Standalone USB cash drawers

## Installation

### Prerequisites
- Node.js 16+ installed on your POS machine
- Hardware devices connected

### Step 1: Navigate to the bridge directory
```bash
cd hardware-bridge
```

### Step 2: Install dependencies
```bash
npm install
```

### Step 3: Start the service
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

The service will start on `http://localhost:3001`

## Auto-Start on System Boot

### Windows

1. Create a batch file `start-bridge.bat`:
```batch
@echo off
cd C:\path\to\your\project\hardware-bridge
npm start
```

2. Press `Win + R`, type `shell:startup`, press Enter
3. Copy the batch file to the Startup folder
4. Right-click → Properties → Run: Minimized

### macOS/Linux

Create a systemd service file:

1. Create `/etc/systemd/system/pos-bridge.service`:
```ini
[Unit]
Description=POS Hardware Bridge Service
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/your/project/hardware-bridge
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
```

2. Enable and start:
```bash
sudo systemctl enable pos-bridge
sudo systemctl start pos-bridge
```

## Configuration

The bridge runs on port 3001 by default. To change:

```bash
PORT=3002 npm start
```

## API Endpoints

### Health Check
```
GET /health
```

### List Devices
```
GET /devices/list
Response: {
  printers: [...],
  scanners: [...],
  scales: [...]
}
```

### Receipt Printer

**Connect**
```
POST /printer/receipt/connect
Body: { vendorId: 1234, productId: 5678 }
```

**Print**
```
POST /printer/receipt/print
Body: { content: [...], options: {} }
```

**Test Print**
```
POST /printer/receipt/test
```

### Label Printer

**Connect**
```
POST /printer/label/connect
Body: { vendorId: 1234, productId: 5678 }
```

**Print Label**
```
POST /printer/label/print
Body: {
  barcode: "1234567890",
  productName: "Product Name",
  price: 9.99,
  options: {}
}
```

**Test Print**
```
POST /printer/label/test
```

### Barcode Scanner

**Start Scanner**
```
POST /scanner/start
Body: { devicePath: "/dev/hidraw0" } (optional)
```

**Stop Scanner**
```
POST /scanner/stop
```

Scanned barcodes are sent via WebSocket:
```json
{
  "type": "barcode",
  "data": "1234567890",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Weight Scale

**Connect**
```
POST /scale/connect
Body: { port: "COM3" }
```

**Start Reading**
```
POST /scale/start
```

**Stop Reading**
```
POST /scale/stop
```

**Tare/Zero**
```
POST /scale/tare
```

Weight readings are sent via WebSocket:
```json
{
  "type": "weight",
  "data": {
    "weight": 1.25,
    "unit": "kg",
    "stable": true
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Cash Drawer

**Open Drawer**
```
POST /cash-drawer/open
```

## WebSocket Connection

Connect to: `ws://localhost:3001`

### Messages from Server

**Connection Established**
```json
{
  "type": "connected",
  "message": "Connected to POS Hardware Bridge",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Barcode Scanned**
```json
{
  "type": "barcode",
  "data": "1234567890",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Weight Reading**
```json
{
  "type": "weight",
  "data": {
    "weight": 1.25,
    "unit": "kg",
    "stable": true
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Frontend Integration

The POS web app automatically connects to the bridge service. Configure your devices in:

**Settings → Devices**

The frontend will:
- Check bridge connectivity every 5 seconds
- Show connection status
- Allow device configuration
- Save settings to database

## Troubleshooting

### Bridge won't start
1. Check if Node.js is installed: `node --version`
2. Check if port 3001 is available: `lsof -i :3001` (macOS/Linux) or `netstat -ano | findstr :3001` (Windows)
3. Check the console for error messages

### Printer not connecting
1. Check USB connection
2. List devices: `GET http://localhost:3001/devices/list`
3. Note the vendorId and productId
4. Try connecting with those IDs

### Scanner not working
1. Most USB scanners work as keyboard input (no setup needed)
2. For advanced features, ensure the scanner is HID-compatible
3. Test by opening a text editor and scanning

### Scale not reading
1. Check COM port/Serial port (Windows: Device Manager, macOS/Linux: `ls /dev/tty*`)
2. Verify baud rate (usually 9600)
3. Check scale protocol documentation

### Permission errors (Linux)
Add your user to dialout group:
```bash
sudo usermod -a -G dialout $USER
```
Log out and back in.

## Security Notes

- The bridge runs on **localhost only** (not accessible from network)
- Your POS web app must be running on the same machine or configured to proxy requests
- No authentication required (local trusted environment)

## Support

For issues or questions:
1. Check console logs
2. Test endpoints with Postman/curl
3. Verify hardware connections
4. Check device compatibility

## License

MIT
