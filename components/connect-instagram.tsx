"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useWhatsAppStore } from "@/lib/store"
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Instagram,
  RefreshCw,
  Trash2,
  Bug,
  Clock,
  RotateCw,
  History,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function ConnectInstagram() {
  const {
    connections,
    addConnection,
    removeConnection,
    messages,
    setMessages,
    updateLastRefreshTime,
    removeAllConnectionMessages,
    debugMode,
    setDebugMode,
    displayedMessages,
    removeMessageFromDisplay,
  } = useWhatsAppStore()
  const [profileUrl, setProfileUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(60) // segundos
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const { toast } = useToast()

  // Verificar se o Instagram já está conectado
  const instagramConnection = connections.find((conn) => conn.platform === "instagram")
  const isConnected = instagramConnection?.isConnected || false

  // Armazenar a URL atual quando conectado
  const [currentConnectedUrl, setCurrentConnectedUrl] = useState<string>("")
  const [urlHistory, setUrlHistory] = useState<{ url: string; connectionId: string; timestamp: string }[]>([])

  // Função para adicionar logs de depuração
  const addDebugLog = (message: string) => {
    if (debugMode) {
      console.log(`[DEBUG] ${message}`)
      setDebugLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev.slice(0, 99)])
    }
  }

  // Atualizar o estado da URL atual quando a conexão mudar
  useEffect(() => {
    if (instagramConnection?.accountId) {
      setCurrentConnectedUrl(instagramConnection.accountId)

      // Adicionar à lista de histórico se não existir
      const exists = urlHistory.some((item) => item.url === instagramConnection.accountId)
      if (!exists && instagramConnection.connectionId) {
        setUrlHistory((prev) => [
          {
            url: instagramConnection.accountId!,
            connectionId: instagramConnection.connectionId!,
            timestamp: new Date().toISOString(),
          },
          ...prev,
        ])
        addDebugLog(`URL adicionada ao histórico: ${instagramConnection.accountId}`)
      }
    } else {
      setCurrentConnectedUrl("")
    }
  }, [instagramConnection])

  // Configurar o timer de atualização automática
  useEffect(() => {
    if (isConnected && autoRefreshEnabled && refreshInterval > 0) {
      addDebugLog(`Configurando atualização automática a cada ${refreshInterval} segundos`)

      // Limpar timer existente
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current)
      }

      // Configurar novo timer
      refreshTimerRef.current = setInterval(() => {
        addDebugLog("Executando atualização automática")
        handleRefreshMessages()
      }, refreshInterval * 1000)

      return () => {
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current)
        }
      }
    } else if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current)
    }
  }, [isConnected, autoRefreshEnabled, refreshInterval])

  // Função para extrair nome de usuário do Instagram da URL
  const extractUsername = (url: string): string | null => {
    try {
      const parsedUrl = new URL(url)
      let username = ""

      if (parsedUrl.hostname.includes("instagram.com")) {
        // Extrair o nome de usuário da URL
        // Formato: https://www.instagram.com/username
        const pathParts = parsedUrl.pathname.split("/").filter(Boolean)
        if (pathParts.length > 0) {
          username = pathParts[0]
        }
      }

      if (!username) {
        throw new Error("URL de perfil inválida")
      }

      return username
    } catch (err) {
      return null
    }
  }

  // Função para verificar se uma mensagem pertence ao perfil atual
  const isMessageFromCurrentProfile = (message: any): boolean => {
    if (!instagramConnection || !message.connectionId) return false
    return message.connectionId === instagramConnection.connectionId
  }

  // Função para limpar completamente todas as mensagens do Instagram
  const purgeAllInstagramMessages = () => {
    addDebugLog("Limpando TODAS as mensagens do Instagram do sistema")

    // Remover todas as mensagens do Instagram do estado
    const allMessages = useWhatsAppStore.getState().messages
    const nonInstagramMessages = allMessages.filter((msg) => msg.platform !== "instagram")
    useWhatsAppStore.setState({ messages: nonInstagramMessages })

    // Remover mensagens do Instagram que estão em exibição
    const displayedMessages = useWhatsAppStore.getState().displayedMessages
    const updatedDisplayedMessages = displayedMessages.filter((msg) => msg.platform !== "instagram")

    // Se houver mensagens em exibição que foram removidas, atualizá-las
    if (displayedMessages.length !== updatedDisplayedMessages.length) {
      updatedDisplayedMessages.forEach((msg) => {
        removeMessageFromDisplay(msg.id)
      })
    }

    addDebugLog(`Removidas ${allMessages.length - nonInstagramMessages.length} mensagens do Instagram`)
    updateLastRefreshTime()
  }

  // Conectar ao Instagram
  const connectToInstagram = () => {
    if (!profileUrl) {
      setError("Por favor, insira a URL do perfil do Instagram")
      return
    }

    setIsLoading(true)
    setError(null)

    // Extrair o nome de usuário da URL
    const username = extractUsername(profileUrl)
    if (!username) {
      setIsLoading(false)
      setError("URL de perfil inválida. Use uma URL do Instagram válida.")
      return
    }

    addDebugLog(`Iniciando conexão com perfil do Instagram: ${username}`)

    // IMPORTANTE: Limpar TODAS as mensagens antigas do Instagram, independentemente da conexão
    purgeAllInstagramMessages()

    // Se já estiver conectado, primeiro desconectar completamente
    if (isConnected && instagramConnection) {
      addDebugLog(`Desconectando Instagram antes de nova conexão: ${instagramConnection.connectionId}`)

      // Remover a conexão existente
      removeConnection("instagram")
    }

    // Gerar um ID único para esta conexão
    const connectionId = `instagram-${username}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    addDebugLog(`Criando nova conexão Instagram - Username: ${username}, Connection ID: ${connectionId}`)

    // Simulação de conexão bem-sucedida
    setTimeout(() => {
      // Adicionar nova conexão
      addConnection({
        platform: "instagram",
        isConnected: true,
        lastConnected: new Date().toISOString(),
        accountName: `@${username}`,
        accountId: username,
        connectionId: connectionId,
      })

      // Armazenar a URL atual
      setCurrentConnectedUrl(username)

      // Adicionar ao histórico de URLs
      const exists = urlHistory.some((item) => item.url === username)
      if (!exists) {
        setUrlHistory((prev) => [
          {
            url: username,
            connectionId: connectionId,
            timestamp: new Date().toISOString(),
          },
          ...prev,
        ])
      }

      // Adicionar mensagens de exemplo do Instagram
      const instagramNames = [
        "ana.fotografia",
        "viagens_mundo",
        "fitness.life",
        "moda_estilo",
        "culinaria_facil",
        "arte.digital",
        "musica_boa",
        "natureza_viva",
      ]
      const instagramMessages = [
        "Que conteúdo incrível! Qual câmera você usa?",
        "Adorei esse formato de live! Muito interativo!",
        "Já salvei nos favoritos para assistir depois!",
        "Vocês são uma inspiração para mim!",
        "De onde vocês estão transmitindo? O lugar parece incrível!",
        "Primeira vez assistindo, já me tornei fã!",
        "Vocês poderiam fazer um tutorial sobre isso?",
        "Estou aprendendo muito com vocês!",
      ]

      // Adicionar várias mensagens para simular uma conversa ativa
      const newMessages = []
      for (let i = 0; i < 5; i++) {
        const randomName = instagramNames[Math.floor(Math.random() * instagramNames.length)]
        const randomMessage = instagramMessages[Math.floor(Math.random() * instagramMessages.length)]
        const avatarSeed = Math.floor(Math.random() * 70)
        const messageId = `ig-${connectionId}-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 9)}`

        newMessages.push({
          id: messageId,
          sender: randomName,
          senderAvatar: `https://i.pravatar.cc/150?img=${avatarSeed}`,
          content: randomMessage,
          timestamp: new Date(Date.now() - i * 60000).toISOString(), // Mensagens em intervalos de 1 minuto
          isRead: false,
          mediaType: null,
          mediaUrl: null,
          platform: "instagram",
          connectionId: connectionId,
          accountId: username, // Adicionar accountId para facilitar filtragem
          platformData: {
            profileUrl: `https://instagram.com/${randomName}`,
            isVerified: Math.random() > 0.8,
          },
        })
      }

      addDebugLog(`Adicionando ${newMessages.length} novas mensagens para a conexão ${connectionId}`)

      // Adicionar as novas mensagens ao estado
      setMessages(newMessages)
      updateLastRefreshTime()
      setLastRefreshTime(new Date())

      setIsLoading(false)
      toast({
        title: "Instagram conectado",
        description: `Você está recebendo comentários do perfil: @${username}`,
      })
    }, 2000)
  }

  // Desconectar do Instagram
  const disconnectInstagram = () => {
    addDebugLog("Iniciando desconexão do Instagram")

    // IMPORTANTE: Limpar TODAS as mensagens do Instagram
    purgeAllInstagramMessages()

    if (instagramConnection?.connectionId) {
      addDebugLog(`Desconectando Instagram - Connection ID: ${instagramConnection.connectionId}`)
    }

    removeConnection("instagram")
    setProfileUrl("")
    setCurrentConnectedUrl("")

    // Limpar o timer de atualização automática
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current)
      refreshTimerRef.current = null
    }

    toast({
      title: "Instagram desconectado",
      description: "Você não está mais recebendo comentários do Instagram.",
    })
  }

  // Reconectar (limpar e conectar novamente)
  const handleReconnect = () => {
    if (!currentConnectedUrl || !instagramConnection) return

    setIsLoading(true)
    addDebugLog(`Iniciando reconexão do Instagram - URL atual: ${currentConnectedUrl}`)

    // IMPORTANTE: Limpar TODAS as mensagens do Instagram
    purgeAllInstagramMessages()

    // Remover a conexão existente
    removeConnection("instagram")

    // Gerar um novo ID de conexão
    const newConnectionId = `instagram-${currentConnectedUrl}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    addDebugLog(`Novo Connection ID: ${newConnectionId}`)

    // Esperar um pouco para garantir que tudo foi limpo
    setTimeout(() => {
      // Adicionar nova conexão com o mesmo accountId mas novo connectionId
      addConnection({
        platform: "instagram",
        isConnected: true,
        lastConnected: new Date().toISOString(),
        accountName: `@${currentConnectedUrl}`,
        accountId: currentConnectedUrl,
        connectionId: newConnectionId,
      })

      // Atualizar o histórico de URLs
      setUrlHistory((prev) => [
        {
          url: currentConnectedUrl,
          connectionId: newConnectionId,
          timestamp: new Date().toISOString(),
        },
        ...prev.filter((item) => item.url !== currentConnectedUrl),
      ])

      // Adicionar novas mensagens simuladas
      const instagramNames = ["novo.seguidor", "fan_page", "comentarista_ativo", "visitante_regular", "seguidor_fiel"]
      const instagramMessages = [
        "Acabei de descobrir seu perfil! Conteúdo incrível!",
        "Estou adorando suas publicações!",
        "Primeira vez comentando, mas já sigo há um tempo!",
        "Vocês sempre trazem conteúdo relevante!",
        "Compartilhei com meus amigos, eles vão adorar!",
      ]

      // Adicionar várias mensagens para simular uma conversa ativa
      const newMessages = []
      for (let i = 0; i < 5; i++) {
        const randomName = instagramNames[Math.floor(Math.random() * instagramNames.length)]
        const randomMessage = instagramMessages[Math.floor(Math.random() * instagramMessages.length)]
        const avatarSeed = Math.floor(Math.random() * 70)
        const messageId = `ig-${newConnectionId}-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 9)}`

        newMessages.push({
          id: messageId,
          sender: randomName,
          senderAvatar: `https://i.pravatar.cc/150?img=${avatarSeed}`,
          content: randomMessage,
          timestamp: new Date(Date.now() - i * 60000).toISOString(), // Mensagens em intervalos de 1 minuto
          isRead: false,
          mediaType: null,
          mediaUrl: null,
          platform: "instagram",
          connectionId: newConnectionId,
          accountId: currentConnectedUrl, // Adicionar accountId para facilitar filtragem
          platformData: {
            profileUrl: `https://instagram.com/${randomName}`,
            isVerified: Math.random() > 0.8,
          },
        })
      }

      addDebugLog(`Adicionando ${newMessages.length} novas mensagens após reconexão`)

      // Adicionar as novas mensagens ao estado
      setMessages(newMessages)
      updateLastRefreshTime()
      setLastRefreshTime(new Date())

      setIsLoading(false)
      toast({
        title: "Instagram reconectado",
        description: "Conexão renovada e novas mensagens carregadas.",
      })
    }, 1500)
  }

  // Limpar mensagens do Instagram
  const clearInstagramMessages = () => {
    addDebugLog("Limpando mensagens do Instagram (exceto as em exibição)")

    // IMPORTANTE: Limpar TODAS as mensagens do Instagram, exceto as em exibição
    const allMessages = useWhatsAppStore.getState().messages
    const displayedMessageIds = useWhatsAppStore.getState().displayedMessages.map((msg) => msg.id)

    // Manter apenas mensagens que não são do Instagram ou que estão em exibição
    const messagesToKeep = allMessages.filter(
      (msg) => msg.platform !== "instagram" || displayedMessageIds.includes(msg.id),
    )

    useWhatsAppStore.setState({ messages: messagesToKeep })
    updateLastRefreshTime()

    addDebugLog(`Mensagens antes: ${allMessages.length}, Mensagens após filtragem: ${messagesToKeep.length}`)

    toast({
      title: "Mensagens do Instagram limpas",
      description: "As mensagens do Instagram foram removidas, exceto as que estão em exibição.",
    })
  }

  // Limpar histórico de URLs
  const clearUrlHistory = () => {
    addDebugLog("Limpando histórico de URLs")

    // Manter apenas a URL atual no histórico, se estiver conectado
    if (currentConnectedUrl && instagramConnection?.connectionId) {
      setUrlHistory([
        {
          url: currentConnectedUrl,
          connectionId: instagramConnection.connectionId,
          timestamp: new Date().toISOString(),
        },
      ])
      toast({
        title: "Histórico de URLs limpo",
        description: "O histórico de URLs foi limpo, mantendo apenas a URL atual.",
      })
    } else {
      setUrlHistory([])
      toast({
        title: "Histórico de URLs limpo",
        description: "Todo o histórico de URLs foi removido.",
      })
    }
  }

  // Função para atualizar mensagens manualmente
  const handleRefreshMessages = () => {
    if (!isConnected || !instagramConnection) return

    addDebugLog("Atualizando mensagens manualmente")

    // Gerar novas mensagens simuladas
    const instagramNames = ["espectador.atual", "novo.comentarista", "fan.do.perfil", "visitante"]
    const instagramMessages = [
      "Estou adorando o conteúdo!",
      "Quando será a próxima live?",
      "Já compartilhei com meus amigos!",
      "Vocês poderiam falar sobre o tema X?",
      "Primeira vez comentando, muito bom!",
    ]

    // Adicionar novas mensagens simuladas
    const newMessages = []
    const count = Math.floor(Math.random() * 3) + 1 // 1 a 3 novas mensagens

    for (let i = 0; i < count; i++) {
      const randomName = instagramNames[Math.floor(Math.random() * instagramNames.length)]
      const randomMessage = instagramMessages[Math.floor(Math.random() * instagramMessages.length)]
      const avatarSeed = Math.floor(Math.random() * 70)
      const messageId = `ig-${instagramConnection.connectionId}-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 9)}`

      newMessages.push({
        id: messageId,
        sender: randomName,
        senderAvatar: `https://i.pravatar.cc/150?img=${avatarSeed}`,
        content: randomMessage,
        timestamp: new Date().toISOString(),
        isRead: false,
        mediaType: null,
        mediaUrl: null,
        platform: "instagram",
        connectionId: instagramConnection.connectionId,
        accountId: instagramConnection.accountId, // Adicionar accountId para facilitar filtragem
        platformData: {
          profileUrl: `https://instagram.com/${randomName}`,
          isVerified: Math.random() > 0.8,
        },
      })
    }

    addDebugLog(`Adicionando ${count} novas mensagens na atualização manual`)

    // Adicionar as novas mensagens ao estado
    useWhatsAppStore.setState((state) => ({
      messages: [...newMessages, ...state.messages],
    }))

    updateLastRefreshTime()
    setLastRefreshTime(new Date())

    toast({
      title: "Mensagens atualizadas",
      description: `${count} nova(s) mensagem(ns) carregada(s).`,
      duration: 2000,
    })
  }

  // Alternar modo de depuração
  const toggleDebugMode = () => {
    setDebugMode(!debugMode)
    setShowDebugInfo(!debugMode) // Mostrar informações de depuração quando ativar o modo

    toast({
      title: debugMode ? "Modo de depuração desativado" : "Modo de depuração ativado",
      description: debugMode
        ? "Os logs de depuração não serão mais exibidos no console."
        : "Os logs de depuração serão exibidos no console para ajudar na solução de problemas.",
    })
  }

  // Verificar e limpar mensagens de outros perfis
  const verifyAndCleanMessages = () => {
    if (!instagramConnection) return

    addDebugLog("Verificando e limpando mensagens de outros perfis")

    const allMessages = useWhatsAppStore.getState().messages
    const instagramMessages = allMessages.filter((msg) => msg.platform === "instagram")
    const currentConnectionMessages = instagramMessages.filter(
      (msg) => msg.connectionId === instagramConnection.connectionId,
    )
    const otherConnectionMessages = instagramMessages.filter(
      (msg) => msg.connectionId !== instagramConnection.connectionId,
    )

    addDebugLog(`Total de mensagens do Instagram: ${instagramMessages.length}`)
    addDebugLog(`Mensagens da conexão atual: ${currentConnectionMessages.length}`)
    addDebugLog(`Mensagens de outras conexões: ${otherConnectionMessages.length}`)

    if (otherConnectionMessages.length > 0) {
      // Manter apenas mensagens da conexão atual e de outras plataformas
      const messagesToKeep = allMessages.filter(
        (msg) => msg.platform !== "instagram" || msg.connectionId === instagramConnection.connectionId,
      )

      useWhatsAppStore.setState({ messages: messagesToKeep })
      updateLastRefreshTime()

      toast({
        title: "Limpeza de cache realizada",
        description: `Removidas ${otherConnectionMessages.length} mensagens de perfis anteriores.`,
      })
    } else {
      toast({
        title: "Verificação concluída",
        description: "Não foram encontradas mensagens de outros perfis.",
      })
    }
  }

  // Limpar completamente o cache e reconectar
  const purgeAndReconnect = () => {
    if (!currentConnectedUrl) return

    addDebugLog("Iniciando limpeza completa de cache e reconexão")

    // Salvar a URL atual
    const currentUrl = currentConnectedUrl

    // Desconectar e limpar tudo
    disconnectInstagram()

    // Limpar histórico de URLs
    setUrlHistory([])

    // Limpar logs de depuração
    setDebugLogs([])

    // Esperar um pouco para garantir que tudo foi limpo
    setTimeout(() => {
      // Definir a URL e conectar novamente
      setProfileUrl(`https://instagram.com/${currentUrl}`)
      setTimeout(() => {
        connectToInstagram()
      }, 500)
    }, 1000)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Instagram className="mr-2 h-5 w-5 text-pink-600" />
            Conectar ao Instagram
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              title="Mostrar/ocultar informações de depuração"
            >
              <History className={`h-4 w-4 ${showDebugInfo ? "text-blue-500" : "text-gray-400"}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleDebugMode} title="Alternar modo de depuração">
              <Bug className={`h-4 w-4 ${debugMode ? "text-green-500" : "text-gray-400"}`} />
            </Button>
          </div>
        </CardTitle>
        <CardDescription>Receba comentários de um perfil do Instagram</CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="text-center">
            <div className="flex items-center justify-center mb-4 text-pink-500">
              <CheckCircle size={48} />
            </div>
            <h3 className="text-xl font-medium mb-2">Instagram conectado</h3>
            <p className="text-muted-foreground mb-2">Perfil: @{currentConnectedUrl}</p>
            <p className="text-muted-foreground mb-2">
              {lastRefreshTime ? (
                <>
                  Última atualização: {lastRefreshTime.toLocaleTimeString()}
                  {autoRefreshEnabled && (
                    <span className="ml-2">(Atualização automática a cada {refreshInterval} segundos)</span>
                  )}
                </>
              ) : (
                "Aguardando primeira atualização..."
              )}
            </p>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <Label htmlFor="auto-refresh" className="flex items-center cursor-pointer">
                  <Clock className="h-4 w-4 mr-2 text-gray-500" />
                  Atualização automática
                </Label>
                <Switch id="auto-refresh" checked={autoRefreshEnabled} onCheckedChange={setAutoRefreshEnabled} />
              </div>

              {autoRefreshEnabled && (
                <div className="flex items-center gap-4">
                  <Label htmlFor="refresh-interval" className="whitespace-nowrap">
                    Intervalo (segundos):
                  </Label>
                  <Input
                    id="refresh-interval"
                    type="number"
                    min="10"
                    max="300"
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number.parseInt(e.target.value) || 60)}
                    className="w-24"
                  />
                  <Button variant="outline" size="sm" onClick={handleRefreshMessages} className="ml-auto">
                    <RotateCw className="h-4 w-4 mr-2" />
                    Atualizar agora
                  </Button>
                </div>
              )}
            </div>

            {urlHistory.length > 1 && (
              <div className="mb-6 p-4 bg-amber-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-amber-800 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Histórico de URLs ({urlHistory.length})
                  </h4>
                  <Button variant="outline" size="sm" onClick={clearUrlHistory}>
                    Limpar histórico
                  </Button>
                </div>
                <p className="text-sm text-amber-700 mb-2">
                  Você tem várias URLs no histórico. Isso pode causar problemas de cache.
                </p>
                <div className="max-h-24 overflow-y-auto text-xs text-amber-600">
                  {urlHistory.map((item, index) => (
                    <div key={index} className="py-1 border-b border-amber-100 last:border-0">
                      {item.url === currentConnectedUrl ? <strong>@{item.url} (atual)</strong> : `@${item.url}`}
                      <span className="ml-2 text-xs text-gray-500">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showDebugInfo && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg text-left">
                <Accordion type="single" collapsible>
                  <AccordionItem value="debug-info">
                    <AccordionTrigger className="text-sm font-medium">Informações de Depuração</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 text-xs">
                        <div>
                          <strong>Connection ID:</strong> {instagramConnection?.connectionId || "N/A"}
                        </div>
                        <div>
                          <strong>Account ID:</strong> {instagramConnection?.accountId || "N/A"}
                        </div>
                        <div>
                          <strong>Total de mensagens:</strong>{" "}
                          {messages.filter((m) => m.platform === "instagram").length}
                        </div>
                        <div>
                          <strong>Mensagens desta conexão:</strong>{" "}
                          {messages.filter((m) => m.connectionId === instagramConnection?.connectionId).length}
                        </div>
                        <div>
                          <strong>Mensagens de outras conexões:</strong>{" "}
                          {
                            messages.filter(
                              (m) => m.platform === "instagram" && m.connectionId !== instagramConnection?.connectionId,
                            ).length
                          }
                        </div>
                        <div>
                          <Button variant="outline" size="sm" onClick={verifyAndCleanMessages} className="mt-2">
                            Verificar e Limpar Mensagens
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {debugMode && (
                    <AccordionItem value="debug-logs">
                      <AccordionTrigger className="text-sm font-medium">
                        Logs de Depuração ({debugLogs.length})
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="max-h-40 overflow-y-auto text-xs">
                          {debugLogs.length > 0 ? (
                            <div className="space-y-1">
                              {debugLogs.map((log, index) => (
                                <div key={index} className="py-1 border-b border-gray-100 last:border-0">
                                  {log}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground">Nenhum log de depuração disponível.</p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>
              </div>
            )}

            <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  // Desconectar completamente antes de permitir nova conexão
                  disconnectInstagram()
                  setProfileUrl("")
                  setError(null)
                }}
              >
                Conectar a outro perfil
              </Button>

              <Button variant="outline" onClick={handleReconnect} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reconectando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reconectar
                  </>
                )}
              </Button>

              <Button variant="outline" onClick={clearInstagramMessages}>
                <Trash2 className="mr-2 h-4 w-4" />
                Limpar Mensagens
              </Button>

              <Button variant="destructive" onClick={disconnectInstagram}>
                Desconectar
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md flex items-center">
                <AlertCircle className="mr-2 h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-url">URL do Perfil do Instagram</Label>
                <Input
                  id="profile-url"
                  placeholder="https://www.instagram.com/seuperfil"
                  value={profileUrl}
                  onChange={(e) => setProfileUrl(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Cole a URL do perfil do Instagram que você deseja monitorar.
                </p>
              </div>

              <div className="pt-2">
                {isLoading ? (
                  <Button disabled className="w-full">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando...
                  </Button>
                ) : (
                  <Button onClick={connectToInstagram} className="w-full">
                    Conectar ao Instagram
                  </Button>
                )}
              </div>

              <div className="p-3 bg-amber-50 text-amber-700 rounded-md text-sm mt-4">
                <AlertCircle className="inline-block mr-2 h-4 w-4" />
                <span>
                  Modo de simulação: Esta é uma demonstração. Em uma implementação real, seria necessário usar a API do
                  Instagram para acessar os comentários do perfil.
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
