"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useWhatsAppStore, type PlatformType, type Message, type MessageType, type Program } from "@/lib/store"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Search,
  ImageIcon,
  Mic,
  Video,
  Check,
  Edit,
  Filter,
  Send,
  RefreshCw,
  Trash,
  PhoneIcon,
  BookOpen,
  Trash2,
} from "lucide-react"
import Image from "next/image"
import { MessageSquare, Youtube } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Importar o componente MessagePreview
import MessagePreview from "./message-preview"
import ProgramManager from "./program-manager"

// Ícone personalizado para mãos em oração
const PrayingHandsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="text-red-500"
  >
    <path d="M6 7.5a3.5 3.5 0 0 1 5 0l1 1.25a3.5 3.5 0 0 1 5 0V20a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-4" />
    <path d="M10.5 12.5a3.5 3.5 0 0 1 5 0v7.5" />
    <path d="M18 7.5a3.5 3.5 0 1 0-7 0l1 1.25a3.5 3.5 0 1 0 5 0" />
  </svg>
)

// Função para renderizar o ícone do tipo de mensagem
const renderMessageTypeIcon = (messageType: MessageType) => {
  switch (messageType) {
    case "prayer":
      return <PrayingHandsIcon />
    case "testimony":
      return <BookOpen className="h-4 w-4 text-green-500" />
    default:
      return null
  }
}

// Renderizar ícone de plataforma
const renderPlatformIcon = (platform: PlatformType) => {
  switch (platform) {
    case "whatsapp":
      return <MessageSquare size={16} className="text-green-600" />
    case "youtube":
      return <Youtube size={16} className="text-red-600" />
    case "phone":
      return <PhoneIcon size={16} className="text-purple-600" />
    default:
      return null
  }
}

// Renderizar nome da plataforma
const getPlatformName = (platform: PlatformType) => {
  switch (platform) {
    case "whatsapp":
      return "WhatsApp"
    case "youtube":
      return "YouTube"
    case "phone":
      return "Telefone"
    default:
      return ""
  }
}

// Renderizar cor de fundo para a plataforma
const getPlatformBgColor = (platform: PlatformType) => {
  switch (platform) {
    case "whatsapp":
      return "bg-green-50"
    case "youtube":
      return "bg-red-50"
    case "phone":
      return "bg-purple-50"
    default:
      return "bg-gray-50"
  }
}

export default function MessageManager() {
  const {
    connections,
    messages,
    selectedMessage,
    displayedMessages,
    setSelectedMessage,
    updateEditedContent,
    updateMessageType,
    updateMessageProgram,
    activePlatformFilter,
    setActivePlatformFilter,
    sendMessageToDisplay,
    removeMessageFromDisplay,
    lastRefreshTime,
    updateLastRefreshTime,
    simulateNewMessages,
    refreshMessages,
    displayConfig,
    addPhoneMessage,
    programs,
    addProgram,
    updateProgram,
    deleteProgram,
    clearMessages,
    removeConnection,
    addConnection,
    setMessages,
  } = useWhatsAppStore()
  const [searchTerm, setSearchTerm] = useState("")
  const [editedContent, setEditedContent] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  // Estado para o formulário de telefone
  const [phoneForm, setPhoneForm] = useState({
    sender: "",
    phoneNumber: "",
    city: "",
    state: "",
    content: "",
    messageType: "normal" as MessageType,
    programId: undefined as string | undefined,
  })

  // Estado para o formulário de programa
  const [programForm, setProgram] = useState({
    id: "",
    name: "",
    description: "",
  })
  const [isEditingProgram, setIsEditingProgram] = useState(false)

  // Verificar se há alguma plataforma conectada
  const isAnyPlatformConnected = connections.some((conn) => conn.isConnected)

  // Obter plataformas conectadas
  const connectedPlatforms = connections.filter((conn) => conn.isConnected).map((conn) => conn.platform)

  // Filtrar mensagens com base no termo de pesquisa e plataforma selecionada
  const filteredMessages = messages.filter((message) => {
    const matchesSearch =
      message.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPlatform = activePlatformFilter === "all" || message.platform === activePlatformFilter
    return matchesSearch && matchesPlatform
  })

  // Contar mensagens por plataforma
  const messageCounts = connectedPlatforms.reduce(
    (acc, platform) => {
      acc[platform] = messages.filter((msg) => msg.platform === platform).length
      return acc
    },
    {} as Record<PlatformType, number>,
  )

  // Selecionar uma mensagem
  const handleSelectMessage = (message: Message) => {
    setSelectedMessage(message)
    setEditedContent(message.editedContent || message.content)
    setIsEditing(false)
  }

  // Salvar conteúdo editado
  const saveEditedContent = () => {
    if (selectedMessage) {
      updateEditedContent(selectedMessage.id, editedContent)
      setIsEditing(false)
      toast({
        title: "Conteúdo salvo",
        description: "O conteúdo editado foi salvo com sucesso.",
      })
    }
  }

  // Atualizar tipo de mensagem
  const handleMessageTypeChange = (messageType: MessageType) => {
    if (selectedMessage) {
      updateMessageType(selectedMessage.id, messageType)
      toast({
        title: "Tipo de mensagem atualizado",
        description: `Mensagem marcada como ${messageType === "prayer" ? "Pedido de Oração" : messageType === "testimony" ? "Testemunho" : "Normal"}.`,
      })
    }
  }

  // Atualizar programa da mensagem
  const handleMessageProgramChange = (programId: string | undefined) => {
    if (selectedMessage) {
      updateMessageProgram(selectedMessage.id, programId)
      toast({
        title: "Programa atualizado",
        description: "O programa da mensagem foi atualizado com sucesso.",
      })
    }
  }

  // Enviar mensagem para exibição
  const handleSendToDisplay = (message: Message) => {
    sendMessageToDisplay(message)
    toast({
      title: "Mensagem enviada",
      description: "A mensagem foi enviada para a tela de exibição.",
    })
  }

  // Remover mensagem da exibição
  const handleRemoveFromDisplay = (messageId: string) => {
    removeMessageFromDisplay(messageId)
    toast({
      title: "Mensagem removida",
      description: "A mensagem foi removida da tela de exibição.",
    })
  }

  // Atualizar mensagens manualmente
  const handleRefresh = () => {
    setIsRefreshing(true)
    refreshMessages()
    setTimeout(() => {
      setIsRefreshing(false)
      toast({
        title: "Mensagens atualizadas",
        description: "Novas mensagens foram carregadas.",
      })
    }, 1000)
  }

  // Limpar mensagens de uma plataforma específica
  const clearPlatformMessages = (platform: PlatformType) => {
    // Obter IDs das mensagens em exibição
    const displayedIds = displayedMessages.map((msg) => msg.id)

    // Filtrar mensagens: manter as que estão em exibição e as de outras plataformas
    const messagesToKeep = messages.filter((msg) => displayedIds.includes(msg.id) || msg.platform !== platform)

    // Definir o novo array de mensagens
    setMessages(messagesToKeep)

    // Atualizar o estado para refletir as mudanças
    updateLastRefreshTime()

    toast({
      title: `Mensagens do ${getPlatformName(platform)} limpas`,
      description: `As mensagens do ${getPlatformName(platform)} foram removidas, exceto as que estão em exibição.`,
    })
  }

  // Adicionar uma nova função para limpar completamente todas as mensagens de uma plataforma
  const purgeAllPlatformMessages = (platform: PlatformType) => {
    // Filtrar mensagens: remover TODAS as mensagens da plataforma
    const filteredMessages = messages.filter((msg) => msg.platform !== platform)

    // Remover mensagens da plataforma que estão em exibição
    const updatedDisplayedMessages = displayedMessages.filter((msg) => msg.platform !== platform)

    // Atualizar o estado
    setMessages(filteredMessages)

    // Se houver mensagens em exibição que foram removidas, atualizá-las
    if (displayedMessages.length !== updatedDisplayedMessages.length) {
      updatedDisplayedMessages.forEach((msg) => {
        removeMessageFromDisplay(msg.id)
      })
    }

    updateLastRefreshTime()

    toast({
      title: `Todas as mensagens do ${getPlatformName(platform)} foram removidas`,
      description: `Todas as mensagens do ${getPlatformName(platform)} foram completamente removidas, incluindo as que estavam em exibição.`,
      variant: "destructive",
    })
  }

  // Lidar com mudanças no formulário de telefone
  const handlePhoneFormChange = (e) => {
    const { name, value } = e.target
    setPhoneForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Enviar mensagem de telefone
  const handlePhoneSubmit = (e) => {
    e.preventDefault()

    // Validar campos obrigatórios
    if (!phoneForm.sender || !phoneForm.phoneNumber || !phoneForm.content) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha pelo menos o nome, telefone e mensagem.",
        variant: "destructive",
      })
      return
    }

    // Adicionar mensagem
    addPhoneMessage(phoneForm)

    // Limpar formulário
    setPhoneForm({
      sender: "",
      phoneNumber: "",
      city: "",
      state: "",
      content: "",
      messageType: "normal",
      programId: undefined,
    })

    toast({
      title: "Mensagem adicionada",
      description: "A mensagem telefônica foi adicionada com sucesso.",
    })
  }

  // Lidar com mudanças no formulário de programa
  const handleProgramFormChange = (e) => {
    const { name, value } = e.target
    setProgram((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Salvar programa
  const handleSaveProgram = () => {
    if (!programForm.name) {
      toast({
        title: "Nome obrigatório",
        description: "O nome do programa é obrigatório.",
        variant: "destructive",
      })
      return
    }

    if (isEditingProgram) {
      updateProgram(programForm.id, {
        name: programForm.name,
        description: programForm.description,
      })
      toast({
        title: "Programa atualizado",
        description: "O programa foi atualizado com sucesso.",
      })
    } else {
      addProgram({
        name: programForm.name,
        description: programForm.description,
      })
      toast({
        title: "Programa adicionado",
        description: "O programa foi adicionado com sucesso.",
      })
    }

    // Limpar formulário
    setProgram({
      id: "",
      name: "",
      description: "",
    })
    setIsEditingProgram(false)
  }

  // Editar programa
  const handleEditProgram = (program: Program) => {
    setProgram({
      id: program.id,
      name: program.name,
      description: program.description || "",
    })
    setIsEditingProgram(true)
  }

  // Excluir programa
  const handleDeleteProgram = (id: string) => {
    deleteProgram(id)
    toast({
      title: "Programa excluído",
      description: "O programa foi excluído com sucesso.",
    })
  }

  // Configurar atualização automática
  useEffect(() => {
    if (displayConfig.autoRefreshInterval && displayConfig.autoRefreshInterval > 0) {
      const interval = setInterval(() => {
        simulateNewMessages()
        updateLastRefreshTime()
      }, displayConfig.autoRefreshInterval * 1000)

      return () => clearInterval(interval)
    }
  }, [displayConfig.autoRefreshInterval, simulateNewMessages, updateLastRefreshTime])

  // Renderizar ícone de mídia
  const renderMediaIcon = (mediaType) => {
    switch (mediaType) {
      case "image":
        return <ImageIcon size={16} />
      case "audio":
        return <Mic size={16} />
      case "video":
        return <Video size={16} />
      default:
        return null
    }
  }

  // Função para verificar se uma mensagem está em exibição
  const isMessageDisplayed = (messageId: string) => {
    return displayedMessages.some((msg) => msg.id === messageId)
  }

  if (!isAnyPlatformConnected && activePlatformFilter !== "phone") {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center p-8">
            <h3 className="text-xl font-medium mb-4">Nenhuma plataforma conectada</h3>
            <p className="text-muted-foreground">
              Conecte pelo menos uma plataforma na aba "Conectar" para visualizar e gerenciar mensagens, ou selecione
              "Telefone" para registrar ligações.
            </p>
            <Button className="mt-4" variant="outline" onClick={() => setActivePlatformFilter("phone")}>
              <PhoneIcon className="mr-2 h-4 w-4" />
              Registrar Ligações Telefônicas
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="incoming">
        <TabsList>
          <TabsTrigger value="incoming">Mensagens Recebidas</TabsTrigger>
          <TabsTrigger value="display">Mensagens em Exibição</TabsTrigger>
          <TabsTrigger value="phone">Ligações Telefônicas</TabsTrigger>
          <TabsTrigger value="programs">Programas</TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="w-full">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Mensagens Recebidas</CardTitle>
                    <CardDescription>Selecione uma mensagem para editar e exibir</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                      Atualizar
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash className="h-4 w-4 mr-2" />
                          Limpar Mensagens
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            // Obter IDs das mensagens em exibição
                            const displayedIds = displayedMessages.map((msg) => msg.id)

                            // Filtrar apenas as mensagens que estão em exibição
                            const messagesToKeep = messages.filter((msg) => displayedIds.includes(msg.id))

                            // Definir o novo array de mensagens
                            setMessages(messagesToKeep)

                            // Atualizar o estado para refletir as mudanças
                            updateLastRefreshTime()

                            toast({
                              title: "Mensagens limpas",
                              description: "Todas as mensagens foram removidas, exceto as que estão em exibição.",
                            })
                          }}
                        >
                          Limpar todas as mensagens
                        </DropdownMenuItem>

                        {connectedPlatforms.map((platform) => (
                          <>
                            <DropdownMenuItem
                              key={`clean-${platform}`}
                              onClick={() => clearPlatformMessages(platform)}
                              className="flex items-center"
                            >
                              {renderPlatformIcon(platform)}
                              <span className="ml-2">
                                Limpar mensagens do {getPlatformName(platform)}
                                {messageCounts[platform] > 0 && ` (${messageCounts[platform]})`}
                              </span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              key={`purge-${platform}`}
                              onClick={() => purgeAllPlatformMessages(platform)}
                              className="flex items-center text-red-500"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              <span>Remover TODAS as mensagens do {getPlatformName(platform)}</span>
                            </DropdownMenuItem>
                          </>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Filter className="h-4 w-4 mr-2" />
                          {activePlatformFilter === "all"
                            ? "Todas"
                            : getPlatformName(activePlatformFilter as PlatformType)}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setActivePlatformFilter("all")}>
                          Todas as plataformas
                        </DropdownMenuItem>
                        {connections.map((conn) => (
                          <DropdownMenuItem
                            key={conn.platform}
                            onClick={() => setActivePlatformFilter(conn.platform)}
                            className="flex items-center"
                          >
                            {renderPlatformIcon(conn.platform)}
                            <span className="ml-2">{getPlatformName(conn.platform)}</span>
                            {messageCounts[conn.platform] > 0 && (
                              <Badge variant="secondary" className="ml-2">
                                {messageCounts[conn.platform]}
                              </Badge>
                            )}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuItem
                          onClick={() => setActivePlatformFilter("phone")}
                          className="flex items-center"
                        >
                          <PhoneIcon className="h-4 w-4 text-purple-600" />
                          <span className="ml-2">Telefone</span>
                          {messageCounts["phone"] > 0 && (
                            <Badge variant="secondary" className="ml-2">
                              {messageCounts["phone"]}
                            </Badge>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Última atualização: {new Date(lastRefreshTime).toLocaleTimeString()}
                  {displayConfig.autoRefreshInterval > 0 && (
                    <span> (Atualização automática a cada {displayConfig.autoRefreshInterval} segundos)</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative mb-4">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Pesquisar mensagens..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Resumo de mensagens por plataforma */}
                {connectedPlatforms.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {connectedPlatforms.map((platform) => (
                      <div
                        key={platform}
                        className={`px-3 py-1 rounded-full text-xs flex items-center gap-1 cursor-pointer ${
                          activePlatformFilter === platform
                            ? "bg-primary text-primary-foreground"
                            : getPlatformBgColor(platform)
                        }`}
                        onClick={() => setActivePlatformFilter(platform)}
                      >
                        {renderPlatformIcon(platform)}
                        <span>{getPlatformName(platform)}</span>
                        <Badge variant={activePlatformFilter === platform ? "outline" : "secondary"} className="ml-1">
                          {messageCounts[platform] || 0}
                        </Badge>
                      </div>
                    ))}
                    <div
                      className={`px-3 py-1 rounded-full text-xs flex items-center gap-1 cursor-pointer ${
                        activePlatformFilter === "all" ? "bg-primary text-primary-foreground" : "bg-gray-100"
                      }`}
                      onClick={() => setActivePlatformFilter("all")}
                    >
                      <span>Todas</span>
                      <Badge variant={activePlatformFilter === "all" ? "outline" : "secondary"} className="ml-1">
                        {messages.length}
                      </Badge>
                    </div>
                  </div>
                )}

                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {filteredMessages.length > 0 ? (
                    filteredMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedMessage?.id === message.id
                            ? "bg-primary/10 border border-primary/30"
                            : `hover:bg-muted ${getPlatformBgColor(message.platform)}`
                        }`}
                        onClick={() => handleSelectMessage(message)}
                      >
                        <div className="flex items-center mb-1">
                          {message.senderAvatar && (
                            <div className="w-8 h-8 rounded-full overflow-hidden mr-2 bg-gray-200">
                              <Image
                                src={message.senderAvatar || "/placeholder.svg"}
                                alt={message.sender}
                                width={32}
                                height={32}
                                className="object-cover w-full h-full"
                                onError={(e) => {
                                  // Fallback para um avatar padrão em caso de erro
                                  e.currentTarget.src = "/placeholder.svg?height=32&width=32"
                                }}
                              />
                            </div>
                          )}
                          <span className="font-medium">{message.sender}</span>
                          <Badge variant="outline" className="ml-2 text-xs flex items-center gap-1">
                            {renderPlatformIcon(message.platform)}
                            <span>{getPlatformName(message.platform)}</span>
                          </Badge>
                          {message.messageType && message.messageType !== "normal" && (
                            <Badge variant="outline" className="ml-2 text-xs flex items-center gap-1">
                              {renderMessageTypeIcon(message.messageType)}
                              <span>
                                {message.messageType === "prayer"
                                  ? "Oração"
                                  : message.messageType === "testimony"
                                    ? "Testemunho"
                                    : ""}
                              </span>
                            </Badge>
                          )}
                          {message.programId && programs.find((p) => p.id === message.programId) && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {programs.find((p) => p.id === message.programId)?.name}
                            </Badge>
                          )}
                          {isMessageDisplayed(message.id) && (
                            <Badge variant="success" className="ml-2 text-xs">
                              Em exibição
                            </Badge>
                          )}
                          <span className="ml-auto text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(message.timestamp), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        <p className="text-sm line-clamp-2">
                          {message.mediaType && (
                            <span className="inline-flex items-center mr-1 text-muted-foreground">
                              {renderMediaIcon(message.mediaType)}
                            </span>
                          )}
                          {message.content}
                        </p>
                        {message.platform === "phone" && message.phoneData && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            <span>{message.phoneData.phoneNumber}</span>
                            {message.phoneData.city && (
                              <span>
                                {" "}
                                • {message.phoneData.city}
                                {message.phoneData.state ? `, ${message.phoneData.state}` : ""}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">Nenhuma mensagem encontrada</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="w-full">
              <CardHeader>
                <CardTitle>Editar Mensagem</CardTitle>
                <CardDescription>Edite o conteúdo da mensagem selecionada para exibição</CardDescription>
              </CardHeader>
              <CardContent>
                {selectedMessage ? (
                  <div>
                    <div className="flex items-center mb-4">
                      {selectedMessage.senderAvatar && (
                        <div className="w-10 h-10 rounded-full overflow-hidden mr-3 bg-gray-200">
                          <Image
                            src={selectedMessage.senderAvatar || "/placeholder.svg"}
                            alt={selectedMessage.sender}
                            width={40}
                            height={40}
                            className="object-cover w-full h-full"
                            onError={(e) => {
                              // Fallback para um avatar padrão em caso de erro
                              e.currentTarget.src = "/placeholder.svg?height=40&width=40"
                            }}
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h3 className="font-medium">{selectedMessage.sender}</h3>
                          <Badge variant="outline" className="ml-2 text-xs flex items-center gap-1">
                            {renderPlatformIcon(selectedMessage.platform)}
                            <span>{getPlatformName(selectedMessage.platform)}</span>
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(selectedMessage.timestamp), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium">Mensagem Original:</label>
                      </div>
                      <div className="p-3 bg-muted rounded-md text-sm">{selectedMessage.content}</div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <label htmlFor="edited-content" className="text-sm font-medium">
                          Conteúdo Editado:
                        </label>
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
                          {isEditing ? <Check size={16} /> : <Edit size={16} />}
                          {isEditing ? "Concluir" : "Editar"}
                        </Button>
                      </div>
                      {isEditing ? (
                        <Textarea
                          id="edited-content"
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          rows={5}
                          className="resize-none"
                        />
                      ) : (
                        <div className="p-3 bg-primary/10 rounded-md text-sm min-h-[100px]">
                          {editedContent || selectedMessage.content}
                        </div>
                      )}
                    </div>

                    <div className="mb-4">
                      <label className="text-sm font-medium block mb-2">Tipo de Mensagem:</label>
                      <RadioGroup
                        value={selectedMessage.messageType || "normal"}
                        onValueChange={(value) => handleMessageTypeChange(value as MessageType)}
                        className="flex space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="normal" id="normal" />
                          <Label htmlFor="normal">Normal</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="prayer" id="prayer" />
                          <Label htmlFor="prayer" className="flex items-center">
                            <PrayingHandsIcon />
                            <span className="ml-1">Pedido de Oração</span>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="testimony" id="testimony" />
                          <Label htmlFor="testimony" className="flex items-center">
                            <BookOpen className="h-4 w-4 text-green-500 mr-1" />
                            Testemunho
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="mb-4">
                      <label className="text-sm font-medium block mb-2">Programa:</label>
                      <Select
                        value={selectedMessage.programId || ""}
                        onValueChange={(value) => handleMessageProgramChange(value || undefined)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um programa" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum programa</SelectItem>
                          {programs.map((program) => (
                            <SelectItem key={program.id} value={program.id}>
                              {program.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedMessage.mediaType && selectedMessage.mediaUrl && (
                      <div className="mb-4">
                        <label className="text-sm font-medium block mb-2">Mídia Anexada:</label>
                        {selectedMessage.mediaType === "image" && (
                          <Image
                            src={selectedMessage.mediaUrl || "/placeholder.svg"}
                            alt="Imagem anexada"
                            width={300}
                            height={200}
                            className="rounded-md"
                          />
                        )}
                        {selectedMessage.mediaType === "video" && (
                          <video src={selectedMessage.mediaUrl} controls className="w-full rounded-md" />
                        )}
                        {selectedMessage.mediaType === "audio" && (
                          <audio src={selectedMessage.mediaUrl} controls className="w-full" />
                        )}
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={saveEditedContent} disabled={!isEditing}>
                        <Check className="h-4 w-4 mr-2" />
                        Salvar Edição
                      </Button>
                      <Button onClick={() => handleSendToDisplay(selectedMessage)} disabled={isEditing}>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar para Exibição
                      </Button>
                    </div>

                    {/* Adicionar a pré-visualização da mensagem */}
                    <div className="mt-4 border-t pt-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium">Pré-visualização:</label>
                      </div>
                      <MessagePreview message={selectedMessage} />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">Selecione uma mensagem para editar</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="display" className="pt-4">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Mensagens em Exibição</CardTitle>
              <CardDescription>Gerencie as mensagens que estão sendo exibidas na tela de exibição</CardDescription>
            </CardHeader>
            <CardContent>
              {displayedMessages.length > 0 ? (
                <div className="space-y-4">
                  {displayedMessages.map((message) => (
                    <div key={message.id} className={`p-4 rounded-lg border ${getPlatformBgColor(message.platform)}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          {message.senderAvatar && (
                            <Image
                              src={message.senderAvatar || "/placeholder.svg"}
                              alt={message.sender}
                              width={32}
                              height={32}
                              className="rounded-full mr-2"
                            />
                          )}
                          <span className="font-medium">{message.sender}</span>
                          <Badge variant="outline" className="ml-2 text-xs flex items-center gap-1">
                            {renderPlatformIcon(message.platform)}
                            <span>{getPlatformName(message.platform)}</span>
                          </Badge>
                          {message.messageType && message.messageType !== "normal" && (
                            <Badge variant="outline" className="ml-2 text-xs flex items-center gap-1">
                              {renderMessageTypeIcon(message.messageType)}
                              <span>
                                {message.messageType === "prayer"
                                  ? "Oração"
                                  : message.messageType === "testimony"
                                    ? "Testemunho"
                                    : ""}
                              </span>
                            </Badge>
                          )}
                          {message.programId && programs.find((p) => p.id === message.programId) && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {programs.find((p) => p.id === message.programId)?.name}
                            </Badge>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveFromDisplay(message.id)}>
                          <Trash className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      <p className="text-sm">{message.editedContent || message.content}</p>
                      {message.mediaType && message.mediaUrl && (
                        <div className="mt-2">
                          {message.mediaType === "image" && (
                            <Image
                              src={message.mediaUrl || "/placeholder.svg"}
                              alt="Imagem anexada"
                              width={200}
                              height={150}
                              className="rounded-md"
                            />
                          )}
                          {message.mediaType === "video" && (
                            <video src={message.mediaUrl} controls className="w-full max-w-xs rounded-md" />
                          )}
                          {message.mediaType === "audio" && (
                            <audio src={message.mediaUrl} controls className="w-full max-w-xs" />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma mensagem em exibição. Selecione mensagens da aba "Mensagens Recebidas" e clique em "Enviar
                  para Exibição".
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="phone" className="pt-4">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Registrar Ligação Telefônica</CardTitle>
              <CardDescription>Adicione mensagens recebidas por telefone</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sender">
                      Nome da Pessoa <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="sender"
                      name="sender"
                      value={phoneForm.sender}
                      onChange={handlePhoneFormChange}
                      placeholder="Nome completo"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">
                      Número de Telefone <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      value={phoneForm.phoneNumber}
                      onChange={handlePhoneFormChange}
                      placeholder="(00) 00000-0000"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      name="city"
                      value={phoneForm.city}
                      onChange={handlePhoneFormChange}
                      placeholder="Cidade"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input
                      id="state"
                      name="state"
                      value={phoneForm.state}
                      onChange={handlePhoneFormChange}
                      placeholder="Estado"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">
                    Mensagem <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="content"
                    name="content"
                    value={phoneForm.content}
                    onChange={handlePhoneFormChange}
                    placeholder="Digite a mensagem recebida por telefone"
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Mensagem</Label>
                  <RadioGroup
                    value={phoneForm.messageType}
                    onValueChange={(value) => setPhoneForm((prev) => ({ ...prev, messageType: value as MessageType }))}
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="normal" id="phone-normal" />
                      <Label htmlFor="phone-normal">Normal</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="prayer" id="phone-prayer" />
                      <Label htmlFor="phone-prayer" className="flex items-center">
                        <PrayingHandsIcon />
                        <span className="ml-1">Pedido de Oração</span>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="testimony" id="phone-testimony" />
                      <Label htmlFor="phone-testimony" className="flex items-center">
                        <BookOpen className="h-4 w-4 text-green-500 mr-1" />
                        Testemunho
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="programId">Programa</Label>
                  <Select
                    value={phoneForm.programId || ""}
                    onValueChange={(value) => setPhoneForm((prev) => ({ ...prev, programId: value || undefined }))}
                  >
                    <SelectTrigger id="programId">
                      <SelectValue placeholder="Selecione um programa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum programa</SelectItem>
                      {programs.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end">
                  <Button type="submit">
                    <PhoneIcon className="h-4 w-4 mr-2" />
                    Registrar Ligação
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="programs" className="pt-4">
          <ProgramManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}
