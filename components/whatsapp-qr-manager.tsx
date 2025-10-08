"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, AlertCircle, QrCode, LogOut, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

type ConnectionStatus = 'disconnected' | 'connecting' | 'qr_ready' | 'authenticated' | 'ready' | 'error'

export function WhatsAppQRManager() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    checkInitialStatus()
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  const checkInitialStatus = async () => {
    try {
      const response = await fetch('/api/whatsapp')
      const data = await response.json()

      if (data.isReady) {
        setStatus('ready')
      } else if (data.isAuthenticated) {
        setStatus('authenticated')
      } else if (data.qrCode) {
        setQrCode(data.qrCode)
        setStatus('qr_ready')
      }
    } catch (error) {
      console.error('Error checking status:', error)
    }
  }

  const connectEventSource = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const eventSource = new EventSource('/api/whatsapp/status')
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case 'status':
          if (data.isReady) {
            setStatus('ready')
            setQrCode(null)
          } else if (data.qrCode) {
            setQrCode(data.qrCode)
            setStatus('qr_ready')
          }
          break

        case 'qr':
          setQrCode(data.qrCode)
          setStatus('qr_ready')
          setErrorMessage(null)
          toast({
            title: "QR Code gerado",
            description: "Escaneie o QR Code com seu WhatsApp",
          })
          break

        case 'authenticated':
          setStatus('authenticated')
          setQrCode(null)
          toast({
            title: "Autenticado",
            description: "WhatsApp autenticado com sucesso",
          })
          break

        case 'ready':
          setStatus('ready')
          setQrCode(null)
          setIsLoading(false)
          toast({
            title: "Conectado!",
            description: "WhatsApp Web está pronto para uso",
          })
          break

        case 'auth_failure':
          setStatus('error')
          setErrorMessage('Falha na autenticação')
          setIsLoading(false)
          toast({
            title: "Erro de autenticação",
            description: "Falha ao autenticar. Tente novamente.",
            variant: "destructive",
          })
          break

        case 'disconnected':
          setStatus('disconnected')
          setQrCode(null)
          setIsLoading(false)
          toast({
            title: "Desconectado",
            description: data.reason || "WhatsApp foi desconectado",
            variant: "destructive",
          })
          break
      }
    }

    eventSource.onerror = () => {
      console.error('EventSource error')
      eventSource.close()
    }
  }

  const handleConnect = async () => {
    setIsLoading(true)
    setStatus('connecting')
    setErrorMessage(null)

    try {
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize' })
      })

      if (!response.ok) {
        throw new Error('Failed to initialize')
      }

      connectEventSource()

      toast({
        title: "Inicializando...",
        description: "Aguarde a geração do QR Code",
      })
    } catch (error) {
      setStatus('error')
      setErrorMessage('Erro ao inicializar conexão')
      setIsLoading(false)
      toast({
        title: "Erro",
        description: "Não foi possível inicializar a conexão",
        variant: "destructive",
      })
    }
  }

  const handleDisconnect = async () => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      })

      if (!response.ok) {
        throw new Error('Failed to logout')
      }

      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      setStatus('disconnected')
      setQrCode(null)
      setIsLoading(false)

      toast({
        title: "Desconectado",
        description: "WhatsApp foi desconectado com sucesso",
      })
    } catch (error) {
      setIsLoading(false)
      toast({
        title: "Erro",
        description: "Não foi possível desconectar",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = () => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Conectado</Badge>
      case 'authenticated':
        return <Badge className="bg-blue-600"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Autenticando</Badge>
      case 'qr_ready':
        return <Badge className="bg-yellow-600"><QrCode className="w-3 h-3 mr-1" /> Aguardando Scan</Badge>
      case 'connecting':
        return <Badge className="bg-blue-600"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Conectando</Badge>
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Erro</Badge>
      default:
        return <Badge variant="outline">Desconectado</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Conexão WhatsApp Web</CardTitle>
            <CardDescription>
              Conecte sua conta comercial escaneando o QR Code
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'disconnected' && (
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Clique no botão abaixo para iniciar a conexão com o WhatsApp Web
            </p>
            <Button onClick={handleConnect} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Inicializando...
                </>
              ) : (
                <>
                  <QrCode className="mr-2 h-4 w-4" />
                  Conectar WhatsApp
                </>
              )}
            </Button>
          </div>
        )}

        {status === 'connecting' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Inicializando conexão...</p>
          </div>
        )}

        {status === 'qr_ready' && qrCode && (
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-white p-4 rounded-lg border-2 border-primary">
              <Image
                src={qrCode}
                alt="QR Code WhatsApp"
                width={256}
                height={256}
                className="w-64 h-64"
              />
            </div>
            <div className="text-center space-y-2">
              <p className="font-medium">Escaneie o QR Code</p>
              <ol className="text-sm text-muted-foreground space-y-1 text-left">
                <li>1. Abra o WhatsApp no seu celular</li>
                <li>2. Toque em Menu ou Configurações</li>
                <li>3. Toque em Aparelhos conectados</li>
                <li>4. Toque em Conectar um aparelho</li>
                <li>5. Aponte seu celular para esta tela</li>
              </ol>
            </div>
            <Button variant="outline" onClick={handleConnect} size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Gerar novo QR Code
            </Button>
          </div>
        )}

        {status === 'authenticated' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Autenticando sua conta...</p>
          </div>
        )}

        {status === 'ready' && (
          <div className="space-y-4">
            <div className="flex items-center justify-center py-8 space-x-4">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <div>
                <p className="font-medium text-lg">WhatsApp Conectado!</p>
                <p className="text-sm text-muted-foreground">
                  Sua conta está pronta para uso
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Desconectando...
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  Desconectar
                </>
              )}
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 text-destructive">
              <AlertCircle className="h-8 w-8" />
              <p className="font-medium">{errorMessage || 'Erro na conexão'}</p>
            </div>
            <Button onClick={handleConnect} disabled={isLoading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
