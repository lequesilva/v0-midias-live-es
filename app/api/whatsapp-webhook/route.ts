import { type NextRequest, NextResponse } from "next/server"
import { WhatsAppBusinessAPI } from "@/lib/whatsapp-business"

const whatsappAPI = new WhatsAppBusinessAPI()

// Verificação do webhook (GET)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("Webhook verificado com sucesso!")
    return new NextResponse(challenge)
  }

  return new NextResponse("Forbidden", { status: 403 })
}

// Recebimento de mensagens (POST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Verificar se é uma notificação de mensagem
    if (body.object === "whatsapp_business_account") {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === "messages") {
            const value = change.value

            // Processar mensagens recebidas
            if (value.messages) {
              for (const message of value.messages) {
                await processIncomingMessage(message, value.contacts?.[0], value.metadata)
              }
            }

            // Processar status de mensagens
            if (value.statuses) {
              for (const status of value.statuses) {
                await processMessageStatus(status)
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ status: "success" })
  } catch (error) {
    console.error("Erro ao processar webhook:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function processIncomingMessage(message: any, contact: any, metadata: any) {
  try {
    console.log("Processando mensagem:", message)

    const messageData = {
      id: message.id,
      from: message.from,
      timestamp: new Date(Number.parseInt(message.timestamp) * 1000),
      type: message.type,
      contact: {
        name: contact?.profile?.name || contact?.wa_id || "Usuário",
        phone: message.from,
        profilePicture: null,
      },
      content: await extractMessageContent(message),
      platform: "whatsapp" as const,
      status: "received" as const,
    }

    // Tentar obter foto de perfil
    try {
      const profilePicture = await whatsappAPI.getProfilePicture(message.from)
      if (profilePicture) {
        messageData.contact.profilePicture = profilePicture
      }
    } catch (error) {
      console.log("Não foi possível obter foto de perfil:", error)
    }

    // Aqui você pode integrar com seu sistema de mensagens
    // Por exemplo, salvar no banco de dados ou enviar via WebSocket
    console.log("Mensagem processada:", messageData)

    // Exemplo de como você pode integrar com o store do sistema
    if (typeof window !== "undefined") {
      // Emitir evento customizado para o frontend
      window.dispatchEvent(
        new CustomEvent("whatsapp-message", {
          detail: messageData,
        }),
      )
    }
  } catch (error) {
    console.error("Erro ao processar mensagem:", error)
  }
}

async function extractMessageContent(message: any) {
  switch (message.type) {
    case "text":
      return {
        type: "text",
        text: message.text.body,
      }

    case "image":
      return {
        type: "image",
        caption: message.image.caption || "",
        mediaId: message.image.id,
        mimeType: message.image.mime_type,
      }

    case "video":
      return {
        type: "video",
        caption: message.video.caption || "",
        mediaId: message.video.id,
        mimeType: message.video.mime_type,
      }

    case "audio":
      return {
        type: "audio",
        mediaId: message.audio.id,
        mimeType: message.audio.mime_type,
      }

    case "document":
      return {
        type: "document",
        filename: message.document.filename,
        mediaId: message.document.id,
        mimeType: message.document.mime_type,
      }

    default:
      return {
        type: "unknown",
        text: `Tipo de mensagem não suportado: ${message.type}`,
      }
  }
}

async function processMessageStatus(status: any) {
  console.log("Status da mensagem:", status)
  // Aqui você pode atualizar o status das mensagens enviadas
}
