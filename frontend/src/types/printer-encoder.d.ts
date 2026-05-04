declare module '@point-of-sale/receipt-printer-encoder' {
  export interface ReceiptPrinterEncoderOptions {
    language: 'esc-pos' | 'star-line' | 'star-graphic';
    width?: number;
    characterSet?: string;
    codepage?: string;
  }

  export default class ReceiptPrinterEncoder {
    constructor(options: ReceiptPrinterEncoderOptions);
    initialize(): this;
    codepage(codepage: string): this;
    align(alignment: 'left' | 'center' | 'right'): this;
    size(size: 'normal' | 'double'): this;
    line(text: string): this;
    text(text: string): this;
    barcode(data: string, type: string, height: number): this;
    qrcode(data: string, options?: { model?: number; size?: number; errorlevel?: string }): this;
    image(data: Uint8Array, width: number, height: number, algorithm?: string, threshold?: number): this;
    cut(): this;
    encode(): Uint8Array;
  }
}
