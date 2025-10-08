import { NextResponse } from "next/server"
import { whatsappManager } from "@/lib/whatsapp-manager"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    console.log("[API /whatsapp/status] Verificando status")

    const status = whatsappManager.getStatus()
    const qrCode = whatsappManager.getQRCode()
    const isAvailable = whatsappManager.isAvailable()

    console.log("[API /whatsapp/status] Status:", status)
    console.log("[API /whatsapp/status] QR Code presente:", !!qrCode)
    console.log("[API /whatsapp/status] Disponível:", isAvailable)

    return NextResponse.json(
      {
        success: true,
        status,
        qrCode,
        isAvailable,
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    )
  } catch (error) {
    console.error("[API /whatsapp/status] Erro:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao verificar status",
        status: "DISCONNECTED",
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
