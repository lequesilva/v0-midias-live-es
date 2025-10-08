// Importações diretas sem dynamic import
let Client: any = null
let LocalAuth: any = null
let qrcode: any = null
let modulesLoaded = false

// Tentar carregar módulos imediatamente
try {
  const whatsappWeb = require("whatsapp-web.js")
  Client = whatsappWeb.Client
  LocalAuth = whatsappWeb.LocalAuth
  qrcode = require("qrcode")
  modulesLoaded = true
  console.log("[WhatsAppManager] Módulos carregados com sucesso")
} catch (error) {
  console.error("[WhatsAppManager] Erro ao carregar módulos:", error)
  modulesLoaded = false
}

type WhatsAppStatus = "INITIALIZING" | "QR_PENDING" | "READY" | "DISCONNECTED" | "AUTH_FAILURE" | "NOT_AVAILABLE"

class WhatsAppManager {
  private client: any = null
  private status: WhatsAppStatus = "DISCONNECTED"
  private qrCodeData: string | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3
  private reconnectTimeout: NodeJS.Timeout | null = null
  private isInitializing = false

  constructor() {
    if (!modulesLoaded) {
      this.status = "NOT_AVAILABLE"
      console.log("[WhatsAppManager] Status inicial: NOT_AVAILABLE")
    } else {
      console.log("[WhatsAppManager] Status inicial: DISCONNECTED")
    }
  }

  async initialize(): Promise<void> {
    console.log("[WhatsAppManager] Método initialize() chamado")
    console.log("[WhatsAppManager] modulesLoaded:", modulesLoaded)
    console.log("[WhatsAppManager] Client:", Client !== null)
    console.log("[WhatsAppManager] LocalAuth:", LocalAuth !== null)
    console.log("[WhatsAppManager] qrcode:", qrcode !== null)

    // Verificar se os módulos estão disponíveis
    if (!modulesLoaded || !Client || !LocalAuth || !qrcode) {
      this.status = "NOT_AVAILABLE"
      const errorMsg = "WhatsApp Web.js não está disponível. Instale as dependências necessárias."
      console.error("[WhatsAppManager]", errorMsg)
      throw new Error(errorMsg)
    }

    // Evitar múltiplas inicializações simultâneas
    if (this.isInitializing) {
      console.log("[WhatsAppManager] Inicialização já em andamento")
      return
    }

    if (this.client) {
      console.log("[WhatsAppManager] Cliente já existe, destruindo...")
      await this.disconnect()
    }

    this.isInitializing = true
    this.status = "INITIALIZING"
    console.log("[WhatsAppManager] Inicializando cliente WhatsApp...")

    try {
      console.log("[WhatsAppManager] Criando nova instância do Client...")
      this.client = new Client({
        authStrategy: new LocalAuth({ clientId: "whatsapp-session" }),
        puppeteer: {
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--disable-gpu",
          ],
        },
      })

      console.log("[WhatsAppManager] Cliente criado, configurando event handlers...")
      this.setupEventHandlers()

      console.log("[WhatsAppManager] Chamando client.initialize()...")
      await this.client.initialize()
      console.log("[WhatsAppManager] Cliente inicializado com sucesso")
    } catch (error) {
      console.error("[WhatsAppManager] Erro ao inicializar:", error)
      this.status = "AUTH_FAILURE"
      throw error
    } finally {
      this.isInitializing = false
    }
  }

  private setupEventHandlers(): void {
    if (!this.client) return

    this.client.on("qr", async (qr: string) => {
      console.log("[WhatsAppManager] QR Code gerado")
      this.status = "QR_PENDING"

      try {
        this.qrCodeData = await qrcode.toDataURL(qr)
        console.log("[WhatsAppManager] QR Code convertido para Data URL")
      } catch (error) {
        console.error("[WhatsAppManager] Erro ao gerar QR Code:", error)
      }
    })

    this.client.on("ready", () => {
      console.log("[WhatsAppManager] WhatsApp pronto!")
      this.status = "READY"
      this.qrCodeData = null
      this.reconnectAttempts = 0
    })

    this.client.on("authenticated", () => {
      console.log("[WhatsAppManager] Autenticado")
    })

    this.client.on("auth_failure", (msg: any) => {
      console.error("[WhatsAppManager] Falha na autenticação:", msg)
      this.status = "AUTH_FAILURE"
      this.scheduleReconnect()
    })

    this.client.on("disconnected", (reason: string) => {
      console.log("[WhatsAppManager] Desconectado:", reason)
      this.status = "DISCONNECTED"
      this.qrCodeData = null

      if (reason !== "LOGOUT") {
        this.scheduleReconnect()
      }
    })

    this.client.on("message", async (message: any) => {
      console.log("[WhatsAppManager] Nova mensagem:", message.from, message.body)
    })

    this.client.on("loading_screen", (percent: number) => {
      console.log("[WhatsAppManager] Carregando:", percent + "%")
    })
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("[WhatsAppManager] Máximo de tentativas de reconexão atingido")
      return
    }

    this.reconnectAttempts++
    const delay = this.status === "AUTH_FAILURE" ? 5000 : 10000

    console.log(
      `[WhatsAppManager] Agendando reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts} em ${delay / 1000}s`,
    )

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }

    this.reconnectTimeout = setTimeout(async () => {
      console.log("[WhatsAppManager] Tentando reconectar...")
      try {
        await this.initialize()
      } catch (error) {
        console.error("[WhatsAppManager] Erro ao reconectar:", error)
      }
    }, delay)
  }

  async sendMessage(phoneNumber: string, message: string): Promise<void> {
    if (!this.client || this.status !== "READY") {
      throw new Error("WhatsApp não está conectado. Status atual: " + this.status)
    }

    const formattedNumber = phoneNumber.replace(/\D/g, "")
    const chatId = `${formattedNumber}@c.us`

    console.log(`[WhatsAppManager] Enviando mensagem para ${chatId}:`, message)

    try {
      await this.client.sendMessage(chatId, message)
      console.log("[WhatsAppManager] Mensagem enviada com sucesso")
    } catch (error) {
      console.error("[WhatsAppManager] Erro ao enviar mensagem:", error)
      throw new Error("Falha ao enviar mensagem. Verifique o número de telefone.")
    }
  }

  async disconnect(): Promise<void> {
    console.log("[WhatsAppManager] Desconectando...")

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.client) {
      try {
        await this.client.destroy()
        console.log("[WhatsAppManager] Cliente destruído com sucesso")
      } catch (error) {
        console.error("[WhatsAppManager] Erro ao destruir cliente:", error)
      }
      this.client = null
    }

    this.status = "DISCONNECTED"
    this.qrCodeData = null
    this.reconnectAttempts = 0
    this.isInitializing = false
  }

  getStatus(): WhatsAppStatus {
    return this.status
  }

  getQRCode(): string | null {
    return this.qrCodeData
  }

  isReady(): boolean {
    return this.status === "READY"
  }

  isAvailable(): boolean {
    return modulesLoaded && Client !== null && LocalAuth !== null && qrcode !== null
  }
}

// Singleton
export const whatsappManager = new WhatsAppManager()
