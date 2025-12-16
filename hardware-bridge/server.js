const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

const printerService = require('./services/printerService');
const labelPrinterService = require('./services/labelPrinterService');
const scannerService = require('./services/scannerService');
const scaleService = require('./services/scaleService');
const cashDrawerService = require('./services/cashDrawerService');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'POS Hardware Bridge is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/devices/list', async (req, res) => {
  try {
    const devices = {
      printers: await printerService.listDevices(),
      scanners: await scannerService.listDevices(),
      scales: await scaleService.listDevices()
    };
    res.json({ success: true, devices });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/printer/receipt/connect', async (req, res) => {
  try {
    const { vendorId, productId } = req.body;
    await printerService.connect(vendorId, productId);
    res.json({ success: true, message: 'Receipt printer connected' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/printer/receipt/print', async (req, res) => {
  try {
    const { content, options } = req.body;
    await printerService.print(content, options);
    res.json({ success: true, message: 'Print job sent' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/printer/receipt/test', async (req, res) => {
  try {
    await printerService.printTest();
    res.json({ success: true, message: 'Test print sent' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/printer/label/connect', async (req, res) => {
  try {
    const { vendorId, productId } = req.body;
    await labelPrinterService.connect(vendorId, productId);
    res.json({ success: true, message: 'Label printer connected' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/printer/label/print', async (req, res) => {
  try {
    const { barcode, productName, price, options } = req.body;
    await labelPrinterService.printLabel(barcode, productName, price, options);
    res.json({ success: true, message: 'Label print sent' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/printer/label/test', async (req, res) => {
  try {
    await labelPrinterService.printTest();
    res.json({ success: true, message: 'Test label sent' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/cash-drawer/open', async (req, res) => {
  try {
    await cashDrawerService.open();
    res.json({ success: true, message: 'Cash drawer opened' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/scanner/start', async (req, res) => {
  try {
    const { devicePath } = req.body;
    scannerService.start(devicePath, (barcode) => {
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'barcode',
            data: barcode,
            timestamp: new Date().toISOString()
          }));
        }
      });
    });
    res.json({ success: true, message: 'Scanner started' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/scanner/stop', async (req, res) => {
  try {
    scannerService.stop();
    res.json({ success: true, message: 'Scanner stopped' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/scale/connect', async (req, res) => {
  try {
    const { port } = req.body;
    await scaleService.connect(port);
    res.json({ success: true, message: 'Scale connected' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/scale/start', async (req, res) => {
  try {
    scaleService.startReading((weight) => {
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'weight',
            data: weight,
            timestamp: new Date().toISOString()
          }));
        }
      });
    });
    res.json({ success: true, message: 'Scale reading started' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/scale/stop', async (req, res) => {
  try {
    scaleService.stopReading();
    res.json({ success: true, message: 'Scale reading stopped' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/scale/tare', async (req, res) => {
  try {
    await scaleService.tare();
    res.json({ success: true, message: 'Scale tared' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to POS Hardware Bridge',
    timestamp: new Date().toISOString()
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  scannerService.stop();
  scaleService.stopReading();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

server.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════╗`);
  console.log(`║   POS Hardware Bridge Service          ║`);
  console.log(`║   Running on: http://localhost:${PORT}   ║`);
  console.log(`║   WebSocket: ws://localhost:${PORT}      ║`);
  console.log(`╚════════════════════════════════════════╝\n`);
});
