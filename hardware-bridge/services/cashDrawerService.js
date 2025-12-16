const printerService = require('./printerService');

class CashDrawerService {
  constructor() {
    this.connectedTo = 'receipt_printer';
  }

  async open() {
    try {
      if (this.connectedTo === 'receipt_printer') {
        await printerService.openCashDrawer();
        console.log('Cash drawer opened via receipt printer');
      } else {
        throw new Error('Cash drawer connection method not supported');
      }
    } catch (error) {
      console.error('Error opening cash drawer:', error);
      throw error;
    }
  }

  setConnection(connectionType) {
    this.connectedTo = connectionType;
  }
}

module.exports = new CashDrawerService();
