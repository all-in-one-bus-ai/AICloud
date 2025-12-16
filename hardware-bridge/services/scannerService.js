const HID = require('node-hid');

class ScannerService {
  constructor() {
    this.device = null;
    this.buffer = '';
    this.callback = null;
    this.isRunning = false;
  }

  listDevices() {
    try {
      const devices = HID.devices();
      const scanners = devices.filter(device => {
        return device.usagePage === 1 || device.usage === 6;
      });

      return scanners.map(device => ({
        vendorId: device.vendorId,
        productId: device.productId,
        manufacturer: device.manufacturer,
        product: device.product,
        path: device.path
      }));
    } catch (error) {
      console.error('Error listing scanners:', error);
      return [];
    }
  }

  start(devicePath, callback) {
    try {
      if (this.isRunning) {
        this.stop();
      }

      if (!devicePath) {
        const devices = this.listDevices();
        if (devices.length === 0) {
          console.log('No scanner devices found. Using keyboard input mode.');
          this.isRunning = true;
          this.callback = callback;
          return;
        }
        devicePath = devices[0].path;
      }

      this.device = new HID.HID(devicePath);
      this.callback = callback;
      this.isRunning = true;

      this.device.on('data', (data) => {
        this.processData(data);
      });

      this.device.on('error', (error) => {
        console.error('Scanner error:', error);
        this.stop();
      });

      console.log('Scanner started');
    } catch (error) {
      console.error('Error starting scanner:', error);
      this.isRunning = true;
      this.callback = callback;
      console.log('Fallback to keyboard input mode');
    }
  }

  processData(data) {
    for (let i = 0; i < data.length; i++) {
      const byte = data[i];

      if (byte === 0x28) {
        if (this.buffer.length > 0 && this.callback) {
          this.callback(this.buffer);
        }
        this.buffer = '';
      } else if (byte >= 0x04 && byte <= 0x1D) {
        const char = String.fromCharCode(byte + 0x5D);
        this.buffer += char;
      } else if (byte >= 0x1E && byte <= 0x27) {
        const char = String.fromCharCode(byte + 0x13);
        this.buffer += char;
      }
    }
  }

  processBarcodeFromKeyboard(barcode) {
    if (this.isRunning && this.callback) {
      this.callback(barcode);
    }
  }

  stop() {
    if (this.device) {
      try {
        this.device.close();
        this.device = null;
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
    this.buffer = '';
    this.callback = null;
    this.isRunning = false;
    console.log('Scanner stopped');
  }
}

module.exports = new ScannerService();
