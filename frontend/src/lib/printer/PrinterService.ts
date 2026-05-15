import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder';

export type PrinterConnectionType = 'bluetooth' | 'serial' | 'network';

export interface PrinterSettings {
  type: PrinterConnectionType;
  deviceId?: string;
  deviceName?: string;
  baudRate?: number;
  ipAddress?: string;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

export interface ReceiptData {
  orderId: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  amountReceived: number;
  change: number;
  cashierName?: string;
  tableName?: string;
  branchName?: string;
  branchAddress?: string;
  branchPhone?: string;
}

class PrinterService {
  private bluetoothCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private serialWriter: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private settings: PrinterSettings | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadSettings();
    }
  }

  private loadSettings() {
    const saved = localStorage.getItem('kioskflow_printer_settings');
    if (saved) {
      try {
        this.settings = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse printer settings', e);
      }
    }
  }

  saveSettings(settings: PrinterSettings) {
    this.settings = settings;
    localStorage.setItem('kioskflow_printer_settings', JSON.stringify(settings));
  }

  getSettings(): PrinterSettings | null {
    return this.settings;
  }

  async isConnected(): Promise<boolean> {
    if (this.settings?.type === 'bluetooth') {
      return !!this.bluetoothCharacteristic && !!this.bluetoothCharacteristic.service.device.gatt?.connected;
    }
    if (this.settings?.type === 'serial') {
      return !!this.serialWriter;
    }
    return false;
  }

  async connect(): Promise<boolean> {
    if (!this.settings) return false;

    try {
      if (this.settings.type === 'bluetooth') {
        const devices = await navigator.bluetooth.getDevices();
        const device = devices.find(d => d.id === this.settings?.deviceId);
        
        if (!device) return false;

        const server = await device.gatt?.connect();
        if (!server) return false;

        const services = await server.getPrimaryServices();
        for (const service of services) {
            const characteristics = await service.getCharacteristics();
            const writeChar = characteristics.find(c => 
                c.properties.write || c.properties.writeWithoutResponse
            );
            if (writeChar) {
                this.bluetoothCharacteristic = writeChar;
                break;
            }
        }

        return !!this.bluetoothCharacteristic;
      } 
      
      if (this.settings.type === 'serial') {
        const ports = await navigator.serial.getPorts();
        if (ports.length === 0) return false;
        
        const port = ports[0];
        await port.open({ baudRate: this.settings.baudRate || 9600 });
        if (!port.writable) return false;
        this.serialWriter = port.writable.getWriter();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Connection failed:', error);
      return false;
    }
  }

  async printReceipt(data: ReceiptData): Promise<boolean> {
    const encoder = new ReceiptPrinterEncoder({
      language: 'esc-pos',
      width: 48, // Standard for 80mm
    });

    encoder.initialize()
      .codepage('windows1258') // Vietnamese code page
      .align('center')
      .size('double')
      .line(data.branchName || 'KIOSKFLOW')
      .size('normal')
      if (data.branchAddress) encoder.line(data.branchAddress)
      if (data.branchPhone) encoder.line(`HOTLINE: ${data.branchPhone}`)
      
    encoder.line('------------------------------------------------')
      .align('left')
      .line(`Đơn hàng: #${data.orderId.slice(-8).toUpperCase()}`)
      .line(`Ngày: ${new Date().toLocaleString('vi-VN')}`)
      if (data.cashierName) encoder.line(`Thu ngân: ${data.cashierName}`)
      if (data.tableName) encoder.line(`Bàn: ${data.tableName}`)
      
    encoder.line('------------------------------------------------')
      .line('Sản phẩm                      SL      Thành tiền')
      .line('------------------------------------------------')

    data.items.forEach(item => {
      const name = item.name.length > 25 ? item.name.substring(0, 22) + '...' : item.name.padEnd(25);
      const qty = item.quantity.toString().padStart(3);
      const price = (item.price * item.quantity).toLocaleString('vi-VN').padStart(14);
      encoder.line(`${name}${qty}${price}`);
    });

    encoder.line('------------------------------------------------')
      .align('right')
      .line(`Tạm tính: ${data.subtotal.toLocaleString('vi-VN')} đ`)
      .line(`Thuế: ${data.tax.toLocaleString('vi-VN')} đ`)
      .line(`Giảm giá: ${data.discount.toLocaleString('vi-VN')} đ`)
      .size('double')
      .line(`TỔNG: ${data.total.toLocaleString('vi-VN')} đ`)
      .size('normal')
      .line('------------------------------------------------')
      .line(`Hình thức: ${data.paymentMethod}`)
      .line(`Khách đưa: ${data.amountReceived.toLocaleString('vi-VN')} đ`)
      .line(`Tiền thừa: ${data.change.toLocaleString('vi-VN')} đ`)
      .line('------------------------------------------------')
      .align('center')
      .line('Cảm ơn quý khách!')
      .line('Hẹn gặp lại!')
      .qrcode(data.orderId, { size: 6 })
      .line('')
      .line('')
      .cut();

    const bytes = encoder.encode();

    try {
      if (this.bluetoothCharacteristic) {
        const CHUNK_SIZE = 20;
        for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
          await this.bluetoothCharacteristic.writeValue(bytes.slice(i, i + CHUNK_SIZE));
        }
        return true;
      } 
      
      if (this.serialWriter) {
        await this.serialWriter.write(bytes);
        return true;
      }

      if (await this.connect()) {
        return this.printReceipt(data);
      }

      return false;
    } catch (error) {
      console.error('Printing failed:', error);
      return false;
    }
  }
}

export const printerService = new PrinterService();
