import { NextResponse } from "next/server"
import { whatsappManager } from "@/lib/whatsapp-manager"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST() {
  try {
    console.log("[API /whatsapp/init] Iniciando conexão WhatsApp")

    // Verificar se está disponível
    if (!whatsappManager.isAvailable()) {
      console.error("[API /whatsapp/init] WhatsApp não disponível")
      return NextResponse.json(
        {
          success: false,
          error: "WhatsApp Web.js não está disponível. Instale: npm install whatsapp-web.js qrcode puppeteer",
        },
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
    }

    // Inicializar
    await whatsappManager.initialize()

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
