import { NextResponse } from "next/server"
import { whatsappClientManager } from "@/lib/whatsapp-client"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST() {
  try {
    console.log("[API /whatsapp/init] Iniciando conexão WhatsApp")

    await whatsappClientManager.initialize()

    console.log("[API /whatsapp/init] Inicialização concluída")

    return NextResponse.json(
      {
        success: true,
        message: "Inicialização do WhatsApp iniciada com sucesso",
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    console.error("[API /whatsapp/init] Erro:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao inicializar WhatsApp",
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
