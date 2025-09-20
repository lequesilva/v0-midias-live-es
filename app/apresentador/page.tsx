"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useWhatsAppStore } from "@/lib/store"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { MessageSquare, Phone, BookOpen, RefreshCw, Youtube } from "lucide-react"
import Image from "next/image"

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

// Renderizar ícone de plataforma
const renderPlatformIcon = (platform) => {
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

export default function ApresentadorScreen() {
  const { displayedMessages, programs } = useWhatsAppStore()
  const [mounted, setMounted] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  useEffect(() => {
    setMounted(true)
  }, [])

  // Atualizar a cada 10 segundos
  useEffect(() => {
    if (!mounted) return

    const interval = setInterval(() => {
      setLastRefresh(new Date())
    }, 10000) // 10 segundos

    return () => clearInterval(interval)
  }, [mounted])

  if (!mounted) return null

  // Renderizar ícone de tipo de mensagem
  const renderMessageTypeIcon = (messageType) => {
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
  const getPlatformName = (platform) => {
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
  const getProgramName = (programId) => {
    if (!programId) return null
    const program = programs.find((p) => p.id === programId)
    return program ? program.name : null
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Mensagens para o Apresentador</CardTitle>
          <div className="flex items-center text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualização automática a cada 10 segundos
          </div>
        </CardHeader>
        <CardContent>
          {displayedMessages.length > 0 ? (
            <div className="space-y-4">
              {displayedMessages.map((message) => (
                <Card key={message.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {message.senderAvatar && (
                        <div className="w-8 h-8 rounded-full overflow-hidden mr-1 bg-gray-200">
                          <Image
                            src={message.senderAvatar || "/placeholder.svg"}
                            alt={message.sender}
                            width={32}
                            height={32}
                            className="object-cover w-full h-full"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.svg?height=32&width=32"
                            }}
                          />
                        </div>
                      )}
                      <span className="font-bold">{message.sender}</span>

                      <div className="flex items-center">
                        {renderPlatformIcon(message.platform)}
                        <span className="ml-1 text-sm">{getPlatformName(message.platform)}</span>
                      </div>

                      {message.messageType && message.messageType !== "normal" && (
                        <div className="flex items-center">
                          {renderMessageTypeIcon(message.messageType)}
                          <span className="ml-1 text-sm">
                            {message.messageType === "prayer"
                              ? "Pedido de Oração"
                              : message.messageType === "testimony"
                                ? "Testemunho"
                                : ""}
                          </span>
                        </div>
                      )}

                      {message.programId && getProgramName(message.programId) && (
                        <span className="text-sm bg-gray-100 px-2 py-0.5 rounded">
                          {getProgramName(message.programId)}
                        </span>
                      )}

                      <span className="text-xs text-muted-foreground ml-auto">
                        {format(new Date(message.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>

                    {message.platform === "phone" && message.phoneData && (
                      <div className="mb-2 text-sm">
                        <span className="font-medium">Telefone:</span> {message.phoneData.phoneNumber}
                        {message.phoneData.city && (
                          <span>
                            {" "}
                            • {message.phoneData.city}
                            {message.phoneData.state ? `, ${message.phoneData.state}` : ""}
                          </span>
                        )}
                      </div>
                    )}

                    <p className="text-lg">{message.editedContent || message.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma mensagem em exibição. Selecione mensagens na aba "Gerenciar Mensagens" e clique em "Enviar para
              Exibição".
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
