const escpos = require('escpos');
escpos.USB = require('escpos-usb');

class PrinterService {
  constructor() {
    this.printer = null;
    this.device = null;
  }

  async listDevices() {
    try {
      const devices = escpos.USB.findPrinter();
      return devices.map(device => ({
        vendorId: device.deviceDescriptor.idVendor,
        productId: device.deviceDescriptor.idProduct,
        manufacturer: device.deviceDescriptor.iManufacturer,
        product: device.deviceDescriptor.iProduct
      }));
    } catch (error) {
      console.error('Error listing printers:', error);
      return [];
    }
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
            console.log('Receipt printer connected');
            resolve();
          }
        });
      });
    } catch (error) {
      console.error('Error connecting to printer:', error);
      throw error;
    }
  }

  disconnect() {
    if (this.device) {
      try {
        this.device.close();
        this.printer = null;
        this.device = null;
        console.log('Receipt printer disconnected');
      } catch (error) {
        console.error('Error disconnecting printer:', error);
      }
    }
  }

  async print(content, options = {}) {
    if (!this.printer) {
      throw new Error('Printer not connected');
    }

    return new Promise((resolve, reject) => {
      try {
        const {
          paperSize = 80,
          align = 'left',
          bold = false,
          fontSize = 'normal'
        } = options;

        this.printer
          .font('a')
          .align(align)
          .style(bold ? 'bu' : 'normal');

        if (fontSize === 'large') {
          this.printer.size(2, 2);
        } else if (fontSize === 'medium') {
          this.printer.size(1, 1);
        }

        if (Array.isArray(content)) {
          content.forEach(item => {
            if (item.type === 'text') {
              this.printer.text(item.value);
            } else if (item.type === 'barcode') {
              this.printer.barcode(item.value, 'CODE128', {
                width: 2,
                height: 50
              });
            } else if (item.type === 'qr') {
              this.printer.qrcode(item.value, {
                type: 'qrcode',
                size: 5
              });
            } else if (item.type === 'line') {
              this.printer.drawLine();
            } else if (item.type === 'newline') {
              this.printer.newLine();
            }
          });
        } else {
          this.printer.text(content);
        }

        this.printer
          .newLine()
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

  async printReceipt(receiptData) {
    const content = [
      { type: 'text', value: `${receiptData.businessName}\n` },
      { type: 'text', value: `${receiptData.address}\n` },
      { type: 'text', value: `Tel: ${receiptData.phone}\n` },
      { type: 'line' },
      { type: 'text', value: `Date: ${receiptData.date}\n` },
      { type: 'text', value: `Receipt #: ${receiptData.receiptNumber}\n` },
      { type: 'line' },
      ...receiptData.items.map(item => ({
        type: 'text',
        value: `${item.name} x${item.quantity}\n  $${item.price.toFixed(2)}\n`
      })),
      { type: 'line' },
      { type: 'text', value: `Subtotal: $${receiptData.subtotal.toFixed(2)}\n` },
      { type: 'text', value: `Tax: $${receiptData.tax.toFixed(2)}\n` },
      { type: 'text', value: `TOTAL: $${receiptData.total.toFixed(2)}\n` },
      { type: 'line' },
      { type: 'text', value: `Payment: ${receiptData.paymentMethod}\n` },
      { type: 'newline' },
      { type: 'barcode', value: receiptData.barcode },
      { type: 'newline' },
      { type: 'text', value: 'Thank you for your business!\n' }
    ];

    return this.print(content);
  }

  async printTest() {
    const testContent = [
      { type: 'text', value: '================================\n' },
      { type: 'text', value: '     PRINTER TEST PAGE\n' },
      { type: 'text', value: '================================\n' },
      { type: 'newline' },
      { type: 'text', value: 'This is a test print.\n' },
      { type: 'text', value: `Date: ${new Date().toLocaleString()}\n` },
      { type: 'newline' },
      { type: 'text', value: 'Test barcode:\n' },
      { type: 'barcode', value: '1234567890' },
      { type: 'newline' },
      { type: 'text', value: 'If you can read this,\n' },
      { type: 'text', value: 'your printer is working!\n' },
      { type: 'newline' }
    ];

    return this.print(testContent);
  }

  async openCashDrawer() {
    if (!this.printer) {
      throw new Error('Printer not connected');
    }

    return new Promise((resolve, reject) => {
      try {
        this.printer.cashdraw(2);
        this.printer.close((error) => {
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
}

module.exports = new PrinterService();
