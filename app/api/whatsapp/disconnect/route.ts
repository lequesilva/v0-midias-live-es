import { NextResponse } from "next/server"
import { whatsappClientManager } from "@/lib/whatsapp-client"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST() {
  try {
    console.log("[API /whatsapp/disconnect] Desconectando WhatsApp")

    await whatsappClientManager.logout()

    console.log("[API /whatsapp/disconnect] Desconexão concluída")

    return NextResponse.json(
      {
        success: true,
        message: "WhatsApp desconectado com sucesso",
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  } catch (error) {
    console.error("[API /whatsapp/disconnect] Erro:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao desconectar WhatsApp",
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
