export interface WhatsAppMessage {
  id: string
  from: string
  timestamp: Date
  type: "text" | "image" | "video" | "audio" | "document"
  contact: {
    name: string
    phone: string
    profilePicture?: string | null
  }
  content: any
  platform: "whatsapp"
  status: "received" | "sent" | "delivered" | "read" | "failed"
}

export interface WhatsAppContact {
  wa_id: string
  profile?: {
    name: string
  }
}

export class WhatsAppBusinessAPI {
  private baseUrl = "https://graph.facebook.com/v18.0"
  private phoneNumberId: string
  private accessToken: string

  constructor() {
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || ""
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || ""
  }

  async sendMessage(to: string, message: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to,
          type: "text",
          text: {
            body: message,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Erro ao enviar mensagem: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error)
      throw error
    }
  }

  async sendTemplateMessage(to: string, templateName: string, languageCode = "pt_BR"): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to,
          type: "template",
          template: {
            name: templateName,
            language: {
              code: languageCode,
            },
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Erro ao enviar template: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Erro ao enviar template:", error)
      throw error
    }
  }

  async getProfilePicture(phoneNumber: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${phoneNumber}/profile_pic`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return data.url || null
    } catch (error) {
      console.error("Erro ao obter foto de perfil:", error)
      return null
    }
  }

  async downloadMedia(mediaId: string): Promise<Blob | null> {
    try {
      // Primeiro, obter a URL do media
      const mediaResponse = await fetch(`${this.baseUrl}/${mediaId}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      })

      if (!mediaResponse.ok) {
        throw new Error("Erro ao obter informações do media")
      }

      const mediaData = await mediaResponse.json()

      // Depois, baixar o arquivo
      const fileResponse = await fetch(mediaData.url, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      })

      if (!fileResponse.ok) {
        throw new Error("Erro ao baixar arquivo")
      }

      return await fileResponse.blob()
    } catch (error) {
      console.error("Erro ao baixar media:", error)
      return null
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      })

      return response.ok
    } catch (error) {
      console.error("Erro ao verificar conexão:", error)
      return false
    }
  }

  async getBusinessProfile(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error("Erro ao obter perfil do negócio")
      }

      return await response.json()
    } catch (error) {
      console.error("Erro ao obter perfil do negócio:", error)
      throw error
    }
  }
}

// Instância singleton para uso em toda a aplicação
export const whatsappBusinessAPI = new WhatsAppBusinessAPI()
