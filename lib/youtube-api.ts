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
    console.log(`[YouTubeAPI] Iniciando requisição - VideoID: ${videoId}`)

    try {
      const requestBody = {
        videoId,
        pageToken: pageToken || null,
        maxResults,
      }

      console.log(`[YouTubeAPI] Enviando requisição POST para: ${this.apiUrl}`)
      console.log(`[YouTubeAPI] Corpo da requisição:`, requestBody)

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      console.log(`[YouTubeAPI] Status da resposta: ${response.status}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log(`[YouTubeAPI] Dados recebidos:`, {
        success: data.success,
        videoId: data.videoId,
        totalComments: data.totalComments,
        commentsCount: data.comments?.length || 0,
        hasNextPage: data.pagination?.hasNextPage,
      })

      if (!data.success) {
        throw new Error(data.error || "Erro desconhecido da API")
      }

      return data
    } catch (error) {
      console.error(`[YouTubeAPI] Erro ao buscar comentários:`, error)
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
    console.log(`[YouTubeAPI] Convertendo ${comments.length} comentários para mensagens`)

    return comments.map((comment, index) => {
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
          isVerified: false, // A API não fornece essa informação
          channelName: comment.topLevelComment.author.name,
          likes: comment.topLevelComment.likeCount,
          commentId: comment.id, // ID original do comentário da API
          channelId: comment.topLevelComment.author.channelId,
        },
      }

      console.log(`[YouTubeAPI] Comentário convertido:`, {
        id: message.id,
        sender: message.sender,
        commentId: comment.id,
        streamId: streamId,
      })

      return message
    })
  }
}

export const youtubeApi = new YouTubeApiClient()
