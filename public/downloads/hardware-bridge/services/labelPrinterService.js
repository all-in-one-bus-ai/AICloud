const escpos = require('escpos');
escpos.USB = require('escpos-usb');

class LabelPrinterService {
  constructor() {
    this.printer = null;
    this.device = null;
  }

  async connect(vendorId, productId) {
    try {
      if (this.printer) {
        this.disconnect();
      }

      this.device = new escpos.USB(vendorId, productId);
      this.printer = new escpos.Printer(this.device);

      return new Promise((resolve, reject) => {
        this.device.open((error) => {
          if (error) {
            reject(error);
          } else {
            console.log('Label printer connected');
            resolve();
          }
        });
      });
    } catch (error) {
      console.error('Error connecting to label printer:', error);
      throw error;
    }
  }

  disconnect() {
    if (this.device) {
      try {
        this.device.close();
        this.printer = null;
        this.device = null;
        console.log('Label printer disconnected');
      } catch (error) {
        console.error('Error disconnecting label printer:', error);
      }
    }
  }

  async printLabel(barcode, productName, price, options = {}) {
    if (!this.printer) {
      throw new Error('Label printer not connected');
    }

    return new Promise((resolve, reject) => {
      try {
        const {
          labelSize = '2x1',
          barcodeFormat = 'CODE128',
          printProductName = true,
          printPrice = true
        } = options;

        this.printer.align('center').font('a');

        if (printProductName && productName) {
          this.printer.size(1, 1).text(productName + '\n');
        }

        this.printer.barcode(barcode, barcodeFormat, {
          width: 2,
          height: 50,
          includetext: true
        });

        this.printer.newLine();

        if (printPrice && price !== undefined) {
          this.printer.size(1, 1).text(`$${price.toFixed(2)}\n`);
        }

        this.printer
          .newLine()
          .cut()
          .close((error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
      } catch (error) {
        reject(error);
      }
    });
  }

  async printTest() {
    const testContent = {
      barcode: '1234567890',
      productName: 'Test Product',
      price: 9.99,
      options: {
        printProductName: true,
        printPrice: true
      }
    };

    return this.printLabel(
      testContent.barcode,
      testContent.productName,
      testContent.price,
      testContent.options
    );
  }
}

module.exports = new LabelPrinterService();
