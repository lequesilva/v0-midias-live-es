import { NextResponse } from "next/server"
import { whatsappManager } from "@/lib/whatsapp-manager"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    console.log("[API /whatsapp/send] Recebendo requisição")

    const body = await request.json()
    const { phoneNumber, message } = body

    console.log("[API /whatsapp/send] Número:", phoneNumber)
    console.log("[API /whatsapp/send] Mensagem:", message)

    if (!phoneNumber || !message) {
      return NextResponse.json(
        {
          success: false,
          error: "Número de telefone e mensagem são obrigatórios",
        },
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
    }

    // Verificar se está conectado
    if (!whatsappManager.isReady()) {
      return NextResponse.json(
        {
          success: false,
          error: "WhatsApp não está conectado. Status: " + whatsappManager.getStatus(),
        },
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
    }

    // Enviar mensagem
    await whatsappManager.sendMessage(phoneNumber, message)

    console.log("[API /whatsapp/send] Mensagem enviada com sucesso")

    return NextResponse.json(
      {
        success: true,
        message: "Mensagem enviada com sucesso",
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    console.error("[API /whatsapp/send] Erro:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao enviar mensagem",
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }
}
