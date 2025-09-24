interface YouTubeComment {
  id: string
  topLevelComment: {
    text: string
    author: {
      name: string
      profileImageUrl: string
      channelUrl: string
      channelId: string
    }
    publishedAt: string
    likeCount: number
  }
  replies?: YouTubeComment[]
}

interface YouTubeApiResponse {
  success: boolean
  videoId: string
  totalComments: number
  comments: YouTubeComment[]
  pagination: {
    nextPageToken?: string
    hasNextPage: boolean
  }
  error?: string
}

export class YouTubeApiClient {
  public apiUrl = "https://youtube-msg-api.onrender.com"

  async getComments(videoId: string, maxResults = 20, pageToken?: string): Promise<YouTubeApiResponse> {
    console.log(`[YouTubeAPI] ===== INICIANDO REQUISIÇÃO PARA API HOSPEDADA NO RENDER =====`)
    console.log(`[YouTubeAPI] VideoID: ${videoId}`)
    console.log(`[YouTubeAPI] MaxResults: ${maxResults}`)
    console.log(`[YouTubeAPI] PageToken: ${pageToken || "null"}`)
    console.log(`[YouTubeAPI] API URL: ${this.apiUrl}`)

    try {
      const requestBody = {
        videoId,
        pageToken: pageToken || null,
        maxResults,
      }

      console.log(`[YouTubeAPI] Corpo da requisição:`, JSON.stringify(requestBody, null, 2))

      // Adicionar timeout para evitar requisições que ficam pendentes
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "MidiasLive-YouTube-Integration/1.0",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      console.log(`[YouTubeAPI] Status da resposta: ${response.status}`)
      console.log(`[YouTubeAPI] Headers da resposta:`, Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[YouTubeAPI] Erro HTTP: ${response.status} - ${errorText}`)
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }

      const responseText = await response.text()
      console.log(`[YouTubeAPI] Resposta bruta (primeiros 500 chars):`, responseText.substring(0, 500))

      let data: YouTubeApiResponse
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error(`[YouTubeAPI] Erro ao fazer parse do JSON:`, parseError)
        console.error(`[YouTubeAPI] Resposta completa que causou erro:`, responseText)
        throw new Error(`Erro ao fazer parse da resposta JSON: ${parseError}`)
      }

      console.log(`[YouTubeAPI] ===== RESPOSTA RECEBIDA =====`)
      console.log(`[YouTubeAPI] Success: ${data.success}`)
      console.log(`[YouTubeAPI] VideoID retornado: ${data.videoId}`)
      console.log(`[YouTubeAPI] Total de comentários: ${data.totalComments}`)
      console.log(`[YouTubeAPI] Comentários na resposta: ${data.comments?.length || 0}`)
      console.log(`[YouTubeAPI] Próxima página: ${data.pagination?.nextPageToken || "null"}`)

      if (data.comments && data.comments.length > 0) {
        console.log(`[YouTubeAPI] Primeiro comentário:`, {
          id: data.comments[0].id,
          author: data.comments[0].topLevelComment.author.name,
          text: data.comments[0].topLevelComment.text.substring(0, 100) + "...",
        })
      }

      if (!data.success) {
        console.log(`[YouTubeAPI] Erro da API: ${data.error}`)
        throw new Error(data.error || "Erro desconhecido da API")
      }

      console.log(`[YouTubeAPI] ===== REQUISIÇÃO PARA API HOSPEDADA NO RENDER CONCLUÍDA COM SUCESSO =====`)
      return data
    } catch (error) {
      console.error(`[YouTubeAPI] ===== ERRO NA REQUISIÇÃO PARA API HOSPEDADA NO RENDER =====`)
      console.error(`[YouTubeAPI] Erro:`, error)
      
      // Se for erro de timeout
      if (error.name === 'AbortError') {
        console.error(`[YouTubeAPI] Requisição cancelada por timeout (30s)`)
        return {
          success: false,
          videoId,
          totalComments: 0,
          comments: [],
          pagination: {
            hasNextPage: false,
          },
          error: "Timeout: A API demorou mais de 30 segundos para responder",
        }
      }
      
      return {
        success: false,
        videoId,
        totalComments: 0,
        comments: [],
        pagination: {
          hasNextPage: false,
        },
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }
    }
  }

  // Função para extrair ID do vídeo de uma URL do YouTube
  extractVideoId(url: string): string | null {
    try {
      const parsedUrl = new URL(url)
      let videoId = ""

      if (parsedUrl.hostname.includes("youtube.com")) {
        // Formato: https://www.youtube.com/watch?v=VIDEO_ID
        videoId = parsedUrl.searchParams.get("v") || ""
      } else if (parsedUrl.hostname.includes("youtu.be")) {
        // Formato: https://youtu.be/VIDEO_ID
        videoId = parsedUrl.pathname.substring(1)
      }

      if (!videoId) {
        throw new Error("URL de vídeo inválida")
      }

      console.log(`[YouTubeAPI] VideoID extraído: ${videoId} da URL: ${url}`)
      return videoId
    } catch (err) {
      console.error(`[YouTubeAPI] Erro ao extrair videoID da URL: ${url}`, err)
      return null
    }
  }

  // Função para converter comentários da API para o formato do sistema
  convertCommentsToMessages(comments: YouTubeComment[], connectionId: string, streamId: string) {
    console.log(`[YouTubeAPI] ===== CONVERTENDO COMENTÁRIOS =====`)
    console.log(`[YouTubeAPI] Comentários recebidos: ${comments.length}`)
    console.log(`[YouTubeAPI] Connection ID: ${connectionId}`)
    console.log(`[YouTubeAPI] Stream ID: ${streamId}`)

    const messages = comments.map((comment, index) => {
      const message = {
        id: `yt-${connectionId}-${comment.id}-${Date.now()}-${index}`,
        sender: comment.topLevelComment.author.name,
        senderAvatar: comment.topLevelComment.author.profileImageUrl,
        content: comment.topLevelComment.text,
        timestamp: comment.topLevelComment.publishedAt,
        isRead: false,
        mediaType: null,
        mediaUrl: null,
        platform: "youtube" as const,
        connectionId: connectionId,
        streamId: streamId,
        platformData: {
          profileUrl: comment.topLevelComment.author.channelUrl,
          isVerified: false,
          channelName: comment.topLevelComment.author.name,
          likes: comment.topLevelComment.likeCount,
          commentId: comment.id,
          channelId: comment.topLevelComment.author.channelId,
        },
      }

      if (index === 0) {
        console.log(`[YouTubeAPI] Primeira mensagem convertida:`, {
          id: message.id,
          sender: message.sender,
          content: message.content.substring(0, 50) + "...",
          connectionId: message.connectionId,
          streamId: message.streamId,
        })
      }

      return message
    })

    console.log(`[YouTubeAPI] Mensagens convertidas: ${messages.length}`)
    console.log(`[YouTubeAPI] ===== CONVERSÃO CONCLUÍDA =====`)

    return messages
  }

  // Função para testar a conectividade com a API
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[YouTubeAPI] Testando conectividade com a API hospedada no Render: ${this.apiUrl}`)
      
      // Usar um videoId de teste conhecido
      const testVideoId = "dQw4w9WgXcQ" // Rick Roll - vídeo público conhecido
      
      console.log(`[YouTubeAPI] Fazendo requisição de teste para: ${this.apiUrl}`)
      console.log(`[YouTubeAPI] Payload de teste:`, {
        videoId: testVideoId,
        maxResults: 1,
        pageToken: null,
      })

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          videoId: testVideoId,
          maxResults: 1,
          pageToken: null,
        }),
      })

      console.log(`[YouTubeAPI] Status da resposta de teste: ${response.status}`)
      console.log(`[YouTubeAPI] Headers da resposta:`, Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[YouTubeAPI] Erro HTTP no teste: ${response.status} - ${response.statusText}`)
        console.error(`[YouTubeAPI] Corpo da resposta de erro:`, errorText)
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`)
      }

      const responseText = await response.text()
      console.log(`[YouTubeAPI] Resposta bruta do teste:`, responseText.substring(0, 500))
      
      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error(`[YouTubeAPI] Erro ao fazer parse da resposta de teste:`, parseError)
        throw new Error(`Erro ao fazer parse da resposta JSON: ${parseError}`)
      }
      
      if (data.success) {
        console.log(`[YouTubeAPI] Teste de conectividade com API hospedada no Render bem-sucedido`)
        return { success: true }
      } else {
        console.log(`[YouTubeAPI] API hospedada no Render retornou erro: ${data.error}`)
        return { success: false, error: data.error }
      }
    } catch (error) {
      console.error(`[YouTubeAPI] Erro no teste de conectividade com API hospedada no Render:`, error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      }
    }
  }
}

export const youtubeApi = new YouTubeApiClient()