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
  private apiUrl = "https://eo3ys3z8yqseayi.m.pipedream.net"

  async getComments(videoId: string, maxResults = 20, pageToken?: string): Promise<YouTubeApiResponse> {
    console.log(`[YouTubeAPI] ===== INICIANDO REQUISIÇÃO =====`)
    console.log(`[YouTubeAPI] VideoID: ${videoId}`)
    console.log(`[YouTubeAPI] MaxResults: ${maxResults}`)
    console.log(`[YouTubeAPI] PageToken: ${pageToken || "null"}`)

    try {
      const requestBody = {
        videoId,
        pageToken: pageToken || null,
        maxResults,
      }

      console.log(`[YouTubeAPI] URL da API: ${this.apiUrl}`)
      console.log(`[YouTubeAPI] Corpo da requisição:`, JSON.stringify(requestBody, null, 2))

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      console.log(`[YouTubeAPI] Status da resposta: ${response.status}`)
      console.log(`[YouTubeAPI] Headers da resposta:`, Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
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

      console.log(`[YouTubeAPI] ===== REQUISIÇÃO CONCLUÍDA COM SUCESSO =====`)
      return data
    } catch (error) {
      console.error(`[YouTubeAPI] ===== ERRO NA REQUISIÇÃO =====`)
      console.error(`[YouTubeAPI] Erro:`, error)
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

  async getCommentsViaGet(videoId: string, maxResults = 20): Promise<YouTubeApiResponse> {
    try {
      const url = `${this.apiUrl}?videoId=${encodeURIComponent(videoId)}&maxResults=${maxResults}`
      console.log(`[YouTubeAPI] Fazendo requisição GET para: ${url}`)

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Erro desconhecido da API")
      }

      return data
    } catch (error) {
      console.error("Erro ao buscar comentários via GET:", error)
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
}

export const youtubeApi = new YouTubeApiClient()
