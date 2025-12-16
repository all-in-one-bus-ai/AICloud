const { SerialPort } = require('serialport');

class ScaleService {
  constructor() {
    this.port = null;
    this.callback = null;
    this.isReading = false;
    this.buffer = '';
    this.tareWeight = 0;
  }

  async listDevices() {
    try {
      const ports = await SerialPort.list();
      return ports.map(port => ({
        path: port.path,
        manufacturer: port.manufacturer,
        serialNumber: port.serialNumber,
        pnpId: port.pnpId,
        vendorId: port.vendorId,
        productId: port.productId
      }));
    } catch (error) {
      console.error('Error listing scale devices:', error);
      return [];
    }
  }

  async connect(portPath, options = {}) {
    try {
      if (this.port && this.port.isOpen) {
        await this.disconnect();
      }

      const {
        baudRate = 9600,
        dataBits = 8,
        stopBits = 1,
        parity = 'none'
      } = options;

      this.port = new SerialPort({
        path: portPath,
        baudRate,
        dataBits,
        stopBits,
        parity
      });

      return new Promise((resolve, reject) => {
        this.port.on('open', () => {
          console.log('Scale connected');
          resolve();
        });

        this.port.on('error', (error) => {
          console.error('Scale connection error:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error connecting to scale:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.port && this.port.isOpen) {
      this.stopReading();
      return new Promise((resolve, reject) => {
        this.port.close((error) => {
          if (error) {
            reject(error);
          } else {
            this.port = null;
            console.log('Scale disconnected');
            resolve();
          }
        });
      });
    }
  }

  startReading(callback) {
    if (!this.port || !this.port.isOpen) {
      throw new Error('Scale not connected');
    }

    this.callback = callback;
    this.isReading = true;

    this.port.on('data', (data) => {
      this.buffer += data.toString();

      const lines = this.buffer.split('\n');
      this.buffer = lines.pop();

      lines.forEach(line => {
        const weight = this.parseWeight(line);
        if (weight !== null && this.callback) {
          this.callback({
            weight: weight - this.tareWeight,
            unit: 'kg',
            stable: true,
            raw: line.trim()
          });
        }
      });
    });

    console.log('Scale reading started');
  }

  parseWeight(data) {
    try {
      data = data.trim();

      const patterns = [
        /(\d+\.?\d*)\s*kg/i,
        /(\d+\.?\d*)\s*lb/i,
        /(\d+\.?\d*)\s*g/i,
        /ST,GS,\s*(\d+\.?\d*)/i,
        /(\d+\.\d+)/
      ];

      for (const pattern of patterns) {
        const match = data.match(pattern);
        if (match) {
          const weight = parseFloat(match[1]);
          if (!isNaN(weight)) {
            return weight;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error parsing weight:', error);
      return null;
    }
  }

  stopReading() {
    if (this.port) {
      this.port.removeAllListeners('data');
    }
    this.callback = null;
    this.isReading = false;
    this.buffer = '';
    console.log('Scale reading stopped');
  }

  async tare() {
    if (!this.port || !this.port.isOpen) {
      throw new Error('Scale not connected');
    }

    return new Promise((resolve, reject) => {
      const tempCallback = (data) => {
        this.tareWeight = data.weight + this.tareWeight;
        this.stopReading();
        if (this.callback) {
          this.startReading(this.callback);
        }
        resolve(this.tareWeight);
      };

      const wasReading = this.isReading;
      const originalCallback = this.callback;

      if (wasReading) {
        this.stopReading();
      }

      this.startReading(tempCallback);

      setTimeout(() => {
        if (wasReading) {
          this.stopReading();
          this.startReading(originalCallback);
        } else {
          this.stopReading();
        }
        reject(new Error('Tare timeout'));
      }, 3000);
    });
  }

  resetTare() {
    this.tareWeight = 0;
  }

  async calibrate(knownWeight) {
    console.log(`Calibrating with known weight: ${knownWeight}`);
  }
}

module.exports = new ScaleService();
