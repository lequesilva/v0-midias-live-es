"use client"

import { useEffect, useState, useRef } from "react"
import { Card } from "@/components/ui/card"
import { useWhatsAppStore } from "@/lib/store"
import Image from "next/image"
import { MessageSquare, Phone, BookOpen, Maximize, Minimize, Youtube } from "lucide-react"
import { Button } from "@/components/ui/button"

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

export default function DisplayScreen() {
  const {
    displayedMessages,
    displayConfig,
    currentDisplayIndex,
    nextDisplayedMessage,
    previousDisplayedMessage,
    programs,
  } = useWhatsAppStore()
  const [mounted, setMounted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Adicionar manipulador de eventos de teclado para navegação
  useEffect(() => {
    if (!mounted) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        nextDisplayedMessage()
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        previousDisplayedMessage()
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [mounted, nextDisplayedMessage, previousDisplayedMessage])

  // Manipular alterações no estado de tela cheia
  useEffect(() => {
    if (!mounted) return

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [mounted])

  if (!mounted) return null

  const backgroundStyle = displayConfig.backgroundImage
    ? { backgroundImage: `url(${displayConfig.backgroundImage})`, backgroundSize: "cover" }
    : { backgroundColor: displayConfig.backgroundColor || "#1e1e2e" }

  // Obter a mensagem atual para exibição
  const selectedMessage = displayedMessages.length > 0 ? displayedMessages[currentDisplayIndex] : null

  // Função para alternar modo de tela cheia
  const toggleFullscreen = () => {
    if (!containerRef.current) return

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error(`Erro ao entrar em modo de tela cheia: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  // Renderizar ícone de plataforma
  const renderPlatformIcon = (platform) => {
    switch (platform) {
      case "whatsapp":
        return <MessageSquare className="h-6 w-6 text-green-600" />
      case "youtube":
        return <Youtube className="h-6 w-6 text-red-600" />
      case "phone":
        return <Phone className="h-6 w-6 text-purple-600" />
      default:
        return null
    }
  }

  // Renderizar ícone de tipo de mensagem
  const renderMessageTypeIcon = (messageType) => {
    switch (messageType) {
      case "prayer":
        return (
          <div className="ml-3">
            <PrayingHandsIcon />
          </div>
        )
      case "testimony":
        return <BookOpen className="ml-3 h-6 w-6 text-green-500" />
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
    if (!programId) return displayConfig.programName || "Programa"
    const program = programs.find((p) => p.id === programId)
    return program ? program.name : displayConfig.programName || "Programa"
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={backgroundStyle}
    >
      {/* Botão de tela cheia */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white rounded-full z-10"
        onClick={toggleFullscreen}
        title={isFullscreen ? "Sair da tela cheia (F)" : "Entrar em tela cheia (F)"}
      >
        {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
      </Button>

      {selectedMessage ? (
        <>
          {/* Foto de perfil posicionada mais próxima ao texto - ajustada para cima e maior */}
          {selectedMessage.senderAvatar && (
            <div className="absolute top-[25%] left-[90px] z-10">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white shadow-lg">
                <Image
                  src={selectedMessage.senderAvatar || "/placeholder.svg"}
                  alt={selectedMessage.sender}
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg?height=96&width=96"
                  }}
                  unoptimized
                />
              </div>
            </div>
          )}

          <Card
            className="w-full max-w-3xl p-6 shadow-xl"
            style={{
              backgroundColor: displayConfig.cardColor || "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div className="flex items-center mb-4">
              {displayConfig.showLogo && displayConfig.logoUrl && (
                <div className="mr-4">
                  <Image
                    src={displayConfig.logoUrl || "/placeholder.svg"}
                    alt="Logo"
                    width={80}
                    height={80}
                    className="rounded-md"
                  />
                </div>
              )}

              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <h2 className="text-2xl font-bold" style={{ color: displayConfig.nameColor || "#000" }}>
                    {selectedMessage.sender}
                  </h2>

                  {displayConfig.showPlatformIcon && (
                    <div className="ml-3">{renderPlatformIcon(selectedMessage.platform)}</div>
                  )}

                  {selectedMessage.messageType &&
                    selectedMessage.messageType !== "normal" &&
                    renderMessageTypeIcon(selectedMessage.messageType)}

                  {displayConfig.showPlatformName && (
                    <span className="ml-2 text-sm text-muted-foreground">
                      via {getPlatformName(selectedMessage.platform)}
                    </span>
                  )}
                </div>

                {displayConfig.showProgramName && (
                  <p className="text-lg text-muted-foreground">{getProgramName(selectedMessage.programId)}</p>
                )}
              </div>
            </div>

            <div className="mt-6">
              <p
                className="text-3xl leading-relaxed"
                style={{
                  color: displayConfig.messageColor || "#000",
                  fontFamily: displayConfig.fontFamily || "inherit",
                  fontSize: `${displayConfig.fontSize || 24}px`,
                }}
              >
                {selectedMessage.editedContent || selectedMessage.content}
              </p>
            </div>

            {selectedMessage.mediaType && (
              <div className="mt-6">
                {selectedMessage.mediaType === "image" && selectedMessage.mediaUrl && (
                  <Image
                    src={selectedMessage.mediaUrl || "/placeholder.svg"}
                    alt="Imagem anexada"
                    width={400}
                    height={300}
                    className="rounded-md mx-auto"
                  />
                )}
                {selectedMessage.mediaType === "video" && selectedMessage.mediaUrl && (
                  <video src={selectedMessage.mediaUrl} controls className="w-full max-w-md mx-auto rounded-md" />
                )}
                {selectedMessage.mediaType === "audio" && selectedMessage.mediaUrl && (
                  <audio src={selectedMessage.mediaUrl} controls className="w-full" />
                )}
              </div>
            )}

            {displayedMessages.length > 1 && (
              <div className="mt-6 flex justify-center">
                {displayedMessages.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 w-2 rounded-full mx-1 ${
                      index === currentDisplayIndex ? "bg-primary" : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>
            )}
          </Card>
        </>
      ) : (
        <Card
          className="p-8 text-center"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            backdropFilter: "blur(8px)",
          }}
        >
          <h2 className="text-2xl font-bold mb-4">Nenhuma mensagem selecionada</h2>
          <p className="text-muted-foreground">
            Selecione uma mensagem na aba "Gerenciar Mensagens" e clique em "Enviar para Exibição"
          </p>
        </Card>
      )}
    </div>
  )
}
