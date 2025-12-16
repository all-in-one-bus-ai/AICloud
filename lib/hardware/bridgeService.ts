class HardwareBridgeService {
  private baseUrl: string;
  private ws: WebSocket | null = null;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();

  constructor() {
    this.baseUrl = 'http://localhost:3001';
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  connectWebSocket(onMessage?: (type: string, data: any) => void) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket('ws://localhost:3001');

      this.ws.onopen = () => {
        console.log('Connected to hardware bridge');
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (onMessage) {
            onMessage(message.type, message.data);
          }
          const handler = this.messageHandlers.get(message.type);
          if (handler) {
            handler(message.data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('Disconnected from hardware bridge');
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (!this.reconnectInterval) {
      this.reconnectInterval = setInterval(() => {
        console.log('Attempting to reconnect to hardware bridge...');
        this.connectWebSocket();
      }, 5000);
    }
  }

  disconnectWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }

  onMessage(type: string, handler: (data: any) => void) {
    this.messageHandlers.set(type, handler);
  }

  async listDevices() {
    const response = await fetch(`${this.baseUrl}/devices/list`);
    return response.json();
  }

  async connectReceiptPrinter(vendorId: number, productId: number) {
    const response = await fetch(`${this.baseUrl}/printer/receipt/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorId, productId })
    });
    return response.json();
  }

  async printReceipt(content: any, options?: any) {
    const response = await fetch(`${this.baseUrl}/printer/receipt/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, options })
    });
    return response.json();
  }

  async testReceiptPrinter() {
    const response = await fetch(`${this.baseUrl}/printer/receipt/test`, {
      method: 'POST'
    });
    return response.json();
  }

  async connectLabelPrinter(vendorId: number, productId: number) {
    const response = await fetch(`${this.baseUrl}/printer/label/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorId, productId })
    });
    return response.json();
  }

  async printLabel(barcode: string, productName: string, price: number, options?: any) {
    const response = await fetch(`${this.baseUrl}/printer/label/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barcode, productName, price, options })
    });
    return response.json();
  }

  async testLabelPrinter() {
    const response = await fetch(`${this.baseUrl}/printer/label/test`, {
      method: 'POST'
    });
    return response.json();
  }

  async startScanner(devicePath?: string) {
    const response = await fetch(`${this.baseUrl}/scanner/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ devicePath })
    });
    return response.json();
  }

  async stopScanner() {
    const response = await fetch(`${this.baseUrl}/scanner/stop`, {
      method: 'POST'
    });
    return response.json();
  }

  async connectScale(port: string) {
    const response = await fetch(`${this.baseUrl}/scale/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ port })
    });
    return response.json();
  }

  async startScale() {
    const response = await fetch(`${this.baseUrl}/scale/start`, {
      method: 'POST'
    });
    return response.json();
  }

  async stopScale() {
    const response = await fetch(`${this.baseUrl}/scale/stop`, {
      method: 'POST'
    });
    return response.json();
  }

  async tareScale() {
    const response = await fetch(`${this.baseUrl}/scale/tare`, {
      method: 'POST'
    });
    return response.json();
  }

  async openCashDrawer() {
    const response = await fetch(`${this.baseUrl}/cash-drawer/open`, {
      method: 'POST'
    });
    return response.json();
  }
}

export const hardwareBridge = new HardwareBridgeService();
