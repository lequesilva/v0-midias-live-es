"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useWhatsAppStore } from "@/lib/store"
import { Loader2, CheckCircle, AlertCircle, RefreshCw, LogOut, Download, Terminal } from "lucide-react"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { safeFetch } from "@/lib/api-helpers"

type WhatsAppStatus = "INITIALIZING" | "QR_PENDING" | "READY" | "DISCONNECTED" | "AUTH_FAILURE" | "NOT_AVAILABLE"

export default function ConnectWhatsApp() {
  const { connections, addConnection, removeConnection, messages, setMessages } = useWhatsAppStore()
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<WhatsAppStatus>("DISCONNECTED")
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const whatsappConnection = connections.find((conn) => conn.platform === "whatsapp")
  const isConnected = whatsappConnection?.isConnected || false

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

    const checkStatus = async () => {
      try {
        console.log("[ConnectWhatsApp] Verificando status")
        const data = await safeFetch("/api/whatsapp/status")

        console.log("[ConnectWhatsApp] Status recebido:", data)

        if (data.success) {
          const newStatus = data.status as WhatsAppStatus
          setStatus(newStatus)

          if (data.qrCode) {
            setQrCode(data.qrCode)
          } else {
            setQrCode(null)
          }

          if (newStatus === "READY" && !isConnected) {
            addConnection({
              platform: "whatsapp",
              isConnected: true,
              lastConnected: new Date().toISOString(),
              accountName: "Meu WhatsApp",
              accountId: "whatsapp-session",
              connectionId: `whatsapp-${Date.now()}`,
            })

            toast({
              title: "WhatsApp conectado",
              description: "Sessão ativa e pronta para enviar mensagens.",
            })
          }

          if ((newStatus === "DISCONNECTED" || newStatus === "AUTH_FAILURE") && isConnected) {
            removeConnection("whatsapp")
            toast({
              title: "WhatsApp desconectado",
              description: "A conexão foi perdida.",
              variant: "destructive",
            })
          }

          if (newStatus !== "NOT_AVAILABLE") {
            setError(null)
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
        console.error("[ConnectWhatsApp] Erro ao verificar status:", errorMessage)

        if (!errorMessage.includes("Erro de conexão")) {
          setError(errorMessage)
        }
      }
    }

    const interval = isConnected ? 10000 : 2000
    checkStatus()
    intervalId = setInterval(checkStatus, interval)

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [isConnected, addConnection, removeConnection, toast])

  const startConnection = async () => {
    setIsLoading(true)
    setError(null)

    try {
      console.log("[ConnectWhatsApp] Iniciando conexão")
      const data = await safeFetch("/api/whatsapp/init", {
        method: "POST",
      })

      console.log("[ConnectWhatsApp] Resposta da inicialização:", data)

      if (data.success) {
        toast({
          title: "Iniciando conexão",
          description: "Aguarde o QR Code ser gerado...",
        })
      } else {
        const errorMsg = data.error || "Erro ao iniciar conexão"
        setError(errorMsg)
        toast({
          title: "Erro ao iniciar",
          description: errorMsg,
          variant: "destructive",
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
      console.error("[ConnectWhatsApp] Erro ao iniciar:", errorMessage)
      setError(errorMessage)
      toast({
        title: "Erro ao iniciar conexão",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const disconnect = async () => {
    setIsLoading(true)
    setError(null)

    try {
      console.log("[ConnectWhatsApp] Desconectando")
      const data = await safeFetch("/api/whatsapp/disconnect", {
        method: "POST",
      })

      console.log("[ConnectWhatsApp] Resposta da desconexão:", data)

      if (data.success) {
        removeConnection("whatsapp")
        const filteredMessages = messages.filter((msg) => msg.platform !== "whatsapp")
        setMessages(filteredMessages)
        setQrCode(null)
        setStatus("DISCONNECTED")

        toast({
          title: "Desconectado",
          description: "WhatsApp desconectado com sucesso.",
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
      console.error("[ConnectWhatsApp] Erro ao desconectar:", errorMessage)
      toast({
        title: "Erro ao desconectar",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const reconnect = async () => {
    await disconnect()
    setTimeout(() => {
      startConnection()
    }, 1000)
  }

  const renderStatusBadge = () => {
    const statusConfig = {
      INITIALIZING: { label: "Inicializando...", color: "bg-yellow-100 text-yellow-800" },
      QR_PENDING: { label: "Aguardando escaneamento", color: "bg-blue-100 text-blue-800" },
      READY: { label: "Conectado", color: "bg-green-100 text-green-800" },
      DISCONNECTED: { label: "Desconectado", color: "bg-gray-100 text-gray-800" },
      AUTH_FAILURE: { label: "Falha na autenticação", color: "bg-red-100 text-red-800" },
      NOT_AVAILABLE: { label: "Não disponível", color: "bg-orange-100 text-orange-800" },
    }

    const config = statusConfig[status]

    return (
      <div className="mb-4">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
      </div>
    )
  }

  if (status === "NOT_AVAILABLE") {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>WhatsApp não disponível</CardTitle>
          <CardDescription>As dependências necessárias não estão instaladas</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          {renderStatusBadge()}

          <div className="text-center w-full">
            <div className="mb-4 p-4 bg-orange-50 text-orange-800 rounded-md text-left">
              <div className="flex items-start mb-3">
                <Download className="mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-2">Passo 1: Instalar dependências</p>
                  <p className="text-sm mb-2">Execute o seguinte comando no terminal:</p>
                </div>
              </div>
              <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs mb-4 flex items-center">
                <Terminal className="mr-2 h-4 w-4 flex-shrink-0" />
                <code>npm install whatsapp-web.js qrcode puppeteer</code>
              </div>

              <div className="flex items-start">
                <RefreshCw className="mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-2">Passo 2: Reiniciar o servidor</p>
                  <p className="text-sm mb-2">Após instalar, reinicie o servidor Next.js:</p>
                </div>
              </div>
              <div className="bg-gray-900 text-gray-100 p-3 rounded font-mono text-xs flex items-center">
                <Terminal className="mr-2 h-4 w-4 flex-shrink-0" />
                <code>npm run dev</code>
              </div>
            </div>

            <Button onClick={startConnection} className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Verificar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Conectar ao WhatsApp</CardTitle>
        <CardDescription>Escaneie o QR Code com seu WhatsApp para conectar</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {renderStatusBadge()}

        {status === "READY" ? (
          <div className="text-center">
            <div className="flex items-center justify-center mb-4 text-green-500">
              <CheckCircle size={48} />
            </div>
            <h3 className="text-xl font-medium mb-4">WhatsApp conectado com sucesso!</h3>
            <p className="text-muted-foreground mb-6">Sua sessão está ativa e pronta para enviar mensagens.</p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={reconnect} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Reconectar
              </Button>
              <Button variant="destructive" onClick={disconnect} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                Desconectar
              </Button>
            </div>
          </div>
        ) : status === "QR_PENDING" && qrCode ? (
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
            <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-md text-sm">
              <AlertCircle className="inline-block mr-2 h-4 w-4" />
              <span>Escaneie este QR Code com seu WhatsApp para conectar</span>
            </div>
            <p className="text-muted-foreground mb-6">
              Abra WhatsApp &gt; Configurações &gt; Dispositivos conectados &gt; Conectar dispositivo
            </p>
            <Button variant="outline" onClick={reconnect} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Gerar Novo QR Code
            </Button>
          </div>
        ) : status === "AUTH_FAILURE" ? (
          <div className="text-center w-full">
            <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-md flex items-center">
              <AlertCircle className="mr-2" />
              <span>Falha na autenticação. Tentando reconectar automaticamente...</span>
            </div>
            <Button onClick={reconnect} disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Tentar Novamente
            </Button>
          </div>
        ) : (
          <div className="text-center w-full">
            {error && (
              <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-md flex items-start text-left">
                <AlertCircle className="mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Erro ao conectar</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}
            <p className="text-muted-foreground mb-6">
              {status === "INITIALIZING" ? "Inicializando conexão..." : "Clique no botão para conectar ao WhatsApp"}
            </p>
            {isLoading || status === "INITIALIZING" ? (
              <Button disabled className="w-full">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Iniciando...
              </Button>
            ) : (
              <Button onClick={startConnection} className="w-full">
                Conectar WhatsApp
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
