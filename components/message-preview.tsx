"use client"

import { Card, CardContent } from "@/components/ui/card"
import { useWhatsAppStore, type Message, type PlatformType, type MessageType } from "@/lib/store"
import Image from "next/image"
// Atualize a importação dos ícones
import { MessageSquare, Phone, BookOpen, ArrowLeft, ArrowRight, Maximize, Youtube } from "lucide-react"

interface MessagePreviewProps {
  message: Message | null
}

// Ícone personalizado para mãos em oração
const PrayingHandsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-red-500"
  >
    <path d="M6 7.5a3.5 3.5 0 0 1 5 0l1 1.25a3.5 3.5 0 0 1 5 0V20a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-4" />
    <path d="M10.5 12.5a3.5 3.5 0 0 1 5 0v7.5" />
    <path d="M18 7.5a3.5 3.5 0 1 0-7 0l1 1.25a3.5 3.5 0 1 0 5 0" />
  </svg>
)

export default function MessagePreview({ message }: MessagePreviewProps) {
  const { displayConfig, programs, displayedMessages } = useWhatsAppStore()

  if (!message) {
    return (
      <Card className="w-full h-32 flex items-center justify-center bg-muted/50">
        <p className="text-muted-foreground text-sm">Selecione uma mensagem para pré-visualizar</p>
      </Card>
    )
  }

  // Renderizar ícone de plataforma
  const renderPlatformIcon = (platform: PlatformType) => {
    switch (platform) {
      case "whatsapp":
        return <MessageSquare className="h-4 w-4 text-green-600" />
      case "youtube":
        return <Youtube className="h-4 w-4 text-red-600" />
      case "phone":
        return <Phone className="h-4 w-4 text-purple-600" />
      default:
        return null
    }
  }

  // Renderizar ícone de tipo de mensagem
  const renderMessageTypeIcon = (messageType?: MessageType) => {
    switch (messageType) {
      case "prayer":
        return <PrayingHandsIcon />
      case "testimony":
        return <BookOpen className="h-4 w-4 text-green-500" />
      default:
        return null
    }
  }

  // Obter nome da plataforma
  const getPlatformName = (platform: PlatformType) => {
    switch (platform) {
      case "whatsapp":
        return "WhatsApp"
      case "youtube":
        return "YouTube"
      case "phone":
        return "Telefone"
      default:
        return ""
    }
  }

  // Obter nome do programa
  const getProgramName = (programId?: string) => {
    if (!programId) return null
    const program = programs.find((p) => p.id === programId)
    return program ? program.name : null
  }

  const hasMultipleMessages = displayedMessages.length > 1

  return (
    <Card className="w-full overflow-hidden border border-primary/30">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          {message.senderAvatar && (
            <Image
              src={message.senderAvatar || "/placeholder.svg"}
              alt={message.sender}
              width={20}
              height={20}
              className="rounded-full"
              unoptimized
            />
          )}
          <span className="font-medium text-sm">{message.sender}</span>
          <div className="flex items-center ml-auto">
            {renderPlatformIcon(message.platform)}
            <span className="text-xs ml-1">{getPlatformName(message.platform)}</span>
          </div>
        </div>
        <p className="text-sm line-clamp-2">{message.editedContent || message.content}</p>
        <div className="flex items-center mt-1 text-xs text-muted-foreground">
          {message.messageType && message.messageType !== "normal" && (
            <div className="flex items-center mr-2">
              {renderMessageTypeIcon(message.messageType)}
              <span className="ml-1">
                {message.messageType === "prayer" ? "Oração" : message.messageType === "testimony" ? "Testemunho" : ""}
              </span>
            </div>
          )}
          {message.programId && getProgramName(message.programId) && (
            <span className="ml-auto">{getProgramName(message.programId)}</span>
          )}
        </div>

        {hasMultipleMessages && (
          <div className="mt-3 pt-2 border-t border-dashed border-gray-200 text-xs text-muted-foreground flex items-center justify-center">
            <ArrowLeft className="h-3 w-3 mr-1" />
            <span>Use as setas do teclado para navegar entre mensagens</span>
            <ArrowRight className="h-3 w-3 ml-1" />
          </div>
        )}
        <div className="mt-1 text-xs text-muted-foreground text-center">
          <Maximize className="h-3 w-3 inline mr-1" />
          <span>Pressione F para alternar o modo de tela cheia</span>
        </div>
      </CardContent>
    </Card>
  )
}
