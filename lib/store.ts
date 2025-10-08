import { create } from "zustand"
import { persist } from "zustand/middleware"

export type PlatformType = "whatsapp" | "phone" | "youtube" | "facebook" | "instagram"
export type MessageType = "normal" | "prayer" | "testimony"

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
  connectionId: string
  streamId?: string
  platformData?: {
    profileUrl?: string
    isVerified?: boolean
    likes?: number
    channelName?: string
    postId?: string
    commentId?: string
    channelId?: string
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
  streamId?: string
  pageId?: string
  connectionId: string
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
  connectionId: string
}

export interface PlatformStats {
  platform: PlatformType
  count: number
}

interface WhatsAppState {
  connections: PlatformConnection[]
  messages: Message[]
  selectedMessage: Message | null
  displayedMessages: Message[]
  currentDisplayIndex: number
  displayConfig: DisplayConfig
  savedLayouts: SavedLayout[]
  activePlatformFilter: PlatformType | "all"
  lastRefreshTime: number
  messageHistory: MessageHistory[]
  programs: Program[]
  debugMode: boolean

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
  clearConnectionMessages: (platform: PlatformType, connectionId: string) => void
  getConnectionMessages: (connectionId: string) => Message[]
  removeAllConnectionMessages: (connectionId: string) => void
  setDebugMode: (enabled: boolean) => void
  addProgram: (program: Omit<Program, "id">) => void
  updateProgram: (id: string, data: Partial<Omit<Program, "id">>) => void
  deleteProgram: (id: string) => void
  getProgram: (id: string) => Program | undefined
  getMessageStatsByProgram: (programId: string) => PlatformStats[]
  purgeYouTubeCache: () => void
}

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
        autoRefreshInterval: 10,
      },
      savedLayouts: [],
      activePlatformFilter: "all",
      lastRefreshTime: Date.now(),
      messageHistory: [],
      programs: [],
      debugMode: false,

      setDebugMode: (enabled) => set({ debugMode: enabled }),

      purgeYouTubeCache: () => {
        const state = get()
        debugLog(state.debugMode, "Limpando COMPLETAMENTE o cache do YouTube")

        set((state) => {
          const nonYoutubeMessages = state.messages.filter((msg) => msg.platform !== "youtube")
          const nonYoutubeDisplayedMessages = state.displayedMessages.filter((msg) => msg.platform !== "youtube")
          const nonYoutubeConnections = state.connections.filter((conn) => conn.platform !== "youtube")

          debugLog(
            state.debugMode,
            `Removidas ${state.messages.length - nonYoutubeMessages.length} mensagens do YouTube`,
          )

          return {
            messages: nonYoutubeMessages,
            displayedMessages: nonYoutubeDisplayedMessages,
            connections: nonYoutubeConnections,
            currentDisplayIndex: nonYoutubeDisplayedMessages.length > 0 ? 0 : 0,
            lastRefreshTime: Date.now(),
          }
        })
      },

      addConnection: (connection) =>
        set((state) => {
          if (!connection.connectionId) {
            connection.connectionId = `${connection.platform}-${connection.streamId || connection.pageId || connection.accountId || Date.now()}-${Math.random().toString(36).substring(2, 9)}`
          }

          debugLog(state.debugMode, "Adicionando conexão:", connection)

          if (connection.platform === "youtube") {
            const nonYoutubeMessages = state.messages.filter((msg) => msg.platform !== "youtube")
            const nonYoutubeDisplayedMessages = state.displayedMessages.filter((msg) => msg.platform !== "youtube")
            const nonYoutubeConnections = state.connections.filter((conn) => conn.platform !== "youtube")

            debugLog(state.debugMode, "Limpando cache do YouTube antes de nova conexão")

            return {
              connections: [...nonYoutubeConnections, connection],
              messages: nonYoutubeMessages,
              displayedMessages: nonYoutubeDisplayedMessages,
              currentDisplayIndex: nonYoutubeDisplayedMessages.length > 0 ? 0 : 0,
            }
          }

          const existingIndex = state.connections.findIndex((c) => c.platform === connection.platform)

          if (existingIndex >= 0) {
            const oldConnection = state.connections[existingIndex]
            if (oldConnection.connectionId !== connection.connectionId) {
              debugLog(state.debugMode, "Removendo mensagens da conexão antiga:", oldConnection.connectionId)

              const filteredMessages = state.messages.filter((msg) => msg.connectionId !== oldConnection.connectionId)
              const filteredDisplayedMessages = state.displayedMessages.filter(
                (msg) => msg.connectionId !== oldConnection.connectionId,
              )

              const updatedConnections = [...state.connections]
              updatedConnections[existingIndex] = connection

              return {
                connections: updatedConnections,
                messages: filteredMessages,
                displayedMessages: filteredDisplayedMessages,
                currentDisplayIndex: filteredDisplayedMessages.length > 0 ? 0 : 0,
              }
            } else {
              const updatedConnections = [...state.connections]
              updatedConnections[existingIndex] = connection
              return { connections: updatedConnections }
            }
          } else {
            return { connections: [...state.connections, connection] }
          }
        }),

      removeConnection: (platform) => {
        const state = get()
        debugLog(state.debugMode, `Removendo conexão da plataforma: ${platform}`)

        if (platform === "youtube") {
          state.purgeYouTubeCache()
          return
        }

        const connectionToRemove = state.connections.find((c) => c.platform === platform)

        if (connectionToRemove) {
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
          if (!message.connectionId) {
            const connection = state.connections.find((conn) => conn.platform === message.platform)
            if (!connection) {
              debugLog(state.debugMode, "Tentativa de adicionar mensagem sem conexão:", message)
              return {}
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
            const updatedLayouts = [...state.savedLayouts]
            updatedLayouts[existingIndex] = { name, config }
            return { savedLayouts: updatedLayouts }
          } else {
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

        history.forEach((entry) => {
          if (!stats[entry.platform]) {
            stats[entry.platform] = 0
          }
          stats[entry.platform]++
        })

        return Object.entries(stats).map(([platform, count]) => ({
          platform: platform as PlatformType,
          count,
        }))
      },

      sendMessageToDisplay: (message) => {
        const state = get()
        const exists = state.displayedMessages.some((msg) => msg.id === message.id)

        state.addToMessageHistory(message)

        if (exists) {
          set({
            displayedMessages: state.displayedMessages.map((msg) => (msg.id === message.id ? message : msg)),
          })
        } else {
          set({
            displayedMessages: [message, ...state.displayedMessages],
            currentDisplayIndex: 0,
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
        const platforms = state.connections
          .filter((conn) => conn.isConnected && conn.platform !== "youtube")
          .map((conn) => conn.platform)

        if (platforms.length === 0) return

        const randomPlatform = platforms[Math.floor(Math.random() * platforms.length)]

        const platformConnection = state.connections.find((conn) => conn.platform === randomPlatform)
        if (!platformConnection) return

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
        const state = get()

        const displayedMessageIds = state.displayedMessages.map((msg) => msg.id)
        const filteredMessages = state.messages.filter((msg) => displayedMessageIds.includes(msg.id))

        set({
          messages: filteredMessages,
          lastRefreshTime: Date.now(),
        })

        const platforms = state.connections
          .filter((conn) => conn.isConnected && conn.platform !== "youtube")
          .map((conn) => conn.platform)

        if (platforms.length === 0) return

        const newMessages = []
        const count = Math.floor(Math.random() * 5) + 3

        for (let i = 0; i < count; i++) {
          const platformIndex = i % platforms.length
          const platform = platforms[platformIndex]
          const timestamp = new Date(Date.now() - Math.floor(Math.random() * 300000))

          const connection = state.connections.find((conn) => conn.platform === platform)
          if (!connection) continue

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
            "Olá! Estou adorando a transmissão de hoje!",
            "Quando será o próximo evento?",
            "Parabéns pelo trabalho! Vocês são incríveis.",
            "Essa é minha primeira vez aqui, muito legal!",
            "Vocês poderiam falar sobre o tema X na próxima vez?",
            "Estou compartilhando com todos os meus amigos!",
            "De onde vocês estão transmitindo hoje?",
            "Qual é a música de fundo?",
          ]

          const randomName = randomNames[Math.floor(Math.random() * randomNames.length)]
          const randomMessage = randomMessages[Math.floor(Math.random() * randomMessages.length)]
          const avatarUrl = `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`

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
            platformData: {
              profileUrl: `https://example.com/user/${Math.floor(Math.random() * 1000)}`,
              isVerified: Math.random() > 0.8,
            },
          })
        }

        set((state) => ({
          messages: [...newMessages, ...state.messages],
          lastRefreshTime: Date.now(),
        }))
      },

      clearMessages: () => {
        const displayedMessageIds = useWhatsAppStore.getState().displayedMessages.map((msg) => msg.id)

        set((state) => {
          debugLog(state.debugMode, "Limpando mensagens...")

          const filteredMessages = state.messages.filter((msg) => displayedMessageIds.includes(msg.id))

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
      },

      clearConnectionMessages: (platform: PlatformType, connectionId: string) => {
        const state = get()

        const displayedMessageIds = state.displayedMessages.map((msg) => msg.id)

        set((state) => {
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

        set((state) => {
          const filteredMessages = state.messages.filter((msg) => msg.connectionId !== connectionId)
          const filteredDisplayedMessages = state.displayedMessages.filter((msg) => msg.connectionId !== connectionId)

          const newIndex = Math.min(state.currentDisplayIndex, filteredDisplayedMessages.length - 1)

          return {
            messages: filteredMessages,
            displayedMessages: filteredDisplayedMessages,
            currentDisplayIndex: newIndex >= 0 ? newIndex : 0,
            lastRefreshTime: Date.now(),
          }
        })
      },

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

      getMessageStatsByProgram: (programId: string) => {
        const history = get().messageHistory
        const stats: Record<string, number> = {}

        history.forEach((entry) => {
          if (entry.programId === programId) {
            if (!stats[entry.platform]) {
              stats[entry.platform] = 0
            }
            stats[entry.platform]++
          }
        })

        return Object.entries(stats).map(([platform, count]) => ({
          platform: platform as PlatformType,
          count,
        }))
      },
    }),
    {
      name: "whats-live-storage",
      partialize: (state) => ({
        displayConfig: state.displayConfig,
        savedLayouts: state.savedLayouts,
        programs: state.programs,
        connections: state.connections.filter((conn) => conn.platform !== "youtube"),
        messages: state.messages.filter((msg) => msg.platform !== "youtube"),
        displayedMessages: state.displayedMessages.filter((msg) => msg.platform !== "youtube"),
        messageHistory: state.messageHistory.filter((msg) => msg.platform !== "youtube"),
        lastRefreshTime: Date.now(),
      }),
    },
  ),
)

export const enableDebugMode = () => {
  useWhatsAppStore.setState({ debugMode: true })
  console.log("[DEBUG] Modo de depuração ativado")
}

export const disableDebugMode = () => {
  useWhatsAppStore.setState({ debugMode: false })
  console.log("[DEBUG] Modo de depuração desativado")
}

export const clearLocalStorage = () => {
  localStorage.removeItem("whats-live-storage")
  console.log("Armazenamento local limpo. Recarregue a página para reiniciar o aplicativo.")
}

export const purgeLocalStorageAndReload = () => {
  localStorage.removeItem("whats-live-storage")
  console.log("Armazenamento local limpo. Recarregando a página...")
  window.location.reload()
}
