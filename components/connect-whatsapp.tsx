"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useWhatsAppStore } from "@/lib/store"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"

export default function ConnectWhatsApp() {
  const { connections, addConnection, removeConnection, addMessage, messages, setMessages } = useWhatsAppStore()
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Verificar se o WhatsApp já está conectado
  const whatsappConnection = connections.find((conn) => conn.platform === "whatsapp")
  const isConnected = whatsappConnection?.isConnected || false

  // Gerar QR Code
  const generateQRCode = () => {
    setIsLoading(true)
    setError(null)

    // Simulação de API para gerar QR Code
    setTimeout(() => {
      // Usando um QR code que indica que é uma simulação
      setQrCode("https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=SIMULACAO-WHATSLIVE-APP")
      setIsLoading(false)

      // Adicionar uma mensagem de aviso sobre a simulação
      toast({
        title: "Modo de Simulação",
        description:
          "Este é um QR code de simulação. Para uma integração real, seria necessário usar a API oficial do WhatsApp Business.",
        duration: 5000,
      })
    }, 2000)
  }

  // Atualize a função simulateConnection para garantir que a conexão seja estabelecida corretamente
  const simulateConnection = () => {
    setIsLoading(true)

    // Se já estiver conectado, primeiro desconectar
    if (isConnected) {
      // Remover a conexão existente
      removeConnection("whatsapp")

      // Remover mensagens antigas do WhatsApp
      const filteredMessages = messages.filter((msg) => msg.platform !== "whatsapp")
      setMessages(filteredMessages)
    }

    // Simulação de conexão bem-sucedida
    setTimeout(() => {
      addConnection({
        platform: "whatsapp",
        isConnected: true,
        lastConnected: new Date().toISOString(),
        accountName: "Meu WhatsApp",
        accountId: "5511999999999",
      })

      // Nomes e mensagens mais realistas
      const whatsappNames = [
        "Ana Silva",
        "Carlos Oliveira",
        "Mariana Santos",
        "Pedro Costa",
        "Juliana Lima",
        "Rafael Souza",
        "Fernanda Alves",
        "Bruno Pereira",
        "Luciana Mendes",
        "Gustavo Rocha",
        "Camila Dias",
        "Diego Cardoso",
      ]
      const whatsappMessages = [
        "Olá! Estou adorando a transmissão de hoje!",
        "Quando será o próximo evento?",
        "Parabéns pelo trabalho! Vocês são incríveis.",
        "Essa é minha primeira vez aqui, muito legal!",
        "Vocês poderiam falar sobre o tema X na próxima vez?",
        "Estou compartilhando com todos os meus amigos!",
        "De onde vocês estão transmitindo hoje?",
        "Qual é a música de fundo?",
      ]

      // Adicionar várias mensagens para simular uma conversa ativa
      for (let i = 0; i < 5; i++) {
        const randomName = whatsappNames[Math.floor(Math.random() * whatsappNames.length)]
        const randomMessage = whatsappMessages[Math.floor(Math.random() * whatsappMessages.length)]
        const avatarSeed = Math.floor(Math.random() * 70)

        addMessage({
          id: `whatsapp-${Date.now()}-${i}`,
          sender: randomName,
          senderAvatar: `https://i.pravatar.cc/150?img=${avatarSeed}`,
          content: randomMessage,
          timestamp: new Date(Date.now() - i * 60000).toISOString(), // Mensagens em intervalos de 1 minuto
          isRead: false,
          mediaType: null,
          mediaUrl: null,
          platform: "whatsapp",
        })
      }

      setIsLoading(false)
      toast({
        title: "WhatsApp conectado",
        description: "Você está recebendo mensagens do WhatsApp.",
      })
    }, 3000)
  }

  // Desconectar
  const disconnect = () => {
    removeConnection("whatsapp")

    // Remover mensagens do WhatsApp
    const filteredMessages = messages.filter((msg) => msg.platform !== "whatsapp")
    setMessages(filteredMessages)

    setQrCode(null)

    toast({
      title: "WhatsApp desconectado",
      description: "Você não está mais recebendo mensagens do WhatsApp.",
    })
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Conectar ao WhatsApp</CardTitle>
        <CardDescription>Escaneie o QR Code com seu WhatsApp para conectar sua conta</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {isConnected ? (
          <div className="text-center">
            <div className="flex items-center justify-center mb-4 text-green-500">
              <CheckCircle size={48} />
            </div>
            <h3 className="text-xl font-medium mb-4">WhatsApp conectado com sucesso!</h3>
            <p className="text-muted-foreground mb-6">
              Você já pode gerenciar mensagens e configurar sua tela de exibição.
            </p>
            <Button variant="destructive" onClick={disconnect}>
              Desconectar
            </Button>
          </div>
        ) : (
          <>
            {qrCode ? (
              <div className="text-center">
                <div className="mb-6 p-4 bg-white inline-block rounded-md shadow-md">
                  <Image
                    src={qrCode || "/placeholder.svg"}
                    alt="QR Code para WhatsApp"
                    width={300}
                    height={300}
                    className="rounded-sm"
                    priority
                  />
                </div>
                <div className="mb-4 p-3 bg-amber-50 text-amber-700 rounded-md text-sm">
                  <AlertCircle className="inline-block mr-2 h-4 w-4" />
                  <span>
                    Este é um QR code de simulação. Em uma implementação real, seria gerado pela API oficial do WhatsApp
                    Business.
                  </span>
                </div>
                <p className="text-muted-foreground mb-6">
                  Abra o WhatsApp no seu celular, vá em Configurações &gt; WhatsApp Web/Desktop e escaneie o QR Code
                  acima.
                </p>
                {isLoading ? (
                  <Button disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando...
                  </Button>
                ) : (
                  <Button onClick={simulateConnection}>Simular Conexão</Button>
                )}
              </div>
            ) : (
              <div className="text-center w-full">
                {error && (
                  <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-md flex items-center">
                    <AlertCircle className="mr-2" />
                    <span>{error}</span>
                  </div>
                )}
                <p className="text-muted-foreground mb-6">
                  Clique no botão abaixo para gerar um QR Code e conectar seu WhatsApp.
                </p>
                {isLoading ? (
                  <Button disabled className="w-full">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando QR Code...
                  </Button>
                ) : (
                  <Button onClick={generateQRCode} className="w-full">
                    Gerar QR Code
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
