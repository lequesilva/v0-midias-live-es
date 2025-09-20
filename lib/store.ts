import { create } from "zustand"
import { persist } from "zustand/middleware"

// Tipos
// Atualizar o tipo PlatformType para incluir facebook e instagram
export type PlatformType = "whatsapp" | "phone" | "youtube" | "facebook" | "instagram"
export type MessageType = "normal" | "prayer" | "testimony"

// Atualizar a interface Program para incluir datas de início e fim
export interface Program {
  id: string
  name: string
  description?: string
  startDate?: string
  endDate?: string
  isActive?: boolean
}

export interface Message {
  id: string
  sender: string
  senderAvatar: string | null
  content: string
  editedContent?: string
  timestamp: string
  isRead: boolean
  mediaType: "image" | "video" | "audio" | null
  mediaUrl: string | null
  platform: PlatformType
  messageType?: MessageType
  programId?: string
  connectionId: string // ID único da conexão (obrigatório)
  platformData?: {
    profileUrl?: string
    isVerified?: boolean
    likes?: number
    channelName?: string
    postId?: string
  }
  phoneData?: {
    phoneNumber?: string
    city?: string
    state?: string
  }
}

export interface PlatformConnection {
  platform: PlatformType
  isConnected: boolean
  lastConnected?: string
  accountName?: string
  accountId?: string
  streamId?: string // Para YouTube Live
  pageId?: string // Para Facebook
  connectionId: string // ID único da conexão (obrigatório)
}

export interface DisplayConfig {
  backgroundColor?: string
  backgroundImage?: string
  cardColor?: string
  cardOpacity?: number
  nameColor?: string
  messageColor?: string
  fontFamily?: string
  fontSize?: number
  showLogo?: boolean
  logoUrl?: string
  showProgramName?: boolean
  programName?: string
  showPlatformIcon?: boolean
  showPlatformName?: boolean
  autoRefreshInterval?: number
}

export interface SavedLayout {
  name: string
  config: DisplayConfig
}

export interface MessageHistory {
  id: string
  messageId: string
  sender: string
  content: string
  editedContent?: string
  platform: PlatformType
  messageType?: MessageType
  programId?: string
  timestamp: string
  displayTimestamp: string
  programName?: string
  connectionId: string // ID único da conexão (obrigatório)
}

export interface PlatformStats {
  platform: PlatformType
  count: number
}

interface WhatsAppState {
  connections: PlatformConnection[]
  messages: Message[]
  selectedMessage: Message | null
  displayedMessages: Message[] // Mensagens que foram enviadas para exibição
  currentDisplayIndex: number // Índice da mensagem atualmente exibida
  displayConfig: DisplayConfig
  savedLayouts: SavedLayout[]
  activePlatformFilter: PlatformType | "all"
  lastRefreshTime: number
  messageHistory: MessageHistory[]
  programs: Program[]
  debugMode: boolean // Novo: modo de depuração para logs

  // Ações
  addConnection: (connection: PlatformConnection) => void
  removeConnection: (platform: PlatformType) => void
  updateConnection: (platform: PlatformType, data: Partial<PlatformConnection>) => void
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  setSelectedMessage: (message: Message | null) => void
  updateEditedContent: (messageId: string, content: string) => void
  updateMessageType: (messageId: string, messageType: MessageType) => void
  updateMessageProgram: (messageId: string, programId: string | undefined) => void
  updateDisplayConfig: (config: DisplayConfig) => void
  saveLayout: (name: string, config: DisplayConfig) => void
  loadLayout: (name: string) => void
  deleteLayout: (name: string) => void
  setActivePlatformFilter: (platform: PlatformType | "all") => void
  sendMessageToDisplay: (message: Message) => void
  removeMessageFromDisplay: (messageId: string) => void
  updateLastRefreshTime: () => void
  simulateNewMessages: () => void
  addToMessageHistory: (message: Message) => void
  clearMessageHistory: () => void
  getMessageHistoryByDate: (date: string) => MessageHistory[]
  getMessageHistoryStats: () => PlatformStats[]
  nextDisplayedMessage: () => void
  previousDisplayedMessage: () => void
  addPhoneMessage: (phoneData: {
    sender: string
    content: string
    phoneNumber: string
    city: string
    state: string
    messageType?: MessageType
    programId?: string
  }) => void
  refreshMessages: () => void
  clearMessages: () => void

  // Funções para gerenciamento de mensagens por conexão
  clearConnectionMessages: (platform: PlatformType, connectionId: string) => void
  getConnectionMessages: (connectionId: string) => Message[]
  removeAllConnectionMessages: (connectionId: string) => void
  setDebugMode: (enabled: boolean) => void

  // Gerenciamento de programas
  addProgram: (program: Omit<Program, "id">) => void
  updateProgram: (id: string, data: Partial<Omit<Program, "id">>) => void
  deleteProgram: (id: string) => void
  getProgram: (id: string) => Program | undefined

  // Adicionar função para obter estatísticas de mensagens por programa
  getMessageStatsByProgram: (programId: string) => PlatformStats[]
}

// Função auxiliar para log de depuração
const debugLog = (enabled: boolean, ...args: any[]) => {
  if (enabled) {
    console.log("[DEBUG]", ...args)
  }
}

export const useWhatsAppStore = create<WhatsAppState>()(
  persist(
    (set, get) => ({
      connections: [],
      messages: [],
      selectedMessage: null,
      displayedMessages: [],
      currentDisplayIndex: 0,
      displayConfig: {
        backgroundColor: "#1e1e2e",
        backgroundImage: "",
        cardColor: "rgba(255, 255, 255, 0.9)",
        cardOpacity: 90,
        nameColor: "#000000",
        messageColor: "#000000",
        fontFamily: "sans-serif",
        fontSize: 24,
        showLogo: false,
        logoUrl: "",
        showProgramName: false,
        programName: "",
        showPlatformIcon: true,
        showPlatformName: false,
        autoRefreshInterval: 10, // em segundos
      },
      savedLayouts: [],
      activePlatformFilter: "all",
      lastRefreshTime: Date.now(),
      messageHistory: [],
      programs: [],
      debugMode: false,

      setDebugMode: (enabled) => set({ debugMode: enabled }),

      addConnection: (connection) =>
        set((state) => {
          // Garantir que a conexão tenha um ID único
          if (!connection.connectionId) {
            connection.connectionId = `${connection.platform}-${connection.streamId || connection.pageId || connection.accountId || Date.now()}-${Math.random().toString(36).substring(2, 9)}`
          }

          debugLog(state.debugMode, "Adicionando conexão:", connection)

          // Verificar se já existe uma conexão para esta plataforma
          const existingIndex = state.connections.findIndex((c) => c.platform === connection.platform)

          if (existingIndex >= 0) {
            // Antes de atualizar, remover todas as mensagens da conexão antiga
            const oldConnection = state.connections[existingIndex]
            if (oldConnection.connectionId !== connection.connectionId) {
              debugLog(state.debugMode, "Removendo mensagens da conexão antiga:", oldConnection.connectionId)

              // Remover mensagens da conexão antiga
              const filteredMessages = state.messages.filter((msg) => msg.connectionId !== oldConnection.connectionId)

              // Remover mensagens da conexão antiga que estão em exibição
              const filteredDisplayedMessages = state.displayedMessages.filter(
                (msg) => msg.connectionId !== oldConnection.connectionId,
              )

              // Atualizar conexões
              const updatedConnections = [...state.connections]
              updatedConnections[existingIndex] = connection

              return {
                connections: updatedConnections,
                messages: filteredMessages,
                displayedMessages: filteredDisplayedMessages,
                currentDisplayIndex: filteredDisplayedMessages.length > 0 ? 0 : 0,
              }
            } else {
              // Mesma conexão, apenas atualizar
              const updatedConnections = [...state.connections]
              updatedConnections[existingIndex] = connection
              return { connections: updatedConnections }
            }
          } else {
            // Adicionar nova conexão
            return { connections: [...state.connections, connection] }
          }
        }),

      removeConnection: (platform) => {
        const state = get()
        debugLog(state.debugMode, `Removendo conexão da plataforma: ${platform}`)

        // Encontrar a conexão a ser removida
        const connectionToRemove = state.connections.find((c) => c.platform === platform)

        if (connectionToRemove) {
          // Remover todas as mensagens desta conexão
          if (connectionToRemove.connectionId) {
            state.removeAllConnectionMessages(connectionToRemove.connectionId)
          }
        }

        set((state) => {
          const updatedConnections = state.connections.filter((c) => c.platform !== platform)
          debugLog(state.debugMode, "Conexões atualizadas:", updatedConnections)

          return {
            connections: updatedConnections,
          }
        })
      },

      updateConnection: (platform, data) =>
        set((state) => ({
          connections: state.connections.map((c) => (c.platform === platform ? { ...c, ...data } : c)),
        })),

      setMessages: (messages) => {
        const state = get()
        debugLog(state.debugMode, "Definindo mensagens:", messages.length)
        set({ messages })
      },

      addMessage: (message) =>
        set((state) => {
          // Garantir que a mensagem tenha um connectionId
          if (!message.connectionId) {
            const connection = state.connections.find((conn) => conn.platform === message.platform)
            if (!connection) {
              debugLog(state.debugMode, "Tentativa de adicionar mensagem sem conexão:", message)
              return {} // Não adicionar mensagem sem conexão
            }
            message.connectionId = connection.connectionId
          }

          debugLog(state.debugMode, "Adicionando mensagem:", message.id, "para conexão:", message.connectionId)

          return {
            messages: [message, ...state.messages],
          }
        }),

      setSelectedMessage: (message) => set({ selectedMessage: message }),

      updateEditedContent: (messageId, content) =>
        set((state) => ({
          messages: state.messages.map((msg) => (msg.id === messageId ? { ...msg, editedContent: content } : msg)),
          selectedMessage:
            state.selectedMessage?.id === messageId
              ? { ...state.selectedMessage, editedContent: content }
              : state.selectedMessage,
          displayedMessages: state.displayedMessages.map((msg) =>
            msg.id === messageId ? { ...msg, editedContent: content } : msg,
          ),
        })),

      updateMessageType: (messageId, messageType) =>
        set((state) => ({
          messages: state.messages.map((msg) => (msg.id === messageId ? { ...msg, messageType } : msg)),
          selectedMessage:
            state.selectedMessage?.id === messageId ? { ...state.selectedMessage, messageType } : state.selectedMessage,
          displayedMessages: state.displayedMessages.map((msg) =>
            msg.id === messageId ? { ...msg, messageType } : msg,
          ),
        })),

      updateMessageProgram: (messageId, programId) =>
        set((state) => ({
          messages: state.messages.map((msg) => (msg.id === messageId ? { ...msg, programId } : msg)),
          selectedMessage:
            state.selectedMessage?.id === messageId ? { ...state.selectedMessage, programId } : state.selectedMessage,
          displayedMessages: state.displayedMessages.map((msg) => (msg.id === messageId ? { ...msg, programId } : msg)),
        })),

      updateDisplayConfig: (config) => set({ displayConfig: config }),

      saveLayout: (name, config) =>
        set((state) => {
          const existingIndex = state.savedLayouts.findIndex((layout) => layout.name === name)

          if (existingIndex >= 0) {
            // Atualizar layout existente
            const updatedLayouts = [...state.savedLayouts]
            updatedLayouts[existingIndex] = { name, config }
            return { savedLayouts: updatedLayouts }
          } else {
            // Adicionar novo layout
            return { savedLayouts: [...state.savedLayouts, { name, config }] }
          }
        }),

      loadLayout: (name) =>
        set((state) => {
          const layout = state.savedLayouts.find((layout) => layout.name === name)
          if (layout) {
            return { displayConfig: layout.config }
          }
          return {}
        }),

      deleteLayout: (name) =>
        set((state) => ({
          savedLayouts: state.savedLayouts.filter((layout) => layout.name !== name),
        })),

      setActivePlatformFilter: (platform) =>
        set({
          activePlatformFilter: platform,
        }),

      addToMessageHistory: (message) =>
        set((state) => {
          const program = message.programId ? state.programs.find((p) => p.id === message.programId) : undefined

          const historyEntry: MessageHistory = {
            id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            messageId: message.id,
            sender: message.sender,
            content: message.content,
            editedContent: message.editedContent,
            platform: message.platform,
            messageType: message.messageType,
            programId: message.programId,
            timestamp: message.timestamp,
            displayTimestamp: new Date().toISOString(),
            programName: program?.name || state.displayConfig.programName || undefined,
            connectionId: message.connectionId,
          }

          return {
            messageHistory: [historyEntry, ...state.messageHistory],
          }
        }),

      clearMessageHistory: () => set({ messageHistory: [] }),

      getMessageHistoryByDate: (date) => {
        const history = get().messageHistory
        return history.filter((entry) => {
          const entryDate = new Date(entry.displayTimestamp).toLocaleDateString()
          return entryDate === date
        })
      },

      getMessageHistoryStats: () => {
        const history = get().messageHistory
        const stats: Record<string, number> = {}

        // Contar mensagens por plataforma
        history.forEach((entry) => {
          if (!stats[entry.platform]) {
            stats[entry.platform] = 0
          }
          stats[entry.platform]++
        })

        // Converter para array de PlatformStats
        return Object.entries(stats).map(([platform, count]) => ({
          platform: platform as PlatformType,
          count,
        }))
      },

      sendMessageToDisplay: (message) => {
        const state = get()
        // Verificar se a mensagem já está na lista de exibição
        const exists = state.displayedMessages.some((msg) => msg.id === message.id)

        // Adicionar ao histórico
        state.addToMessageHistory(message)

        if (exists) {
          // Atualizar a mensagem existente
          set({
            displayedMessages: state.displayedMessages.map((msg) => (msg.id === message.id ? message : msg)),
          })
        } else {
          // Adicionar a nova mensagem no início da lista
          set({
            displayedMessages: [message, ...state.displayedMessages],
            currentDisplayIndex: 0, // Resetar para a primeira mensagem
          })
        }
      },

      removeMessageFromDisplay: (messageId) =>
        set((state) => {
          const newDisplayedMessages = state.displayedMessages.filter((msg) => msg.id !== messageId)
          const newIndex = Math.min(state.currentDisplayIndex, newDisplayedMessages.length - 1)
          return {
            displayedMessages: newDisplayedMessages,
            currentDisplayIndex: newIndex >= 0 ? newIndex : 0,
          }
        }),

      nextDisplayedMessage: () =>
        set((state) => {
          if (state.displayedMessages.length <= 1) return {}

          const nextIndex = (state.currentDisplayIndex + 1) % state.displayedMessages.length
          return { currentDisplayIndex: nextIndex }
        }),

      previousDisplayedMessage: () =>
        set((state) => {
          if (state.displayedMessages.length <= 1) return {}

          const prevIndex =
            (state.currentDisplayIndex - 1 + state.displayedMessages.length) % state.displayedMessages.length
          return { currentDisplayIndex: prevIndex }
        }),

      updateLastRefreshTime: () => set({ lastRefreshTime: Date.now() }),

      simulateNewMessages: () => {
        const state = get()
        const platforms = state.connections.filter((conn) => conn.isConnected).map((conn) => conn.platform)

        if (platforms.length === 0) return

        // Escolher uma plataforma aleatória entre as conectadas
        const randomPlatform = platforms[Math.floor(Math.random() * platforms.length)]

        // Obter a conexão específica para a plataforma selecionada
        const platformConnection = state.connections.find((conn) => conn.platform === randomPlatform)
        if (!platformConnection) return // Não continuar se não encontrar a conexão

        // Gerar uma mensagem aleatória
        const randomNames = [
          "Ana Silva",
          "Carlos Oliveira",
          "Mariana Santos",
          "Pedro Costa",
          "Juliana Lima",
          "Rafael Souza",
          "Fernanda Alves",
          "Bruno Pereira",
        ]
        const randomMessages = [
          "Olá! Estou adorando o conteúdo!",
          "Quando será o próximo evento?",
          "Parabéns pelo trabalho!",
          "Essa é minha primeira vez aqui, muito legal!",
          "Vocês poderiam falar sobre o tema X na próxima vez?",
          "Estou compartilhando com todos os meus amigos!",
          "De onde vocês estão transmitindo hoje?",
          "Qual é a música de fundo?",
        ]

        const randomName = randomNames[Math.floor(Math.random() * randomNames.length)]
        const randomMessage = randomMessages[Math.floor(Math.random() * randomMessages.length)]

        // Adicionar um ID único com timestamp e connectionId para evitar duplicações
        const uniqueId = `${randomPlatform}-${platformConnection.connectionId}-${Date.now()}-${Math.floor(Math.random() * 10000)}`

        const newMessage = {
          id: uniqueId,
          sender: randomName,
          senderAvatar: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`,
          content: randomMessage,
          timestamp: new Date().toISOString(),
          isRead: false,
          mediaType: null,
          mediaUrl: null,
          platform: randomPlatform,
          connectionId: platformConnection.connectionId,
          platformData: {
            profileUrl: `https://example.com/user/${Math.floor(Math.random() * 1000)}`,
            isVerified: Math.random() > 0.8,
          },
        }

        set((state) => ({
          messages: [newMessage, ...state.messages],
          lastRefreshTime: Date.now(),
        }))
      },

      addPhoneMessage: (phoneData) => {
        const phoneConnectionId = `phone-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

        const newMessage: Message = {
          id: `phone-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          sender: phoneData.sender,
          senderAvatar: "/placeholder.svg?height=48&width=48",
          content: phoneData.content,
          timestamp: new Date().toISOString(),
          isRead: false,
          mediaType: null,
          mediaUrl: null,
          platform: "phone",
          messageType: phoneData.messageType || "normal",
          programId: phoneData.programId,
          connectionId: phoneConnectionId,
          phoneData: {
            phoneNumber: phoneData.phoneNumber,
            city: phoneData.city,
            state: phoneData.state,
          },
        }

        set((state) => ({
          messages: [newMessage, ...state.messages],
        }))
      },

      refreshMessages: () => {
        // Limpar mensagens antigas
        set((state) => {
          // Manter apenas as mensagens que estão em exibição
          const displayedMessageIds = state.displayedMessages.map((msg) => msg.id)
          const filteredMessages = state.messages.filter((msg) => displayedMessageIds.includes(msg.id))

          return {
            messages: filteredMessages,
            lastRefreshTime: Date.now(),
          }
        })

        // Simular novas mensagens
        const state = get()
        // Verificar quais plataformas estão realmente conectadas
        const platforms = state.connections.filter((conn) => conn.isConnected).map((conn) => conn.platform)

        // Se não houver plataformas conectadas, não gerar novas mensagens
        if (platforms.length === 0) return

        // Gerar várias mensagens novas
        const newMessages = []
        const count = Math.floor(Math.random() * 5) + 3 // 3 a 7 novas mensagens

        for (let i = 0; i < count; i++) {
          // Garantir uma distribuição equilibrada entre as plataformas
          const platformIndex = i % platforms.length
          const platform = platforms[platformIndex]
          const timestamp = new Date(Date.now() - Math.floor(Math.random() * 300000)) // Últimos 5 minutos

          // Obter a conexão específica para a plataforma
          const connection = state.connections.find((conn) => conn.platform === platform)
          if (!connection) continue // Pular se não encontrar a conexão

          // Nomes e mensagens específicas por plataforma
          let randomName = ""
          let randomMessage = ""
          let avatarUrl = ""

          // Dados específicos da plataforma
          let platformData = {}

          // Configurar dados específicos por plataforma
          switch (platform) {
            case "youtube":
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
              randomName = youtubeNames[Math.floor(Math.random() * youtubeNames.length)]
              randomMessage = youtubeMessages[Math.floor(Math.random() * youtubeMessages.length)]
              avatarUrl = `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`
              platformData = {
                profileUrl: `https://youtube.com/user/${Math.floor(Math.random() * 10000)}`,
                isVerified: Math.random() > 0.8,
                channelName: randomName,
              }
              break

            case "facebook":
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
              randomName = facebookNames[Math.floor(Math.random() * facebookNames.length)]
              randomMessage = facebookMessages[Math.floor(Math.random() * facebookMessages.length)]
              avatarUrl = `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`
              platformData = {
                profileUrl: `https://facebook.com/user/${Math.floor(Math.random() * 10000)}`,
                isVerified: Math.random() > 0.9,
              }
              break

            case "instagram":
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
              randomName = instagramNames[Math.floor(Math.random() * instagramNames.length)]
              randomMessage = instagramMessages[Math.floor(Math.random() * instagramMessages.length)]
              avatarUrl = `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`
              platformData = {
                profileUrl: `https://instagram.com/${randomName}`,
                isVerified: Math.random() > 0.8,
              }
              break

            case "whatsapp":
            default:
              const whatsappNames = [
                "Ana Silva",
                "Carlos Oliveira",
                "Mariana Santos",
                "Pedro Costa",
                "Juliana Lima",
                "Rafael Souza",
                "Fernanda Alves",
                "Bruno Pereira",
                "Luciana Mendes",
                "Gustavo Rocha",
                "Camila Dias",
                "Diego Cardoso",
              ]
              const whatsappMessages = [
                "Olá! Estou adorando a transmissão de hoje!",
                "Quando será o próximo evento?",
                "Parabéns pelo trabalho! Vocês são incríveis.",
                "Essa é minha primeira vez aqui, muito legal!",
                "Vocês poderiam falar sobre o tema X na próxima vez?",
                "Estou compartilhando com todos os meus amigos!",
                "De onde vocês estão transmitindo hoje?",
                "Qual é a música de fundo?",
              ]
              randomName = whatsappNames[Math.floor(Math.random() * whatsappNames.length)]
              randomMessage = whatsappMessages[Math.floor(Math.random() * whatsappMessages.length)]
              avatarUrl = `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`
              break
          }

          // Adicionar um ID único com timestamp e connectionId para evitar duplicações
          const uniqueId = `${platform}-${connection.connectionId}-${Date.now()}-${Math.floor(Math.random() * 10000)}-${i}`

          newMessages.push({
            id: uniqueId,
            sender: randomName,
            senderAvatar: avatarUrl,
            content: randomMessage,
            timestamp: timestamp.toISOString(),
            isRead: false,
            mediaType: null,
            mediaUrl: null,
            platform: platform,
            connectionId: connection.connectionId,
            platformData: platformData,
          })
        }

        // Adicionar as novas mensagens
        set((state) => ({
          messages: [...newMessages, ...state.messages],
          lastRefreshTime: Date.now(),
        }))
      },

      clearMessages: () => {
        // Manter apenas as mensagens que estão em exibição
        const displayedMessageIds = useWhatsAppStore.getState().displayedMessages.map((msg) => msg.id)

        set((state) => {
          debugLog(state.debugMode, "Limpando mensagens...")
          debugLog(state.debugMode, "Mensagens antes:", state.messages.length)
          debugLog(state.debugMode, "Mensagens em exibição:", displayedMessageIds.length)

          const filteredMessages = state.messages.filter((msg) => displayedMessageIds.includes(msg.id))

          debugLog(state.debugMode, "Mensagens após filtragem:", filteredMessages.length)

          // Desativar temporariamente a atualização automática
          const updatedConfig = {
            ...state.displayConfig,
            autoRefreshInterval: 0,
          }

          return {
            messages: filteredMessages,
            lastRefreshTime: Date.now(),
            displayConfig: updatedConfig,
          }
        })

        // Forçar uma atualização do estado para garantir que as mudanças sejam aplicadas
        setTimeout(() => {
          set({
            lastRefreshTime: Date.now(),
          })
        }, 100)
      },

      // Funções para gerenciamento de mensagens por conexão
      clearConnectionMessages: (platform: PlatformType, connectionId: string) => {
        const state = get()
        debugLog(state.debugMode, `Limpando mensagens da conexão: ${connectionId} (plataforma: ${platform})`)

        // Obter IDs das mensagens em exibição
        const displayedMessageIds = state.displayedMessages.map((msg) => msg.id)

        set((state) => {
          // Filtrar mensagens: manter as que estão em exibição e as de outras conexões
          const filteredMessages = state.messages.filter(
            (msg) =>
              displayedMessageIds.includes(msg.id) || !(msg.platform === platform && msg.connectionId === connectionId),
          )

          return {
            messages: filteredMessages,
            lastRefreshTime: Date.now(),
          }
        })
      },

      getConnectionMessages: (connectionId: string) => {
        const state = get()
        return state.messages.filter((msg) => msg.connectionId === connectionId)
      },

      removeAllConnectionMessages: (connectionId: string) => {
        const state = get()
        debugLog(state.debugMode, `Removendo TODAS as mensagens da conexão: ${connectionId}`)

        set((state) => {
          // Remover todas as mensagens desta conexão, incluindo as em exibição
          const filteredMessages = state.messages.filter((msg) => msg.connectionId !== connectionId)

          // Remover mensagens da conexão que estão em exibição
          const filteredDisplayedMessages = state.displayedMessages.filter((msg) => msg.connectionId !== connectionId)

          // Atualizar o índice de exibição se necessário
          const newIndex = Math.min(state.currentDisplayIndex, filteredDisplayedMessages.length - 1)

          return {
            messages: filteredMessages,
            displayedMessages: filteredDisplayedMessages,
            currentDisplayIndex: newIndex >= 0 ? newIndex : 0,
            lastRefreshTime: Date.now(),
          }
        })
      },

      // Gerenciamento de programas
      addProgram: (program) => {
        const id = `program-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        set((state) => ({
          programs: [...state.programs, { id, ...program }],
        }))
      },

      updateProgram: (id, data) =>
        set((state) => ({
          programs: state.programs.map((program) => (program.id === id ? { ...program, ...data } : program)),
        })),

      deleteProgram: (id) =>
        set((state) => ({
          programs: state.programs.filter((program) => program.id !== id),
        })),

      getProgram: (id) => {
        return get().programs.find((program) => program.id === id)
      },

      // Implementação da função getMessageStatsByProgram
      getMessageStatsByProgram: (programId: string) => {
        const history = get().messageHistory
        const stats: Record<string, number> = {}

        // Contar mensagens por plataforma para o programa específico
        history.forEach((entry) => {
          if (entry.programId === programId) {
            if (!stats[entry.platform]) {
              stats[entry.platform] = 0
            }
            stats[entry.platform]++
          }
        })

        // Converter para array de PlatformStats
        return Object.entries(stats).map(([platform, count]) => ({
          platform: platform as PlatformType,
          count,
        }))
      },
    }),
    {
      name: "whats-live-storage",
      // Controlar o que é persistido para evitar problemas entre sessões
      partialize: (state) => ({
        // Persistir apenas configurações e layouts, não mensagens ou conexões
        displayConfig: state.displayConfig,
        savedLayouts: state.savedLayouts,
        programs: state.programs,
        // Não persistir mensagens, conexões ou mensagens em exibição
        connections: [],
        messages: [],
        displayedMessages: [],
        messageHistory: [],
        // Importante: forçar a limpeza do estado
        lastRefreshTime: Date.now(),
      }),
    },
  ),
)

// Função para ativar o modo de depuração
export const enableDebugMode = () => {
  useWhatsAppStore.setState({ debugMode: true })
  console.log("[DEBUG] Modo de depuração ativado")
}

// Função para desativar o modo de depuração
export const disableDebugMode = () => {
  useWhatsAppStore.setState({ debugMode: false })
  console.log("[DEBUG] Modo de depuração desativado")
}

// Função para limpar completamente o armazenamento local
export const clearLocalStorage = () => {
  localStorage.removeItem("whats-live-storage")
  console.log("Armazenamento local limpo. Recarregue a página para reiniciar o aplicativo.")
}

// Função para limpar completamente o cache local e recarregar a página
export const purgeLocalStorageAndReload = () => {
  localStorage.removeItem("whats-live-storage")
  console.log("Armazenamento local limpo. Recarregando a página...")
  window.location.reload()
}
