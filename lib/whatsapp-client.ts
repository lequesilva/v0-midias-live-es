import { Client, LocalAuth } from 'whatsapp-web.js';
import QRCode from 'qrcode';

class WhatsAppClientManager {
  private client: any = null;
  private qrCode: string | null = null;
  private isReady: boolean = false;
  private isAuthenticated: boolean = false;
  private listeners: Map<string, Set<Function>> = new Map();

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: '.wwebjs_auth'
      }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.on('qr', async (qr: string) => {
      try {
        this.qrCode = await QRCode.toDataURL(qr);
        this.isAuthenticated = false;
        this.emit('qr', this.qrCode);
      } catch (err) {
        console.error('Error generating QR code:', err);
      }
    });

    this.client.on('ready', () => {
      this.isReady = true;
      this.isAuthenticated = true;
      this.qrCode = null;
      this.emit('ready', { ready: true, authenticated: true });
    });

    this.client.on('authenticated', () => {
      this.isAuthenticated = true;
      this.emit('authenticated', { authenticated: true });
    });

    this.client.on('auth_failure', (msg: any) => {
      this.isAuthenticated = false;
      this.emit('auth_failure', { error: msg });
    });

    this.client.on('disconnected', (reason: string) => {
      this.isReady = false;
      this.isAuthenticated = false;
      this.qrCode = null;
      this.emit('disconnected', { reason });
    });

    this.client.on('message', (message: any) => {
      this.emit('message', message);
    });
  }

  public async initialize(): Promise<void> {
    if (!this.client.pupBrowser) {
      await this.client.initialize();
    }
  }

  public async getStatus() {
    return {
      isReady: this.isReady,
      isAuthenticated: this.isAuthenticated,
      qrCode: this.qrCode,
      hasClient: !!this.client
    };
  }

  public async logout(): Promise<void> {
    if (this.client) {
      await this.client.logout();
      this.isReady = false;
      this.isAuthenticated = false;
      this.qrCode = null;
    }
  }

  public async destroy(): Promise<void> {
    if (this.client) {
      await this.client.destroy();
      this.isReady = false;
      this.isAuthenticated = false;
      this.qrCode = null;
    }
  }

  public async sendMessage(number: string, message: string): Promise<any> {
    if (!this.isReady) {
      throw new Error('WhatsApp client is not ready');
    }
    const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
    return await this.client.sendMessage(chatId, message);
  }

  public on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  public off(event: string, callback: Function) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  public getClient() {
    return this.client;
  }
}

export const whatsappClientManager = new WhatsAppClientManager();
