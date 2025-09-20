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
  Facebook,
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

export default function ConnectFacebook() {
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
  const [pageUrl, setPageUrl] = useState("")
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

  // Verificar se o Facebook já está conectado
  const facebookConnection = connections.find((conn) => conn.platform === "facebook")
  const isConnected = facebookConnection?.isConnected || false

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
    if (facebookConnection?.pageId) {
      setCurrentConnectedUrl(facebookConnection.pageId)

      // Adicionar à lista de histórico se não existir
      const exists = urlHistory.some((item) => item.url === facebookConnection.pageId)
      if (!exists && facebookConnection.connectionId) {
        setUrlHistory((prev) => [
          {
            url: facebookConnection.pageId!,
            connectionId: facebookConnection.connectionId!,
            timestamp: new Date().toISOString(),
          },
          ...prev,
        ])
        addDebugLog(`URL adicionada ao histórico: ${facebookConnection.pageId}`)
      }
    } else {
      setCurrentConnectedUrl("")
    }
  }, [facebookConnection])

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

  // Função para extrair ID da página do Facebook da URL
  const extractPageId = (url: string): string | null => {
    try {
      const parsedUrl = new URL(url)
      let pageId = ""

      if (parsedUrl.hostname.includes("facebook.com")) {
        // Extrair o ID da página da URL
        // Formato: https://www.facebook.com/pagename
        const pathParts = parsedUrl.pathname.split("/").filter(Boolean)
        if (pathParts.length > 0) {
          pageId = pathParts[0]
        }
      }

      if (!pageId) {
        throw new Error("URL de página inválida")
      }

      return pageId
    } catch (err) {
      return null
    }
  }

  // Função para verificar se uma mensagem pertence à página atual
  const isMessageFromCurrentPage = (message: any): boolean => {
    if (!facebookConnection || !message.connectionId) return false
    return message.connectionId === facebookConnection.connectionId
  }

  // Função para limpar completamente todas as mensagens do Facebook
  const purgeAllFacebookMessages = () => {
    addDebugLog("Limpando TODAS as mensagens do Facebook do sistema")

    // Remover todas as mensagens do Facebook do estado
    const allMessages = useWhatsAppStore.getState().messages
    const nonFacebookMessages = allMessages.filter((msg) => msg.platform !== "facebook")
    useWhatsAppStore.setState({ messages: nonFacebookMessages })

    // Remover mensagens do Facebook que estão em exibição
    const displayedMessages = useWhatsAppStore.getState().displayedMessages
    const updatedDisplayedMessages = displayedMessages.filter((msg) => msg.platform !== "facebook")

    // Se houver mensagens em exibição que foram removidas, atualizá-las
    if (displayedMessages.length !== updatedDisplayedMessages.length) {
      updatedDisplayedMessages.forEach((msg) => {
        removeMessageFromDisplay(msg.id)
      })
    }

    addDebugLog(`Removidas ${allMessages.length - nonFacebookMessages.length} mensagens do Facebook`)
    updateLastRefreshTime()

    // Resetar o contador de comentários e o último ID
    setCommentCounter(0)
    setLastCommentId(null)
  }

  // Conectar ao Facebook
  const connectToFacebook = () => {
    if (!pageUrl) {
      setError("Por favor, insira a URL da página do Facebook")
      return
    }

    setIsLoading(true)
    setError(null)

    // Extrair o ID da página da URL
    const pageId = extractPageId(pageUrl)
    if (!pageId) {
      setIsLoading(false)
      setError("URL de página inválida. Use uma URL do Facebook válida.")
      return
    }

    addDebugLog(`Iniciando conexão com página do Facebook: ${pageId}`)

    // IMPORTANTE: Limpar TODAS as mensagens antigas do Facebook, independentemente da conexão
    purgeAllFacebookMessages()

    // Se já estiver conectado, primeiro desconectar completamente
    if (isConnected && facebookConnection) {
      addDebugLog(`Desconectando Facebook antes de nova conexão: ${facebookConnection.connectionId}`)

      // Remover a conexão existente
      removeConnection("facebook")
    }

    // Gerar um ID único para esta conexão
    const connectionId = `facebook-${pageId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    addDebugLog(`Criando nova conexão Facebook - Page ID: ${pageId}, Connection ID: ${connectionId}`)

    // Simulação de conexão bem-sucedida
    setTimeout(() => {
      // Adicionar nova conexão
      addConnection({
        platform: "facebook",
        isConnected: true,
        lastConnected: new Date().toISOString(),
        accountName: `Página ${pageId}`,
        accountId: `FB-${pageId}`,
        pageId: pageId,
        connectionId: connectionId,
      })

      // Armazenar a URL atual
      setCurrentConnectedUrl(pageId)

      // Adicionar ao histórico de URLs
      const exists = urlHistory.some((item) => item.url === pageId)
      if (!exists) {
        setUrlHistory((prev) => [
          {
            url: pageId,
            connectionId: connectionId,
            timestamp: new Date().toISOString(),
          },
          ...prev,
        ])
      }

      // Adicionar mensagens de exemplo do Facebook
      const facebookNames = [
        "Maria Silva",
        "João Oliveira",
        "Ana Santos",
        "Carlos Pereira",
        "Juliana Costa",
        "Roberto Almeida",
        "Fernanda Lima",
        "Lucas Martins",
      ]
      const facebookMessages = [
        "Adoro o conteúdo da página! Sempre acompanho as publicações.",
        "Quando será o próximo evento? Estou ansioso para participar!",
        "Parabéns pelo trabalho! Vocês são incríveis.",
        "Compartilhei com meus amigos, todos adoraram!",
        "Essa transmissão está com uma qualidade excelente!",
        "Primeira vez assistindo, já me tornei fã!",
        "Vocês poderiam falar sobre o tema X na próxima vez?",
        "Estou aprendendo muito com vocês!",
      ]

      // Adicionar várias mensagens para simular uma conversa ativa
      const newMessages = []
      for (let i = 0; i < 5; i++) {
        const randomName = facebookNames[Math.floor(Math.random() * facebookNames.length)]
        const randomMessage = facebookMessages[Math.floor(Math.random() * facebookMessages.length)]
        const avatarSeed = Math.floor(Math.random() * 70)
        const messageId = `fb-${connectionId}-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 9)}`

        newMessages.push({
          id: messageId,
          sender: randomName,
          senderAvatar: `https://i.pravatar.cc/150?img=${avatarSeed}`,
          content: randomMessage,
          timestamp: new Date(Date.now() - i * 60000).toISOString(), // Mensagens em intervalos de 1 minuto
          isRead: false,
          mediaType: null,
          mediaUrl: null,
          platform: "facebook",
          connectionId: connectionId,
          pageId: pageId, // Adicionar pageId para facilitar filtragem
          platformData: {
            profileUrl: `https://facebook.com/user/${Math.floor(Math.random() * 10000)}`,
            isVerified: Math.random() > 0.9,
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
        title: "Facebook conectado",
        description: `Você está recebendo comentários da página: ${pageId}`,
      })
    }, 2000)
  }

  // Desconectar do Facebook
  const disconnectFacebook = () => {
    addDebugLog("Iniciando desconexão do Facebook")

    // IMPORTANTE: Limpar TODAS as mensagens do Facebook
    purgeAllFacebookMessages()

    if (facebookConnection?.connectionId) {
      addDebugLog(`Desconectando Facebook - Connection ID: ${facebookConnection.connectionId}`)
    }

    removeConnection("facebook")
    setPageUrl("")
    setCurrentConnectedUrl("")

    // Limpar o timer de atualização automática
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current)
      refreshTimerRef.current = null
    }

    toast({
      title: "Facebook desconectado",
      description: "Você não está mais recebendo comentários do Facebook.",
    })
  }

  // Reconectar (limpar e conectar novamente)
  const handleReconnect = () => {
    if (!currentConnectedUrl || !facebookConnection) return

    setIsLoading(true)
    addDebugLog(`Iniciando reconexão do Facebook - URL atual: ${currentConnectedUrl}`)

    // IMPORTANTE: Limpar TODAS as mensagens do Facebook
    purgeAllFacebookMessages()

    // Remover a conexão existente
    removeConnection("facebook")

    // Gerar um novo ID de conexão
    const newConnectionId = `facebook-${currentConnectedUrl}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    addDebugLog(`Novo Connection ID: ${newConnectionId}`)

    // Esperar um pouco para garantir que tudo foi limpo
    setTimeout(() => {
      // Adicionar nova conexão com o mesmo pageId mas novo connectionId
      addConnection({
        platform: "facebook",
        isConnected: true,
        lastConnected: new Date().toISOString(),
        accountName: `Página ${currentConnectedUrl}`,
        accountId: `FB-${currentConnectedUrl}`,
        pageId: currentConnectedUrl,
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
      const facebookNames = [
        "Novo Seguidor",
        "Fã da Página",
        "Visitante Ativo",
        "Comentarista Regular",
        "Novo Espectador",
      ]
      const facebookMessages = [
        "Acabei de descobrir esta página! Muito bom o conteúdo!",
        "Estou gostando muito do que vocês compartilham!",
        "Primeira vez comentando, mas já sigo há um tempo!",
        "Vocês sempre trazem temas relevantes!",
        "Compartilhei com meus amigos, eles vão adorar!",
      ]

      // Adicionar várias mensagens para simular uma conversa ativa
      const newMessages = []
      for (let i = 0; i < 5; i++) {
        const randomName = facebookNames[Math.floor(Math.random() * facebookNames.length)]
        const randomMessage = facebookMessages[Math.floor(Math.random() * facebookMessages.length)]
        const avatarSeed = Math.floor(Math.random() * 70)
        const messageId = `fb-${newConnectionId}-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 9)}`

        newMessages.push({
          id: messageId,
          sender: randomName,
          senderAvatar: `https://i.pravatar.cc/150?img=${avatarSeed}`,
          content: randomMessage,
          timestamp: new Date(Date.now() - i * 60000).toISOString(), // Mensagens em intervalos de 1 minuto
          isRead: false,
          mediaType: null,
          mediaUrl: null,
          platform: "facebook",
          connectionId: newConnectionId,
          pageId: currentConnectedUrl, // Adicionar pageId para facilitar filtragem
          platformData: {
            profileUrl: `https://facebook.com/user/${Math.floor(Math.random() * 10000)}`,
            isVerified: Math.random() > 0.9,
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
        title: "Facebook reconectado",
        description: "Conexão renovada e novas mensagens carregadas.",
      })
    }, 1500)
  }

  // Limpar mensagens do Facebook
  const clearFacebookMessages = () => {
    addDebugLog("Limpando mensagens do Facebook (exceto as em exibição)")

    // IMPORTANTE: Limpar TODAS as mensagens do Facebook, exceto as em exibição
    const allMessages = useWhatsAppStore.getState().messages
    const displayedMessageIds = useWhatsAppStore.getState().displayedMessages.map((msg) => msg.id)

    // Manter apenas mensagens que não são do Facebook ou que estão em exibição
    const messagesToKeep = allMessages.filter(
      (msg) => msg.platform !== "facebook" || displayedMessageIds.includes(msg.id),
    )

    useWhatsAppStore.setState({ messages: messagesToKeep })
    updateLastRefreshTime()

    addDebugLog(`Mensagens antes: ${allMessages.length}, Mensagens após filtragem: ${messagesToKeep.length}`)

    toast({
      title: "Mensagens do Facebook limpas",
      description: "As mensagens do Facebook foram removidas, exceto as que estão em exibição.",
    })
  }

  // Limpar histórico de URLs
  const clearUrlHistory = () => {
    addDebugLog("Limpando histórico de URLs")

    // Manter apenas a URL atual no histórico, se estiver conectado
    if (currentConnectedUrl && facebookConnection?.connectionId) {
      setUrlHistory([
        {
          url: currentConnectedUrl,
          connectionId: facebookConnection.connectionId,
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
    if (!isConnected || !facebookConnection) return

    addDebugLog("Atualizando mensagens manualmente")

    // Gerar novas mensagens simuladas
    const facebookNames = [
      "Espectador Atual",
      "Novo Comentarista",
      "Fã da Página",
      "Visitante",
      "Super Fã",
      "Comentarista Regular",
      "Novo Seguidor",
      "Visitante Fiel",
    ]

    // Mensagens mais variadas e realistas
    const facebookMessages = [
      "Estou adorando o conteúdo!",
      "Quando será o próximo evento?",
      "Já compartilhei com meus amigos!",
      "Vocês poderiam falar sobre o tema X?",
      "Primeira vez comentando, muito bom!",
      "Acabei de descobrir esta página, excelente conteúdo!",
      "Esse assunto é muito interessante!",
      "Vocês são os melhores nesse tema!",
      "Estou aprendendo muito com vocês!",
      "Qual é a próxima publicação?",
      "De onde vocês estão transmitindo hoje?",
      "Já deixei meu like! 👍",
      "Conteúdo de qualidade como sempre!",
      "Vocês poderiam fazer um post sobre X?",
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
      const randomName = facebookNames[Math.floor(Math.random() * facebookNames.length)]
      const randomMessage = facebookMessages[Math.floor(Math.random() * facebookMessages.length)]
      const avatarSeed = Math.floor(Math.random() * 70)
      // Usar o contador para garantir IDs únicos e crescentes
      const messageId = `fb-${facebookConnection.connectionId}-${Date.now()}-${newCounter - i}-${Math.random().toString(36).substring(2, 9)}`

      newMessages.push({
        id: messageId,
        sender: randomName,
        senderAvatar: `https://i.pravatar.cc/150?img=${avatarSeed}`,
        content: randomMessage,
        timestamp: new Date().toISOString(),
        isRead: false,
        mediaType: null,
        mediaUrl: null,
        platform: "facebook",
        connectionId: facebookConnection.connectionId,
        pageId: facebookConnection.pageId, // Adicionar pageId para facilitar filtragem
        platformData: {
          profileUrl: `https://facebook.com/user/${Math.floor(Math.random() * 10000)}`,
          isVerified: Math.random() > 0.9,
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

  // Verificar e limpar mensagens de outras páginas
  const verifyAndCleanMessages = () => {
    if (!facebookConnection) return

    addDebugLog("Verificando e limpando mensagens de outras páginas")

    const allMessages = useWhatsAppStore.getState().messages
    const facebookMessages = allMessages.filter((msg) => msg.platform === "facebook")
    const currentConnectionMessages = facebookMessages.filter(
      (msg) => msg.connectionId === facebookConnection.connectionId,
    )
    const otherConnectionMessages = facebookMessages.filter(
      (msg) => msg.connectionId !== facebookConnection.connectionId,
    )

    addDebugLog(`Total de mensagens do Facebook: ${facebookMessages.length}`)
    addDebugLog(`Mensagens da conexão atual: ${currentConnectionMessages.length}`)
    addDebugLog(`Mensagens de outras conexões: ${otherConnectionMessages.length}`)

    if (otherConnectionMessages.length > 0) {
      // Manter apenas mensagens da conexão atual e de outras plataformas
      const messagesToKeep = allMessages.filter(
        (msg) => msg.platform !== "facebook" || msg.connectionId === facebookConnection.connectionId,
      )

      useWhatsAppStore.setState({ messages: messagesToKeep })
      updateLastRefreshTime()

      toast({
        title: "Limpeza de cache realizada",
        description: `Removidas ${otherConnectionMessages.length} mensagens de páginas anteriores.`,
      })
    } else {
      toast({
        title: "Verificação concluída",
        description: "Não foram encontradas mensagens de outras páginas.",
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
    disconnectFacebook()

    // Limpar histórico de URLs
    setUrlHistory([])

    // Limpar logs de depuração
    setDebugLogs([])

    // Esperar um pouco para garantir que tudo foi limpo
    setTimeout(() => {
      // Definir a URL e conectar novamente
      setPageUrl(`https://facebook.com/${currentUrl}`)
      setTimeout(() => {
        connectToFacebook()
      }, 500)
    }, 1000)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Facebook className="mr-2 h-5 w-5 text-blue-600" />
            Conectar ao Facebook
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
        <CardDescription>Receba comentários de uma página do Facebook</CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="text-center">
            <div className="flex items-center justify-center mb-4 text-blue-500">
              <CheckCircle size={48} />
            </div>
            <h3 className="text-xl font-medium mb-2">Facebook conectado</h3>
            <p className="text-muted-foreground mb-2">Página: {currentConnectedUrl}</p>
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
                          <strong>Connection ID:</strong> {facebookConnection?.connectionId || "N/A"}
                        </div>
                        <div>
                          <strong>Page ID:</strong> {facebookConnection?.pageId || "N/A"}
                        </div>
                        <div>
                          <strong>Total de mensagens:</strong>{" "}
                          {messages.filter((m) => m.platform === "facebook").length}
                        </div>
                        <div>
                          <strong>Mensagens desta conexão:</strong>{" "}
                          {messages.filter((m) => m.connectionId === facebookConnection?.connectionId).length}
                        </div>
                        <div>
                          <strong>Mensagens de outras conexões:</strong>{" "}
                          {
                            messages.filter(
                              (m) => m.platform === "facebook" && m.connectionId !== facebookConnection?.connectionId,
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
                  disconnectFacebook()
                  setPageUrl("")
                  setError(null)
                }}
              >
                Conectar a outra página
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

              <Button variant="outline" onClick={clearFacebookMessages}>
                <Trash2 className="mr-2 h-4 w-4" />
                Limpar Mensagens
              </Button>

              <Button variant="destructive" onClick={disconnectFacebook}>
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
                <Label htmlFor="page-url">URL da Página do Facebook</Label>
                <Input
                  id="page-url"
                  placeholder="https://www.facebook.com/suapagina"
                  value={pageUrl}
                  onChange={(e) => setPageUrl(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Cole a URL da página do Facebook que você deseja monitorar.
                </p>
              </div>

              <div className="pt-2">
                {isLoading ? (
                  <Button disabled className="w-full">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando...
                  </Button>
                ) : (
                  <Button onClick={connectToFacebook} className="w-full">
                    Conectar ao Facebook
                  </Button>
                )}
              </div>

              <div className="p-3 bg-amber-50 text-amber-700 rounded-md text-sm mt-4">
                <AlertCircle className="inline-block mr-2 h-4 w-4" />
                <span>
                  Modo de simulação: Esta é uma demonstração. Em uma implementação real, seria necessário usar a API do
                  Facebook para acessar os comentários da página.
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
