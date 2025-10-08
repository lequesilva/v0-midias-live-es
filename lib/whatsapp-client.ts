import { Client, LocalAuth } from 'whatsapp-web.js';
import QRCode from 'qrcode';

class WhatsAppClientManager {
  private client: any = null;
  private qrCode: string | null = null;
  private isReady: boolean = false;
  private isAuthenticated: boolean = false;
  private isInitializing: boolean = false;
  private listeners: Map<string, Set<Function>> = new Map();
  private initializationError: string | null = null;

  constructor() {
  }

  private createClient() {
    try {
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
            '--disable-gpu',
            '--single-process',
            '--disable-extensions'
          ]
        }
      });

      this.setupEventHandlers();
      return true;
    } catch (error: any) {
      console.error('Error creating WhatsApp client:', error);
      this.initializationError = error.message || 'Failed to create client';
      return false;
    }
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
    if (this.isInitializing) {
      throw new Error('Client is already initializing');
    }

    if (this.isReady) {
      return;
    }

    this.isInitializing = true;
    this.initializationError = null;

    try {
      if (!this.client) {
        const created = this.createClient();
        if (!created) {
          throw new Error(this.initializationError || 'Failed to create client');
        }
      }

      if (!this.client.pupBrowser) {
        console.log('Initializing WhatsApp client...');
        await this.client.initialize();
      }
    } catch (error: any) {
      console.error('Error initializing WhatsApp client:', error);
      this.initializationError = error.message || 'Initialization failed';
      this.isInitializing = false;
      this.emit('error', { error: this.initializationError });
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  public async getStatus() {
    return {
      isReady: this.isReady,
      isAuthenticated: this.isAuthenticated,
      qrCode: this.qrCode,
      hasClient: !!this.client,
      isInitializing: this.isInitializing,
      error: this.initializationError
    };
  }

  public async logout(): Promise<void> {
    try {
      if (this.client && this.client.pupBrowser) {
        await this.client.logout();
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      this.isReady = false;
      this.isAuthenticated = false;
      this.qrCode = null;
      this.initializationError = null;
    }
  }

  public async destroy(): Promise<void> {
    try {
      if (this.client && this.client.pupBrowser) {
        await this.client.destroy();
      }
    } catch (error) {
      console.error('Error during destroy:', error);
    } finally {
      this.client = null;
      this.isReady = false;
      this.isAuthenticated = false;
      this.qrCode = null;
      this.isInitializing = false;
      this.initializationError = null;
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
