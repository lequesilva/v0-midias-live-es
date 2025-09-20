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
  Youtube,
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

export default function ConnectYouTube() {
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
  const [streamUrl, setStreamUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(60) // segundos
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null)
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const { toast } = useToast()

  // Novo estado para armazenar o último ID de comentário
  const [lastCommentId, setLastCommentId] = useState<string | null>(null)
  // Contador para simular novos comentários
  const [commentCounter, setCommentCounter] = useState(0)

  // Verificar se o YouTube já está conectado
  const youtubeConnection = connections.find((conn) => conn.platform === "youtube")
  const isConnected = youtubeConnection?.isConnected || false

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
    if (youtubeConnection?.streamId) {
      setCurrentConnectedUrl(youtubeConnection.streamId)

      // Adicionar à lista de histórico se não existir
      const exists = urlHistory.some((item) => item.url === youtubeConnection.streamId)
      if (!exists && youtubeConnection.connectionId) {
        setUrlHistory((prev) => [
          {
            url: youtubeConnection.streamId!,
            connectionId: youtubeConnection.connectionId!,
            timestamp: new Date().toISOString(),
          },
          ...prev,
        ])
        addDebugLog(`URL adicionada ao histórico: ${youtubeConnection.streamId}`)
      }
    } else {
      setCurrentConnectedUrl("")
    }
  }, [youtubeConnection])

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

  // Função para extrair ID da transmissão da URL
  const extractStreamId = (url: string): string | null => {
    try {
      const parsedUrl = new URL(url)
      let streamId = ""

      if (parsedUrl.hostname.includes("youtube.com")) {
        // Formato: https://www.youtube.com/watch?v=VIDEO_ID
        streamId = parsedUrl.searchParams.get("v") || ""
      } else if (parsedUrl.hostname.includes("youtu.be")) {
        // Formato: https://youtu.be/VIDEO_ID
        streamId = parsedUrl.pathname.substring(1)
      }

      if (!streamId) {
        throw new Error("URL de transmissão inválida")
      }

      return streamId
    } catch (err) {
      return null
    }
  }

  // Função para verificar se uma mensagem pertence à transmissão atual
  const isMessageFromCurrentStream = (message: any): boolean => {
    if (!youtubeConnection || !message.connectionId) return false
    return message.connectionId === youtubeConnection.connectionId
  }

  // Função para limpar completamente todas as mensagens do YouTube
  const purgeAllYouTubeMessages = () => {
    addDebugLog("Limpando TODAS as mensagens do YouTube do sistema")

    // Remover todas as mensagens do YouTube do estado
    const allMessages = useWhatsAppStore.getState().messages
    const nonYoutubeMessages = allMessages.filter((msg) => msg.platform !== "youtube")
    useWhatsAppStore.setState({ messages: nonYoutubeMessages })

    // Remover mensagens do YouTube que estão em exibição
    const displayedMessages = useWhatsAppStore.getState().displayedMessages
    const updatedDisplayedMessages = displayedMessages.filter((msg) => msg.platform !== "youtube")

    // Se houver mensagens em exibição que foram removidas, atualizá-las
    if (displayedMessages.length !== updatedDisplayedMessages.length) {
      updatedDisplayedMessages.forEach((msg) => {
        removeMessageFromDisplay(msg.id)
      })
    }

    addDebugLog(`Removidas ${allMessages.length - nonYoutubeMessages.length} mensagens do YouTube`)
    updateLastRefreshTime()

    // Resetar o contador de comentários e o último ID
    setCommentCounter(0)
    setLastCommentId(null)
  }

  // Modificar a função connectToYouTube para garantir que todas as mensagens antigas sejam removidas
  const connectToYouTube = () => {
    if (!streamUrl) {
      setError("Por favor, insira a URL da transmissão ao vivo do YouTube")
      return
    }

    setIsLoading(true)
    setError(null)

    // Extrair o ID da transmissão da URL
    const streamId = extractStreamId(streamUrl)
    if (!streamId) {
      setIsLoading(false)
      setError("URL de transmissão inválida. Use uma URL do YouTube válida.")
      return
    }

    addDebugLog(`Iniciando conexão com nova transmissão: ${streamId}`)

    // IMPORTANTE: Limpar TODAS as mensagens antigas do YouTube, independentemente da conexão
    purgeAllYouTubeMessages()

    // Se já estiver conectado, primeiro desconectar completamente
    if (isConnected && youtubeConnection) {
      addDebugLog(`Desconectando YouTube antes de nova conexão: ${youtubeConnection.connectionId}`)

      // Remover a conexão existente
      removeConnection("youtube")
    }

    // Gerar um ID único para esta conexão
    const connectionId = `youtube-${streamId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    addDebugLog(`Criando nova conexão YouTube - Stream ID: ${streamId}, Connection ID: ${connectionId}`)

    // Simulação de conexão bem-sucedida
    setTimeout(() => {
      // Adicionar nova conexão
      addConnection({
        platform: "youtube",
        isConnected: true,
        lastConnected: new Date().toISOString(),
        accountName: "Canal de Demonstração",
        accountId: `YT-${streamId}`,
        streamId: streamId,
        connectionId: connectionId,
      })

      // Armazenar a URL atual
      setCurrentConnectedUrl(streamId)

      // Adicionar ao histórico de URLs
      const exists = urlHistory.some((item) => item.url === streamId)
      if (!exists) {
        setUrlHistory((prev) => [
          {
            url: streamId,
            connectionId: connectionId,
            timestamp: new Date().toISOString(),
          },
          ...prev,
        ])
      }

      // Adicionar mensagens de exemplo do YouTube
      const youtubeNames = [
        "Fã do Canal",
        "Criador de Conteúdo",
        "YouTuber BR",
        "Gamer Online",
        "Tech Reviewer",
        "Música Boa",
        "Viajante Digital",
        "Cozinha Fácil",
      ]
      const youtubeMessages = [
        "Essa live está incrível! Parabéns pelo conteúdo!",
        "Quando será o próximo evento?",
        "Já deixei meu like e me inscrevi no canal!",
        "Vocês poderiam fazer uma live sobre o tema X?",
        "Estou compartilhando com todos os meus amigos!",
        "De onde vocês estão transmitindo hoje?",
        "Qual é a música de fundo?",
        "Primeira vez assistindo, já virei fã!",
      ]

      // Adicionar várias mensagens para simular uma conversa ativa
      const newMessages = []
      for (let i = 0; i < 5; i++) {
        const randomName = youtubeNames[Math.floor(Math.random() * youtubeNames.length)]
        const randomMessage = youtubeMessages[Math.floor(Math.random() * youtubeMessages.length)]
        const avatarSeed = Math.floor(Math.random() * 70)
        const messageId = `yt-${connectionId}-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 9)}`

        newMessages.push({
          id: messageId,
          sender: randomName,
          senderAvatar: `https://i.pravatar.cc/150?img=${avatarSeed}`,
          content: randomMessage,
          timestamp: new Date(Date.now() - i * 60000).toISOString(), // Mensagens em intervalos de 1 minuto
          isRead: false,
          mediaType: null,
          mediaUrl: null,
          platform: "youtube",
          connectionId: connectionId,
          streamId: streamId, // Adicionar streamId para facilitar filtragem
          platformData: {
            profileUrl: `https://youtube.com/user/${Math.floor(Math.random() * 10000)}`,
            isVerified: Math.random() > 0.8,
            channelName: randomName,
          },
        })
      }

      // Atualizar o último ID de comentário
      if (newMessages.length > 0) {
        setLastCommentId(newMessages[0].id)
      }

      // Atualizar o contador de comentários
      setCommentCounter(5)

      addDebugLog(`Adicionando ${newMessages.length} novas mensagens para a conexão ${connectionId}`)

      // Adicionar as novas mensagens ao estado
      setMessages(newMessages)
      updateLastRefreshTime()
      setLastRefreshTime(new Date())

      setIsLoading(false)
      toast({
        title: "YouTube conectado",
        description: `Você está recebendo comentários da transmissão: ${streamId}`,
      })
    }, 2000)
  }

  // Desconectar do YouTube
  const disconnectYouTube = () => {
    addDebugLog("Iniciando desconexão do YouTube")

    // IMPORTANTE: Limpar TODAS as mensagens do YouTube
    purgeAllYouTubeMessages()

    if (youtubeConnection?.connectionId) {
      addDebugLog(`Desconectando YouTube - Connection ID: ${youtubeConnection.connectionId}`)
    }

    removeConnection("youtube")
    setStreamUrl("")
    setCurrentConnectedUrl("")

    // Limpar o timer de atualização automática
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current)
      refreshTimerRef.current = null
    }

    toast({
      title: "YouTube desconectado",
      description: "Você não está mais recebendo comentários do YouTube.",
    })
  }

  // Reconectar (limpar e conectar novamente)
  const handleReconnect = () => {
    if (!currentConnectedUrl || !youtubeConnection) return

    setIsLoading(true)
    addDebugLog(`Iniciando reconexão do YouTube - URL atual: ${currentConnectedUrl}`)

    // IMPORTANTE: Limpar TODAS as mensagens do YouTube
    purgeAllYouTubeMessages()

    // Remover a conexão existente
    removeConnection("youtube")

    // Gerar um novo ID de conexão
    const newConnectionId = `youtube-${currentConnectedUrl}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    addDebugLog(`Novo Connection ID: ${newConnectionId}`)

    // Esperar um pouco para garantir que tudo foi limpo
    setTimeout(() => {
      // Adicionar nova conexão com o mesmo streamId mas novo connectionId
      addConnection({
        platform: "youtube",
        isConnected: true,
        lastConnected: new Date().toISOString(),
        accountName: "Canal de Demonstração",
        accountId: `YT-${currentConnectedUrl}`,
        streamId: currentConnectedUrl,
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
      const youtubeNames = ["Novo Espectador", "Fã Recente", "Comentarista Ativo", "Visitante Regular", "Seguidor Fiel"]
      const youtubeMessages = [
        "Acabei de chegar na live! O que perdi?",
        "Estou gostando muito do conteúdo de hoje!",
        "Primeira vez assistindo, já me inscrevi no canal!",
        "Vocês sempre trazem temas interessantes!",
        "Compartilhei com meus amigos, eles vão adorar!",
      ]

      // Adicionar várias mensagens para simular uma conversa ativa
      const newMessages = []
      for (let i = 0; i < 5; i++) {
        const randomName = youtubeNames[Math.floor(Math.random() * youtubeNames.length)]
        const randomMessage = youtubeMessages[Math.floor(Math.random() * youtubeMessages.length)]
        const avatarSeed = Math.floor(Math.random() * 70)
        const messageId = `yt-${newConnectionId}-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 9)}`

        newMessages.push({
          id: messageId,
          sender: randomName,
          senderAvatar: `https://i.pravatar.cc/150?img=${avatarSeed}`,
          content: randomMessage,
          timestamp: new Date(Date.now() - i * 60000).toISOString(), // Mensagens em intervalos de 1 minuto
          isRead: false,
          mediaType: null,
          mediaUrl: null,
          platform: "youtube",
          connectionId: newConnectionId,
          streamId: currentConnectedUrl, // Adicionar streamId para facilitar filtragem
          platformData: {
            profileUrl: `https://youtube.com/user/${Math.floor(Math.random() * 10000)}`,
            isVerified: Math.random() > 0.8,
            channelName: randomName,
          },
        })
      }

      // Atualizar o último ID de comentário
      if (newMessages.length > 0) {
        setLastCommentId(newMessages[0].id)
      }

      // Atualizar o contador de comentários
      setCommentCounter(5)

      addDebugLog(`Adicionando ${newMessages.length} novas mensagens após reconexão`)

      // Adicionar as novas mensagens ao estado
      setMessages(newMessages)
      updateLastRefreshTime()
      setLastRefreshTime(new Date())

      setIsLoading(false)
      toast({
        title: "YouTube reconectado",
        description: "Conexão renovada e novas mensagens carregadas.",
      })
    }, 1500)
  }

  // Limpar mensagens do YouTube
  const clearYouTubeMessages = () => {
    addDebugLog("Limpando mensagens do YouTube (exceto as em exibição)")

    // IMPORTANTE: Limpar TODAS as mensagens do YouTube, exceto as em exibição
    const allMessages = useWhatsAppStore.getState().messages
    const displayedMessageIds = useWhatsAppStore.getState().displayedMessages.map((msg) => msg.id)

    // Manter apenas mensagens que não são do YouTube ou que estão em exibição
    const messagesToKeep = allMessages.filter(
      (msg) => msg.platform !== "youtube" || displayedMessageIds.includes(msg.id),
    )

    useWhatsAppStore.setState({ messages: messagesToKeep })
    updateLastRefreshTime()

    addDebugLog(`Mensagens antes: ${allMessages.length}, Mensagens após filtragem: ${messagesToKeep.length}`)

    toast({
      title: "Mensagens do YouTube limpas",
      description: "As mensagens do YouTube foram removidas, exceto as que estão em exibição.",
    })
  }

  // Limpar histórico de URLs
  const clearUrlHistory = () => {
    addDebugLog("Limpando histórico de URLs")

    // Manter apenas a URL atual no histórico, se estiver conectado
    if (currentConnectedUrl && youtubeConnection?.connectionId) {
      setUrlHistory([
        {
          url: currentConnectedUrl,
          connectionId: youtubeConnection.connectionId,
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

  // Função para atualizar mensagens manualmente - MODIFICADA PARA SIMULAR NOVOS COMENTÁRIOS
  const handleRefreshMessages = () => {
    if (!isConnected || !youtubeConnection) return

    addDebugLog("Atualizando mensagens manualmente")

    // Gerar novas mensagens simuladas
    const youtubeNames = [
      "Espectador Atual",
      "Novo Comentarista",
      "Fã do Canal",
      "Visitante",
      "Super Fã",
      "Comentarista Regular",
      "Novo Inscrito",
      "Espectador Fiel",
    ]

    // Mensagens mais variadas e realistas
    const youtubeMessages = [
      "Estou adorando o conteúdo!",
      "Quando será a próxima live?",
      "Já compartilhei com meus amigos!",
      "Vocês poderiam falar sobre o tema X?",
      "Primeira vez assistindo, muito bom!",
      "Acabei de chegar, do que estão falando?",
      "Esse assunto é muito interessante!",
      "Vocês são os melhores nesse tema!",
      "Estou aprendendo muito com vocês!",
      "Qual é a música de fundo?",
      "De onde vocês estão transmitindo hoje?",
      "Já deixei meu like! 👍",
      "Conteúdo de qualidade como sempre!",
      "Vocês poderiam fazer um vídeo sobre X?",
      "Estou acompanhando desde o início!",
      "Ótima explicação sobre esse assunto!",
    ]

    // Adicionar novas mensagens simuladas - SEMPRE DIFERENTES DAS ANTERIORES
    const newMessages = []
    // Número variável de novos comentários (1-4) para parecer mais realista
    const count = Math.floor(Math.random() * 4) + 1

    // Incrementar o contador para simular novos comentários
    const newCounter = commentCounter + count
    setCommentCounter(newCounter)

    for (let i = 0; i < count; i++) {
      const randomName = youtubeNames[Math.floor(Math.random() * youtubeNames.length)]
      const randomMessage = youtubeMessages[Math.floor(Math.random() * youtubeMessages.length)]
      const avatarSeed = Math.floor(Math.random() * 70)
      // Usar o contador para garantir IDs únicos e crescentes
      const messageId = `yt-${youtubeConnection.connectionId}-${Date.now()}-${newCounter - i}-${Math.random().toString(36).substring(2, 9)}`

      newMessages.push({
        id: messageId,
        sender: randomName,
        senderAvatar: `https://i.pravatar.cc/150?img=${avatarSeed}`,
        content: randomMessage,
        timestamp: new Date().toISOString(),
        isRead: false,
        mediaType: null,
        mediaUrl: null,
        platform: "youtube",
        connectionId: youtubeConnection.connectionId,
        streamId: youtubeConnection.streamId, // Adicionar streamId para facilitar filtragem
        platformData: {
          profileUrl: `https://youtube.com/user/${Math.floor(Math.random() * 10000)}`,
          isVerified: Math.random() > 0.8,
          channelName: randomName,
        },
      })
    }

    // Atualizar o último ID de comentário
    if (newMessages.length > 0) {
      setLastCommentId(newMessages[0].id)
    }

    addDebugLog(`Adicionando ${count} novas mensagens na atualização manual`)

    // Adicionar as novas mensagens ao estado - COLOCANDO NO INÍCIO para simular ordem cronológica inversa
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

  // Verificar e limpar mensagens de outras transmissões
  const verifyAndCleanMessages = () => {
    if (!youtubeConnection) return

    addDebugLog("Verificando e limpando mensagens de outras transmissões")

    const allMessages = useWhatsAppStore.getState().messages
    const youtubeMessages = allMessages.filter((msg) => msg.platform === "youtube")
    const currentConnectionMessages = youtubeMessages.filter(
      (msg) => msg.connectionId === youtubeConnection.connectionId,
    )
    const otherConnectionMessages = youtubeMessages.filter((msg) => msg.connectionId !== youtubeConnection.connectionId)

    addDebugLog(`Total de mensagens do YouTube: ${youtubeMessages.length}`)
    addDebugLog(`Mensagens da conexão atual: ${currentConnectionMessages.length}`)
    addDebugLog(`Mensagens de outras conexões: ${otherConnectionMessages.length}`)

    if (otherConnectionMessages.length > 0) {
      // Manter apenas mensagens da conexão atual e de outras plataformas
      const messagesToKeep = allMessages.filter(
        (msg) => msg.platform !== "youtube" || msg.connectionId === youtubeConnection.connectionId,
      )

      useWhatsAppStore.setState({ messages: messagesToKeep })
      updateLastRefreshTime()

      toast({
        title: "Limpeza de cache realizada",
        description: `Removidas ${otherConnectionMessages.length} mensagens de transmissões anteriores.`,
      })
    } else {
      toast({
        title: "Verificação concluída",
        description: "Não foram encontradas mensagens de outras transmissões.",
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
    disconnectYouTube()

    // Limpar histórico de URLs
    setUrlHistory([])

    // Limpar logs de depuração
    setDebugLogs([])

    // Esperar um pouco para garantir que tudo foi limpo
    setTimeout(() => {
      // Definir a URL e conectar novamente
      setStreamUrl(currentUrl)
      setTimeout(() => {
        connectToYouTube()
      }, 500)
    }, 1000)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Youtube className="mr-2 h-5 w-5 text-red-600" />
            Conectar ao YouTube Live
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
        <CardDescription>Receba comentários de uma transmissão ao vivo do YouTube</CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="text-center">
            <div className="flex items-center justify-center mb-4 text-green-500">
              <CheckCircle size={48} />
            </div>
            <h3 className="text-xl font-medium mb-2">YouTube Live conectado</h3>
            <p className="text-muted-foreground mb-2">Transmissão: {currentConnectedUrl}</p>
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
                      {item.url === currentConnectedUrl ? <strong>{item.url} (atual)</strong> : item.url}
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
                          <strong>Connection ID:</strong> {youtubeConnection?.connectionId || "N/A"}
                        </div>
                        <div>
                          <strong>Stream ID:</strong> {youtubeConnection?.streamId || "N/A"}
                        </div>
                        <div>
                          <strong>Total de mensagens:</strong> {messages.filter((m) => m.platform === "youtube").length}
                        </div>
                        <div>
                          <strong>Mensagens desta conexão:</strong>{" "}
                          {messages.filter((m) => m.connectionId === youtubeConnection?.connectionId).length}
                        </div>
                        <div>
                          <strong>Mensagens de outras conexões:</strong>{" "}
                          {
                            messages.filter(
                              (m) => m.platform === "youtube" && m.connectionId !== youtubeConnection?.connectionId,
                            ).length
                          }
                        </div>
                        <div>
                          <strong>Último ID de comentário:</strong> {lastCommentId || "N/A"}
                        </div>
                        <div>
                          <strong>Contador de comentários:</strong> {commentCounter}
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
                  disconnectYouTube()
                  setStreamUrl("")
                  setError(null)
                }}
              >
                Conectar a outra URL
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

              <Button variant="outline" onClick={clearYouTubeMessages}>
                <Trash2 className="mr-2 h-4 w-4" />
                Limpar Mensagens
              </Button>

              <Button variant="destructive" onClick={disconnectYouTube}>
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
                <Label htmlFor="stream-url">URL da Transmissão ao Vivo</Label>
                <Input
                  id="stream-url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={streamUrl}
                  onChange={(e) => setStreamUrl(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Cole a URL da transmissão ao vivo do YouTube que você deseja monitorar.
                </p>
              </div>

              <div className="pt-2">
                {isLoading ? (
                  <Button disabled className="w-full">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando...
                  </Button>
                ) : (
                  <Button onClick={connectToYouTube} className="w-full">
                    Conectar ao YouTube Live
                  </Button>
                )}
              </div>

              <div className="p-3 bg-amber-50 text-amber-700 rounded-md text-sm mt-4">
                <AlertCircle className="inline-block mr-2 h-4 w-4" />
                <span>
                  Modo de simulação: Esta é uma demonstração. Em uma implementação real, seria necessário usar a API do
                  YouTube Data para acessar os comentários da transmissão.
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
