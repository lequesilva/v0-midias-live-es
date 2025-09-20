"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle, XCircle, MessageSquare, Send, Loader2 } from "lucide-react"
import { whatsappBusinessAPI } from "@/lib/whatsapp-business"

interface WhatsAppBusinessProps {
  onConnectionChange?: (connected: boolean) => void
}

export function ConnectWhatsAppBusiness({ onConnectionChange }: WhatsAppBusinessProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [businessProfile, setBusinessProfile] = useState<any>(null)
  const [testMessage, setTestMessage] = useState("")
  const [testPhone, setTestPhone] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "checking" | "connected" | "error">("idle")

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    setConnectionStatus("checking")
    try {
      const connected = await whatsappBusinessAPI.verifyConnection()
      setIsConnected(connected)
      setConnectionStatus(connected ? "connected" : "error")

      if (connected) {
        try {
          const profile = await whatsappBusinessAPI.getBusinessProfile()
          setBusinessProfile(profile)
        } catch (error) {
          console.error("Erro ao obter perfil:", error)
        }
      }

      onConnectionChange?.(connected)
    } catch (error) {
      console.error("Erro ao verificar conexão:", error)
      setIsConnected(false)
      setConnectionStatus("error")
      onConnectionChange?.(false)
    }
  }

  const handleConnect = async () => {
    setIsConnecting(true)
    await checkConnection()
    setIsConnecting(false)
  }

  const sendTestMessage = async () => {
    if (!testPhone || !testMessage) return

    setIsSending(true)
    try {
      await whatsappBusinessAPI.sendMessage(testPhone, testMessage)
      alert("Mensagem enviada com sucesso!")
      setTestMessage("")
      setTestPhone("")
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error)
      alert("Erro ao enviar mensagem. Verifique o console para mais detalhes.")
    } finally {
      setIsSending(false)
    }
  }

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "bg-green-500"
      case "error":
        return "bg-red-500"
      case "checking":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "Conectado"
      case "error":
        return "Erro na conexão"
      case "checking":
        return "Verificando..."
      default:
        return "Não conectado"
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            <CardTitle>WhatsApp Business API</CardTitle>
          </div>
          <Badge className={getStatusColor()}>
            {connectionStatus === "checking" ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : isConnected ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <XCircle className="h-3 w-3 mr-1" />
            )}
            {getStatusText()}
          </Badge>
        </div>
        <CardDescription>
          Conecte-se à API oficial do WhatsApp Business para receber mensagens em tempo real
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">Configuração Necessária</h4>
              <p className="text-sm text-yellow-700 mb-2">Para usar a API do WhatsApp Business, você precisa:</p>
              <ul className="text-sm text-yellow-700 space-y-1 ml-4">
                <li>• Conta comercial verificada no Facebook Business Manager</li>
                <li>• Aplicativo criado na plataforma Meta for Developers</li>
                <li>• Número de telefone verificado para WhatsApp Business</li>
                <li>• Token de acesso e Phone Number ID configurados</li>
              </ul>
            </div>

            <Button onClick={handleConnect} disabled={isConnecting} className="w-full">
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando Conexão...
                </>
              ) : (
                "Verificar Conexão"
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">Conectado com Sucesso!</span>
              </div>
              <p className="text-sm text-green-700">Sua integração com WhatsApp Business está ativa e funcionando.</p>
              {businessProfile && (
                <div className="mt-2 text-sm text-green-700">
                  <strong>Perfil:</strong> {businessProfile.display_phone_number || "N/A"}
                </div>
              )}
            </div>

            {/* Seção de teste de envio de mensagem */}
            <div className="space-y-3">
              <h4 className="font-medium">Testar Envio de Mensagem</h4>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="test-phone">Número de Telefone (com código do país)</Label>
                  <Input
                    id="test-phone"
                    placeholder="Ex: 5511999999999"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="test-message">Mensagem</Label>
                  <Textarea
                    id="test-message"
                    placeholder="Digite sua mensagem de teste..."
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button onClick={sendTestMessage} disabled={!testPhone || !testMessage || isSending} className="w-full">
                  {isSending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar Mensagem de Teste
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button
                variant="outline"
                onClick={checkConnection}
                disabled={connectionStatus === "checking"}
                className="w-full bg-transparent"
              >
                {connectionStatus === "checking" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Verificar Conexão Novamente"
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 mt-4">
          <p>
            <strong>Webhook URL:</strong>{" "}
            {typeof window !== "undefined" ? `${window.location.origin}/api/whatsapp-webhook` : "/api/whatsapp-webhook"}
          </p>
          <p className="mt-1">Configure esta URL no seu painel do Meta for Developers</p>
        </div>
      </CardContent>
    </Card>
  )
}
