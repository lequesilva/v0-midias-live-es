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
  ExternalLink,
  AlertTriangle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { youtubeApi } from "@/lib/youtube-api"

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
    purgeYouTubeCache,
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

  // Estados para controle da API
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [totalCommentsLoaded, setTotalCommentsLoaded] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [apiStats, setApiStats] = useState({
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    lastRequestTime: null as Date | null,
  })

  // Verificar se o YouTube já está conectado
  const youtubeConnection = connections.find((conn) => conn.platform === "youtube")
  const isConnected = youtubeConnection?.isConnected || false

  // Armazenar a URL atual quando conectado
  const [currentConnectedUrl, setCurrentConnectedUrl] = useState<string>("")
  const [currentVideoId, setCurrentVideoId] = useState<string>("")

  // Função para adicionar logs de depuração
  const addDebugLog = (message: string, data?: any) => {
    if (debugMode) {
      console.log(`[DEBUG] ${message}`, data)
      setDebugLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev.slice(0, 99)])
    }
  }

  // Limpar cache do YouTube ao inicializar o componente
  useEffect(() => {
    addDebugLog("Componente YouTube inicializado - limpando cache e parando simulações")
    purgeYouTubeCache()
  }, [])

  // Atualizar o estado da URL atual quando a conexão mudar
  useEffect(() => {
    if (youtubeConnection?.streamId) {
      setCurrentConnectedUrl(youtubeConnection.streamId)
      setCurrentVideoId(youtubeConnection.streamId)
      addDebugLog(`Conexão YouTube detectada - VideoID: ${youtubeConnection.streamId}`)
    } else {
      setCurrentConnectedUrl("")
      setCurrentVideoId("")
    }
  }, [youtubeConnection])

  // Configurar o timer de atualização automática
  useEffect(() => {
    if (isConnected && autoRefreshEnabled && refreshInterval > 0 && currentVideoId) {
      addDebugLog(
        `Configurando atualização automática a cada ${refreshInterval} segundos para vídeo: ${currentVideoId}`,
      )

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
  }, [isConnected, autoRefreshEnabled, refreshInterval, currentVideoId])

  // Função para buscar comentários da API
  const fetchCommentsFromApi = async (videoId: string, pageToken?: string, maxResults = 20) => {
    addDebugLog(
      `[API] Fazendo requisição - VideoID: ${videoId}, PageToken: ${pageToken || "null"}, MaxResults: ${maxResults}`,
    )

    setApiStats((prev) => ({
      ...prev,
      totalRequests: prev.totalRequests + 1,
      lastRequestTime: new Date(),
    }))

    try {
      const response = await youtubeApi.getComments(videoId, maxResults, pageToken)

      addDebugLog(`[API] Resposta recebida - Success: ${response.success}, Comments: ${response.comments?.length || 0}`)

      if (response.success) {
        setApiStats((prev) => ({
          ...prev,
          successfulRequests: prev.successfulRequests + 1,
        }))

        return response
      } else {
        addDebugLog(`[API] Erro: ${response.error}`)
        setApiStats((prev) => ({
          ...prev,
          failedRequests: prev.failedRequests + 1,
        }))

        throw new Error(response.error || "Erro desconhecido da API")
      }
    } catch (error) {
      addDebugLog(`[API] Exceção: ${error}`)
      setApiStats((prev) => ({
        ...prev,
        failedRequests: prev.failedRequests + 1,
      }))

      throw error
    }
  }

  // Conectar ao YouTube usando a API real
  const connectToYouTube = async () => {
    if (!streamUrl) {
      setError("Por favor, insira a URL da transmissão ao vivo do YouTube")
      return
    }

    setIsLoading(true)
    setError(null)

    // Extrair o ID da transmissão da URL
    const videoId = youtubeApi.extractVideoId(streamUrl)
    if (!videoId) {
      setIsLoading(false)
      setError("URL de transmissão inválida. Use uma URL do YouTube válida.")
      return
    }

    addDebugLog(`[CONNECT] Iniciando conexão com vídeo: ${videoId}`)
    addDebugLog(`[CONNECT] URL original: ${streamUrl}`)

    // Primeiro, testar a conectividade com a API
    addDebugLog(`[CONNECT] Testando conectividade com a API...`)
    const connectionTest = await youtubeApi.testConnection()
    if (!connectionTest.success) {
      setIsLoading(false)
      setError(`Erro de conectividade com a API: ${connectionTest.error}`)
      addDebugLog(`[CONNECT] Teste de conectividade falhou: ${connectionTest.error}`)
      return
    }
    addDebugLog(`[CONNECT] Teste de conectividade bem-sucedido`)

    // IMPORTANTE: Limpar COMPLETAMENTE o cache do YouTube
    addDebugLog("[CONNECT] Limpando cache completo do YouTube")
    purgeYouTubeCache()

    // IMPORTANTE: Verificar se não há outras conexões YouTube ativas
    const existingYouTubeConnections = useWhatsAppStore
      .getState()
      .connections.filter((conn) => conn.platform === "youtube")
    if (existingYouTubeConnections.length > 0) {
      addDebugLog(
        `[CONNECT] AVISO: Encontradas ${existingYouTubeConnections.length} conexões YouTube existentes - removendo`,
      )
      existingYouTubeConnections.forEach((conn) => {
        useWhatsAppStore.getState().removeConnection(conn.connectionId)
      })
    }

    // Resetar todos os estados
    setNextPageToken(null)
    setTotalCommentsLoaded(0)
    setCurrentVideoId("")
    setCurrentConnectedUrl("")

    // Gerar um ID único para esta conexão
    const connectionId = `youtube-${videoId}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    addDebugLog(`[CONNECT] Novo Connection ID: ${connectionId}`)

    try {
      // Buscar comentários da API para o vídeo específico
      addDebugLog(`[CONNECT] Fazendo requisição para API com videoId: ${videoId}`)
      const response = await fetchCommentsFromApi(videoId, undefined, 20)

      addDebugLog(`[CONNECT] Resposta da API:`, {
        success: response.success,
        videoId: response.videoId,
        commentsCount: response.comments?.length || 0,
        error: response.error,
      })

      if (response.success) {
        addDebugLog(`[CONNECT] API retornou ${response.comments.length} comentários para vídeo ${videoId}`)

        // VERIFICAÇÃO CRÍTICA: Confirmar que estamos recebendo dados da API
        if (response.comments.length === 0) {
          addDebugLog(`[CONNECT] AVISO: API retornou 0 comentários para vídeo ${videoId}`)
          toast({
            title: "Aviso",
            description: `A API retornou 0 comentários para o vídeo ${videoId}. Isso pode ser normal se o vídeo não tiver comentários ou se os comentários estiverem desabilitados.`,
            variant: "default",
          })
        } else {
          addDebugLog(`[CONNECT] Primeiro comentário da API:`, {
            id: response.comments[0].id,
            author: response.comments[0].topLevelComment.author.name,
            text: response.comments[0].topLevelComment.text.substring(0, 50) + "...",
          })
        }

        // Adicionar nova conexão
        addConnection({
          platform: "youtube",
          isConnected: true,
          lastConnected: new Date().toISOString(),
          accountName: `Transmissão ${videoId}`,
          accountId: `YT-${videoId}`,
          streamId: videoId,
          connectionId: connectionId,
        })

        // Armazenar a URL atual
        setCurrentConnectedUrl(videoId)
        setCurrentVideoId(videoId)

        if (response.comments.length > 0) {
          // Converter comentários da API para mensagens do sistema
          const newMessages = youtubeApi.convertCommentsToMessages(response.comments, connectionId, videoId)

          addDebugLog(
            `[CONNECT] Convertendo ${response.comments.length} comentários em ${newMessages.length} mensagens`,
          )
          addDebugLog(`[CONNECT] Primeira mensagem convertida:`, {
            id: newMessages[0]?.id,
            sender: newMessages[0]?.sender,
            content: newMessages[0]?.content?.substring(0, 50) + "...",
            connectionId: newMessages[0]?.connectionId,
          })

          // CRÍTICO: Definir as novas mensagens (substituindo qualquer mensagem anterior)
          setMessages(newMessages)
          addDebugLog(`[CONNECT] Mensagens definidas no estado: ${newMessages.length}`)

          // Atualizar controles de paginação
          setNextPageToken(response.pagination.nextPageToken || null)
          setTotalCommentsLoaded(response.comments.length)
        }

        updateLastRefreshTime()
        setLastRefreshTime(new Date())

        setIsLoading(false)
        toast({
          title: "YouTube conectado com sucesso!",
          description: `Conectado à transmissão: ${videoId}. ${response.comments.length} comentários carregados da API.`,
        })
      } else {
        throw new Error(response.error || "Erro ao buscar comentários da API")
      }
    } catch (error) {
      setIsLoading(false)
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
      setError(`Erro ao conectar: ${errorMessage}`)
      addDebugLog(`[CONNECT] Erro: ${errorMessage}`)

      toast({
        title: "Erro na conexão",
        description: `Não foi possível conectar à transmissão ${videoId}: ${errorMessage}`,
        variant: "destructive",
      })
    }
  }

  // Desconectar do YouTube
  const disconnectYouTube = () => {
    addDebugLog("[DISCONNECT] Iniciando desconexão do YouTube")

    // Limpar COMPLETAMENTE o cache do YouTube
    purgeYouTubeCache()

    setStreamUrl("")
    setCurrentConnectedUrl("")
    setCurrentVideoId("")

    // Limpar o timer de atualização automática
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current)
      refreshTimerRef.current = null
    }

    // Resetar estados da API
    setNextPageToken(null)
    setTotalCommentsLoaded(0)

    toast({
      title: "YouTube desconectado",
      description: "Você não está mais recebendo comentários do YouTube.",
    })
  }

  // Atualizar mensagens manualmente usando a API real
  const handleRefreshMessages = async () => {
    if (!isConnected || !youtubeConnection || !currentVideoId) {
      addDebugLog("[REFRESH] Não é possível atualizar: não conectado ou videoId ausente")
      return
    }

    addDebugLog(`[REFRESH] Atualizando mensagens para vídeo: ${currentVideoId}`)
    setIsLoadingMore(true)

    try {
      // Buscar novos comentários da API para o vídeo específico atual
      const response = await fetchCommentsFromApi(currentVideoId, undefined, 10)

      if (response.success && response.comments.length > 0) {
        addDebugLog(`[REFRESH] API retornou ${response.comments.length} comentários`)

        // Converter comentários da API para mensagens do sistema
        const newMessages = youtubeApi.convertCommentsToMessages(
          response.comments,
          youtubeConnection.connectionId,
          currentVideoId,
        )

        // Filtrar apenas comentários que ainda não temos (baseado no ID do comentário da API)
        const existingCommentIds = new Set(
          messages
            .filter((msg) => msg.platform === "youtube" && msg.connectionId === youtubeConnection.connectionId)
            .map((msg) => msg.platformData?.commentId)
            .filter(Boolean),
        )

        const uniqueNewMessages = newMessages.filter(
          (msg) => msg.platformData?.commentId && !existingCommentIds.has(msg.platformData.commentId),
        )

        if (uniqueNewMessages.length > 0) {
          addDebugLog(`[REFRESH] Adicionando ${uniqueNewMessages.length} novas mensagens únicas`)

          // Adicionar as novas mensagens ao estado
          useWhatsAppStore.setState((state) => ({
            messages: [...uniqueNewMessages, ...state.messages],
          }))

          setTotalCommentsLoaded((prev) => prev + uniqueNewMessages.length)

          toast({
            title: "Mensagens atualizadas",
            description: `${uniqueNewMessages.length} nova(s) mensagem(ns) carregada(s) da API.`,
            duration: 2000,
          })
        } else {
          addDebugLog("[REFRESH] Nenhum comentário novo encontrado")
          toast({
            title: "Nenhuma mensagem nova",
            description: "Não há novos comentários disponíveis para esta transmissão.",
            duration: 2000,
          })
        }
      } else {
        addDebugLog(
          `[REFRESH] API não retornou comentários: success=${response.success}, count=${response.comments?.length || 0}`,
        )
        toast({
          title: "Nenhuma mensagem nova",
          description: "Não há novos comentários disponíveis para esta transmissão.",
          duration: 2000,
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
      addDebugLog(`[REFRESH] Erro: ${errorMessage}`)

      toast({
        title: "Erro ao atualizar",
        description: `Erro ao buscar comentários: ${errorMessage}`,
        variant: "destructive",
      })
    } finally {
      setIsLoadingMore(false)
      updateLastRefreshTime()
      setLastRefreshTime(new Date())
    }
  }

  // Carregar mais comentários usando paginação
  const loadMoreComments = async () => {
    if (!isConnected || !youtubeConnection || !currentVideoId || !nextPageToken) return

    addDebugLog(`[LOAD_MORE] Carregando mais comentários com token: ${nextPageToken}`)
    setIsLoadingMore(true)

    try {
      const response = await fetchCommentsFromApi(currentVideoId, nextPageToken, 20)

      if (response.success && response.comments.length > 0) {
        const newMessages = youtubeApi.convertCommentsToMessages(
          response.comments,
          youtubeConnection.connectionId,
          currentVideoId,
        )

        addDebugLog(`[LOAD_MORE] Carregando ${newMessages.length} comentários adicionais`)

        // Adicionar as novas mensagens ao estado
        useWhatsAppStore.setState((state) => ({
          messages: [...state.messages, ...newMessages],
        }))

        // Atualizar controles de paginação
        setNextPageToken(response.pagination.nextPageToken || null)
        setTotalCommentsLoaded((prev) => prev + response.comments.length)

        toast({
          title: "Mais comentários carregados",
          description: `${response.comments.length} comentários adicionais carregados.`,
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
      addDebugLog(`[LOAD_MORE] Erro: ${errorMessage}`)

      toast({
        title: "Erro ao carregar mais",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoadingMore(false)
      updateLastRefreshTime()
    }
  }

  // Reconectar (limpar e conectar novamente)
  const handleReconnect = async () => {
    if (!currentConnectedUrl) return

    setIsLoading(true)
    addDebugLog(`[RECONNECT] Iniciando reconexão - URL atual: ${currentConnectedUrl}`)

    // Limpar COMPLETAMENTE o cache do YouTube
    purgeYouTubeCache()

    // Esperar um pouco para garantir que tudo foi limpo
    setTimeout(async () => {
      try {
        // Definir a URL e conectar novamente
        setStreamUrl(`https://www.youtube.com/watch?v=${currentConnectedUrl}`)
        await connectToYouTube()
      } catch (error) {
        setIsLoading(false)
        addDebugLog(`[RECONNECT] Erro: ${error}`)
      }
    }, 1000)
  }

  // Limpar mensagens do YouTube
  const clearYouTubeMessages = () => {
    addDebugLog("[CLEAR] Limpando mensagens do YouTube (exceto as em exibição)")

    // Limpar TODAS as mensagens do YouTube, exceto as em exibição
    const allMessages = useWhatsAppStore.getState().messages
    const displayedMessageIds = useWhatsAppStore.getState().displayedMessages.map((msg) => msg.id)

    // Manter apenas mensagens que não são do YouTube ou que estão em exibição
    const messagesToKeep = allMessages.filter(
      (msg) => msg.platform !== "youtube" || displayedMessageIds.includes(msg.id),
    )

    useWhatsAppStore.setState({ messages: messagesToKeep })
    updateLastRefreshTime()

    // Resetar contadores
    setTotalCommentsLoaded(0)
    setNextPageToken(null)

    addDebugLog(`[CLEAR] Mensagens antes: ${allMessages.length}, Mensagens após filtragem: ${messagesToKeep.length}`)

    toast({
      title: "Mensagens do YouTube limpas",
      description: "As mensagens do YouTube foram removidas, exceto as que estão em exibição.",
    })
  }

  // Alternar modo de depuração
  const toggleDebugMode = () => {
    setDebugMode(!debugMode)
    setShowDebugInfo(!debugMode)

    toast({
      title: debugMode ? "Modo de depuração desativado" : "Modo de depuração ativado",
      description: debugMode
        ? "Os logs de depuração não serão mais exibidos no console."
        : "Os logs de depuração serão exibidos no console para ajudar na solução de problemas.",
    })
  }

  // Função para limpar completamente o cache e reiniciar
  const purgeAndRestart = () => {
    addDebugLog("[PURGE] Limpando completamente o cache do YouTube")

    // Limpar completamente o cache
    purgeYouTubeCache()

    // Resetar todos os estados locais
    setStreamUrl("")
    setCurrentConnectedUrl("")
    setCurrentVideoId("")
    setNextPageToken(null)
    setTotalCommentsLoaded(0)
    setError(null)
    setDebugLogs([])

    // Limpar timer
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current)
      refreshTimerRef.current = null
    }

    toast({
      title: "Cache limpo",
      description: "Todo o cache do YouTube foi limpo. Você pode conectar a uma nova transmissão.",
    })
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
            <Button variant="ghost" size="sm" onClick={purgeAndRestart} title="Limpar cache completo">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Receba comentários reais de uma transmissão ao vivo do YouTube usando nossa API personalizada
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="text-center">
            <div className="flex items-center justify-center mb-4 text-green-500">
              <CheckCircle size={48} />
            </div>
            <h3 className="text-xl font-medium mb-2">YouTube Live conectado</h3>
            <div className="mb-2 flex items-center justify-center gap-2">
              <p className="text-muted-foreground">Vídeo: {currentVideoId}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(`https://www.youtube.com/watch?v=${currentVideoId}`, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
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
            <p className="text-sm text-muted-foreground mb-4">
              Comentários carregados: {totalCommentsLoaded}
              {nextPageToken && " (Mais disponíveis)"}
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
                    min="30"
                    max="300"
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number.parseInt(e.target.value) || 60)}
                    className="w-24"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshMessages}
                    disabled={isLoadingMore}
                    className="ml-auto bg-transparent"
                  >
                    {isLoadingMore ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RotateCw className="h-4 w-4 mr-2" />
                    )}
                    Atualizar agora
                  </Button>
                </div>
              )}
            </div>

            {/* Estatísticas da API */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Estatísticas da API</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-600">Total de requisições:</span>
                  <div className="font-medium">{apiStats.totalRequests}</div>
                </div>
                <div>
                  <span className="text-green-600">Sucessos:</span>
                  <div className="font-medium">{apiStats.successfulRequests}</div>
                </div>
                <div>
                  <span className="text-red-600">Falhas:</span>
                  <div className="font-medium">{apiStats.failedRequests}</div>
                </div>
                <div>
                  <span className="text-gray-600">Última requisição:</span>
                  <div className="font-medium text-xs">
                    {apiStats.lastRequestTime ? apiStats.lastRequestTime.toLocaleTimeString() : "N/A"}
                  </div>
                </div>
              </div>
            </div>

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
                          <strong>Video ID:</strong> {currentVideoId || "N/A"}
                        </div>
                        <div>
                          <strong>Stream URL:</strong> {streamUrl || "N/A"}
                        </div>
                        <div>
                          <strong>Next Page Token:</strong> {nextPageToken || "N/A"}
                        </div>
                        <div>
                          <strong>Total de mensagens:</strong> {messages.filter((m) => m.platform === "youtube").length}
                        </div>
                        <div>
                          <strong>Mensagens desta conexão:</strong>{" "}
                          {messages.filter((m) => m.connectionId === youtubeConnection?.connectionId).length}
                        </div>
                        <div>
                          <strong>API URL:</strong> https://eo3ys3z8yqseayi.m.pipedream.net
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

              {nextPageToken && (
                <Button variant="outline" onClick={loadMoreComments} disabled={isLoadingMore}>
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    "Carregar Mais"
                  )}
                </Button>
              )}

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
                  placeholder="https://www.youtube.com/watch?v=etOVnZELmSw"
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
                    Conectando à API...
                  </Button>
                ) : (
                  <Button onClick={connectToYouTube} className="w-full">
                    Conectar ao YouTube Live
                  </Button>
                )}
              </div>

              <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm mt-4">
                <CheckCircle className="inline-block mr-2 h-4 w-4" />
                <span>
                  <strong>API Real Integrada:</strong> Esta integração usa sua API personalizada ({youtubeApi.apiUrl}) para buscar comentários
                  reais dos vídeos do YouTube.
                </span>
              </div>

              <div className="p-3 bg-blue-50 text-blue-700 rounded-md text-sm">
                <strong>Recursos disponíveis:</strong>
                <ul className="mt-2 space-y-1 text-xs">
                  <li>• Comentários reais em tempo real</li>
                  <li>• Fotos de perfil dos usuários</li>
                  <li>• Informações de canal e verificação</li>
                  <li>• Paginação para carregar mais comentários</li>
                  <li>• Atualização automática configurável</li>
                  <li>• Cache limpo a cada nova conexão</li>
                  <li>• Teste de conectividade automático</li>
                  <li>• Fallback para requisições GET</li>
                  <li>• Integração com API real (não simulação)</li>
                </ul>
              </div>

              <div className="p-3 bg-orange-50 text-orange-700 rounded-md text-sm">
                <AlertTriangle className="inline-block mr-2 h-4 w-4" />
                <span>
                  <strong>Teste com vídeos reais:</strong> Cole qualquer URL do YouTube para buscar comentários reais
                  usando sua API personalizada.
                </span>
              </div>

              <div className="p-3 bg-gray-50 text-gray-700 rounded-md text-sm">
                <strong>Sua API:</strong> {youtubeApi.apiUrl || "https://eo3ys3z8yqseayi.m.pipedream.net"}
                <br />
                <span className="text-xs">A integração testará automaticamente a conectividade antes de conectar.</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
