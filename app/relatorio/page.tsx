"use client"

import { useState, useEffect } from "react"
import { useWhatsAppStore, type PlatformType } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { MessageSquare, Printer, ArrowLeft, Filter, Phone, BookOpen, Youtube } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

export default function ReportPage() {
  const { messageHistory, messages, getMessageHistoryStats, programs } = useWhatsAppStore()
  const [mounted, setMounted] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [selectedProgram, setSelectedProgram] = useState<string>("")
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [reportType, setReportType] = useState<"displayed" | "all">("displayed")

  useEffect(() => {
    setMounted(true)
    // Definir a data de hoje como padrão
    setSelectedDate(new Date().toISOString().split("T")[0])
  }, [])

  if (!mounted) return null

  // Obter todas as datas únicas do histórico
  const uniqueDates = [
    ...new Set(
      messageHistory.map((entry) => {
        const date = new Date(entry.displayTimestamp)
        return date.toISOString().split("T")[0]
      }),
    ),
  ]
    .sort()
    .reverse()

  // Obter todos os programas únicos do histórico
  const uniquePrograms = [
    ...new Set([
      ...messageHistory.filter((entry) => entry.programName).map((entry) => entry.programName),
      ...programs.map((p) => p.name),
    ]),
  ].filter(Boolean) as string[]

  // Filtrar o histórico com base nos critérios selecionados
  const filteredHistory = messageHistory.filter((entry) => {
    const matchesDate =
      !selectedDate ||
      selectedDate === "all_dates" ||
      new Date(entry.displayTimestamp).toISOString().split("T")[0] === selectedDate
    const matchesProgram =
      !selectedProgram || selectedProgram === "all_programs" || entry.programName === selectedProgram
    const matchesPlatform = selectedPlatform === "all" || entry.platform === selectedPlatform
    const matchesSearch =
      !searchTerm ||
      entry.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.editedContent && entry.editedContent.toLowerCase().includes(searchTerm.toLowerCase()))

    return matchesDate && matchesProgram && matchesPlatform && matchesSearch
  })

  // Filtrar todas as mensagens com base nos critérios selecionados
  const filteredMessages = messages.filter((message) => {
    const matchesDate =
      !selectedDate ||
      selectedDate === "all_dates" ||
      new Date(message.timestamp).toISOString().split("T")[0] === selectedDate

    const programName = message.programId ? programs.find((p) => p.id === message.programId)?.name : undefined
    const matchesProgram = !selectedProgram || selectedProgram === "all_programs" || programName === selectedProgram

    const matchesPlatform = selectedPlatform === "all" || message.platform === selectedPlatform
    const matchesSearch =
      !searchTerm ||
      message.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (message.editedContent && message.editedContent.toLowerCase().includes(searchTerm.toLowerCase()))

    return matchesDate && matchesProgram && matchesPlatform && matchesSearch
  })

  // Obter estatísticas por plataforma
  const stats = getMessageHistoryStats()

  // Renderizar ícone de plataforma
  const renderPlatformIcon = (platform: PlatformType) => {
    switch (platform) {
      case "whatsapp":
        return <MessageSquare className="h-4 w-4 text-green-600" />
      case "youtube":
        return <Youtube className="h-4 w-4 text-red-600" />
      case "phone":
        return <Phone className="h-4 w-4 text-purple-600" />
      default:
        return null
    }
  }

  // Renderizar ícone de tipo de mensagem
  const renderMessageTypeIcon = (messageType) => {
    switch (messageType) {
      case "prayer":
        return <PrayingHandsIcon />
      case "testimony":
        return <BookOpen className="h-4 w-4 text-green-500" />
      default:
        return null
    }
  }

  // Obter nome da plataforma
  const getPlatformName = (platform: PlatformType) => {
    switch (platform) {
      case "whatsapp":
        return "WhatsApp"
      case "youtube":
        return "YouTube"
      case "phone":
        return "Ligação"
      default:
        return ""
    }
  }

  // Função para imprimir o relatório
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimir Relatório
        </Button>
      </div>

      <Card className="mb-6 print:shadow-none print:border-none">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Relatório de Mensagens</span>
            <span className="text-sm font-normal print:hidden">
              {reportType === "displayed"
                ? `Total: ${filteredHistory.length} mensagens exibidas`
                : `Total: ${filteredMessages.length} mensagens recebidas`}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="displayed" onValueChange={(value) => setReportType(value as "displayed" | "all")}>
            <TabsList className="mb-4 print:hidden">
              <TabsTrigger value="displayed">Mensagens Exibidas</TabsTrigger>
              <TabsTrigger value="all">Todas as Mensagens</TabsTrigger>
            </TabsList>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 print:hidden">
              <div>
                <Label htmlFor="date-filter">Data</Label>
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger id="date-filter">
                    <SelectValue placeholder="Selecione uma data" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_dates">Todas as datas</SelectItem>
                    {uniqueDates.map((date) => (
                      <SelectItem key={date} value={date}>
                        {format(new Date(date), "dd/MM/yyyy", { locale: ptBR })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="program-filter">Programa</Label>
                <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                  <SelectTrigger id="program-filter">
                    <SelectValue placeholder="Selecione um programa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_programs">Todos os programas</SelectItem>
                    {uniquePrograms.map((program) => (
                      <SelectItem key={program} value={program}>
                        {program}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="platform-filter">Plataforma</Label>
                <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                  <SelectTrigger id="platform-filter">
                    <SelectValue placeholder="Selecione uma plataforma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as plataformas</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="phone">Ligação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="search">Pesquisar</Label>
                <div className="relative">
                  <Input
                    id="search"
                    placeholder="Pesquisar mensagens..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Filter className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Estatísticas por plataforma */}
            <div className="mb-6 print:mb-4">
              <h3 className="text-lg font-medium mb-2">Estatísticas por Plataforma</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {stats.map((stat) => (
                  <div key={stat.platform} className="bg-muted/30 p-3 rounded-lg text-center">
                    <div className="flex justify-center mb-1">{renderPlatformIcon(stat.platform)}</div>
                    <div className="text-2xl font-bold">{stat.count}</div>
                    <div className="text-sm text-muted-foreground">{getPlatformName(stat.platform)}</div>
                  </div>
                ))}
                <div className="bg-muted/30 p-3 rounded-lg text-center">
                  <div className="flex justify-center mb-1">
                    <Filter className="h-4 w-4" />
                  </div>
                  <div className="text-2xl font-bold">{stats.reduce((acc, stat) => acc + stat.count, 0)}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
              </div>
            </div>

            <TabsContent value="displayed">
              {filteredHistory.length > 0 ? (
                <div className="space-y-4">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Data/Hora</th>
                        <th className="text-left py-2 px-2">Programa</th>
                        <th className="text-left py-2 px-2">Plataforma</th>
                        <th className="text-left py-2 px-2">Remetente</th>
                        <th className="text-left py-2 px-2">Tipo</th>
                        <th className="text-left py-2 px-2">Mensagem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHistory.map((entry) => (
                        <tr key={entry.id} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-2 align-top">
                            {format(new Date(entry.displayTimestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </td>
                          <td className="py-2 px-2 align-top">{entry.programName || "-"}</td>
                          <td className="py-2 px-2 align-top">
                            <div className="flex items-center">
                              {renderPlatformIcon(entry.platform)}
                              <span className="ml-1">{getPlatformName(entry.platform)}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2 align-top">{entry.sender}</td>
                          <td className="py-2 px-2 align-top">
                            {entry.messageType && entry.messageType !== "normal" && (
                              <div className="flex items-center">
                                {renderMessageTypeIcon(entry.messageType)}
                                <span className="ml-1">
                                  {entry.messageType === "prayer"
                                    ? "Oração"
                                    : entry.messageType === "testimony"
                                      ? "Testemunho"
                                      : ""}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-2 align-top">{entry.editedContent || entry.content}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma mensagem encontrada com os filtros selecionados.
                </div>
              )}
            </TabsContent>

            <TabsContent value="all">
              {filteredMessages.length > 0 ? (
                <div className="space-y-4">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Data/Hora</th>
                        <th className="text-left py-2 px-2">Programa</th>
                        <th className="text-left py-2 px-2">Plataforma</th>
                        <th className="text-left py-2 px-2">Remetente</th>
                        <th className="text-left py-2 px-2">Tipo</th>
                        <th className="text-left py-2 px-2">Mensagem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMessages.map((message) => {
                        const programName = message.programId
                          ? programs.find((p) => p.id === message.programId)?.name
                          : "-"

                        return (
                          <tr key={message.id} className="border-b hover:bg-muted/50">
                            <td className="py-2 px-2 align-top">
                              {format(new Date(message.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </td>
                            <td className="py-2 px-2 align-top">{programName}</td>
                            <td className="py-2 px-2 align-top">
                              <div className="flex items-center">
                                {renderPlatformIcon(message.platform)}
                                <span className="ml-1">{getPlatformName(message.platform)}</span>
                              </div>
                            </td>
                            <td className="py-2 px-2 align-top">{message.sender}</td>
                            <td className="py-2 px-2 align-top">
                              {message.messageType && message.messageType !== "normal" && (
                                <div className="flex items-center">
                                  {renderMessageTypeIcon(message.messageType)}
                                  <span className="ml-1">
                                    {message.messageType === "prayer"
                                      ? "Oração"
                                      : message.messageType === "testimony"
                                        ? "Testemunho"
                                        : ""}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-2 align-top">{message.editedContent || message.content}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma mensagem encontrada com os filtros selecionados.
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <style jsx global>{`
        @media print {
          body {
            font-size: 12px;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:border-none {
            border: none !important;
          }
          
          .print\\:mb-4 {
            margin-bottom: 1rem !important;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
          }
          
          th, td {
            border-bottom: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
        }
      `}</style>
    </div>
  )
}
