"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useWhatsAppStore, type Program, type PlatformType } from "@/lib/store"
import { PlusCircle, PenLine, Trash2, Calendar, BarChart2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format, isAfter, isBefore, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { MessageSquare, Phone, Youtube } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"

export default function ProgramManager() {
  const { programs, addProgram, updateProgram, deleteProgram, getMessageStatsByProgram } = useWhatsAppStore()
  const [programForm, setProgram] = useState({
    id: "",
    name: "",
    description: "",
    startDate: "",
    endDate: "",
  })
  const [isEditingProgram, setIsEditingProgram] = useState(false)
  const { toast } = useToast()
  const [currentDate] = useState(new Date())

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

    // Validar datas
    if (programForm.startDate && programForm.endDate) {
      const startDate = new Date(programForm.startDate)
      const endDate = new Date(programForm.endDate)

      if (isAfter(startDate, endDate)) {
        toast({
          title: "Datas inválidas",
          description: "A data de início não pode ser posterior à data de término.",
          variant: "destructive",
        })
        return
      }
    }

    // Verificar se o programa está ativo com base nas datas
    let isActive = true
    if (programForm.startDate && programForm.endDate) {
      const startDate = new Date(programForm.startDate)
      const endDate = new Date(programForm.endDate)
      const now = new Date()

      isActive = !isBefore(now, startDate) && !isAfter(now, endDate)
    }

    if (isEditingProgram) {
      updateProgram(programForm.id, {
        name: programForm.name,
        description: programForm.description,
        startDate: programForm.startDate,
        endDate: programForm.endDate,
        isActive,
      })
      toast({
        title: "Programa atualizado",
        description: "O programa foi atualizado com sucesso.",
      })
    } else {
      addProgram({
        name: programForm.name,
        description: programForm.description,
        startDate: programForm.startDate,
        endDate: programForm.endDate,
        isActive,
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
      startDate: "",
      endDate: "",
    })
    setIsEditingProgram(false)
  }

  // Editar programa
  const handleEditProgram = (program: Program) => {
    setProgram({
      id: program.id,
      name: program.name,
      description: program.description || "",
      startDate: program.startDate || "",
      endDate: program.endDate || "",
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

  // Verificar status do programa
  const getProgramStatus = (program: Program) => {
    if (!program.startDate || !program.endDate) return "Sem período definido"

    const startDate = parseISO(program.startDate)
    const endDate = parseISO(program.endDate)
    const now = new Date()

    if (isBefore(now, startDate)) return "Aguardando início"
    if (isAfter(now, endDate)) return "Finalizado"
    return "Em andamento"
  }

  // Renderizar ícone de plataforma
  const renderPlatformIcon = (platform: PlatformType) => {
    switch (platform) {
      case "whatsapp":
        return <MessageSquare size={16} className="text-green-600" />
      case "youtube":
        return <Youtube size={16} className="text-red-600" />
      case "phone":
        return <Phone size={16} className="text-purple-600" />
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

  // Obter cor de fundo para a plataforma
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

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Gerenciar Programas</CardTitle>
            <CardDescription>Adicione, edite e exclua programas</CardDescription>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setProgram({ id: "", name: "", description: "", startDate: "", endDate: "" })
                  setIsEditingProgram(false)
                }}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Novo Programa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isEditingProgram ? "Editar Programa" : "Novo Programa"}</DialogTitle>
                <DialogDescription>
                  {isEditingProgram
                    ? "Edite as informações do programa selecionado."
                    : "Preencha as informações para adicionar um novo programa."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="program-name">
                    Nome do Programa <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="program-name"
                    name="name"
                    value={programForm.name}
                    onChange={handleProgramFormChange}
                    placeholder="Nome do programa"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="program-description">Descrição</Label>
                  <Textarea
                    id="program-description"
                    name="description"
                    value={programForm.description}
                    onChange={handleProgramFormChange}
                    placeholder="Descrição do programa"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="program-start-date">Data de Início</Label>
                    <Input
                      id="program-start-date"
                      name="startDate"
                      type="datetime-local"
                      value={programForm.startDate}
                      onChange={handleProgramFormChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="program-end-date">Data de Término</Label>
                    <Input
                      id="program-end-date"
                      name="endDate"
                      type="datetime-local"
                      value={programForm.endDate}
                      onChange={handleProgramFormChange}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSaveProgram}>{isEditingProgram ? "Atualizar" : "Adicionar"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {programs.length > 0 ? (
          <div className="space-y-4">
            {programs.map((program) => {
              const status = getProgramStatus(program)
              const isProgramFinished = status === "Finalizado"
              const stats = isProgramFinished ? getMessageStatsByProgram(program.id) : []
              const totalMessages = stats.reduce((acc, stat) => acc + stat.count, 0)

              return (
                <Card key={program.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-lg">{program.name}</h3>
                        {program.description && (
                          <p className="text-sm text-muted-foreground mt-1">{program.description}</p>
                        )}

                        <div className="flex flex-wrap gap-2 mt-2">
                          {program.startDate && program.endDate && (
                            <Badge variant="outline" className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              <span>
                                {format(new Date(program.startDate), "dd/MM/yyyy HH:mm", { locale: ptBR })} -{" "}
                                {format(new Date(program.endDate), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </span>
                            </Badge>
                          )}

                          <Badge
                            variant={
                              status === "Em andamento"
                                ? "success"
                                : status === "Finalizado"
                                  ? "destructive"
                                  : "outline"
                            }
                          >
                            {status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => handleEditProgram(program)}>
                              <PenLine className="h-4 w-4 text-blue-500" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Programa</DialogTitle>
                              <DialogDescription>Edite as informações do programa selecionado.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="edit-program-name">
                                  Nome do Programa <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  id="edit-program-name"
                                  name="name"
                                  value={programForm.name}
                                  onChange={handleProgramFormChange}
                                  placeholder="Nome do programa"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="edit-program-description">Descrição</Label>
                                <Textarea
                                  id="edit-program-description"
                                  name="description"
                                  value={programForm.description}
                                  onChange={handleProgramFormChange}
                                  placeholder="Descrição do programa"
                                  rows={3}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="edit-program-start-date">Data de Início</Label>
                                  <Input
                                    id="edit-program-start-date"
                                    name="startDate"
                                    type="datetime-local"
                                    value={programForm.startDate}
                                    onChange={handleProgramFormChange}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="edit-program-end-date">Data de Término</Label>
                                  <Input
                                    id="edit-program-end-date"
                                    name="endDate"
                                    type="datetime-local"
                                    value={programForm.endDate}
                                    onChange={handleProgramFormChange}
                                  />
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button onClick={handleSaveProgram}>Atualizar</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Programa</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o programa "{program.name}"? Esta ação não pode ser
                                desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteProgram(program.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        {isProgramFinished && stats.length > 0 && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm">
                                <BarChart2 className="h-4 w-4 mr-1" />
                                Estatísticas
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <div className="space-y-2">
                                <h4 className="font-medium">Estatísticas do Programa</h4>
                                <p className="text-sm text-muted-foreground">
                                  Total de mensagens: <span className="font-medium">{totalMessages}</span>
                                </p>
                                <div className="space-y-2 mt-2">
                                  {stats.map((stat) => (
                                    <div
                                      key={stat.platform}
                                      className={`p-2 rounded-md flex items-center justify-between ${getPlatformBgColor(stat.platform)}`}
                                    >
                                      <div className="flex items-center">
                                        {renderPlatformIcon(stat.platform)}
                                        <span className="ml-2">{getPlatformName(stat.platform)}</span>
                                      </div>
                                      <span className="font-medium">{stat.count}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </div>

                    {isProgramFinished && stats.length > 0 && (
                      <CardFooter className="px-0 pt-4 pb-0 mt-4 border-t">
                        <div className="w-full">
                          <h4 className="text-sm font-medium mb-2">Estatísticas de Mensagens</h4>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            {stats.map((stat) => (
                              <div
                                key={stat.platform}
                                className={`p-2 rounded-md text-center ${getPlatformBgColor(stat.platform)}`}
                              >
                                <div className="flex justify-center mb-1">{renderPlatformIcon(stat.platform)}</div>
                                <div className="text-lg font-bold">{stat.count}</div>
                                <div className="text-xs text-muted-foreground">{getPlatformName(stat.platform)}</div>
                              </div>
                            ))}
                            <div className="p-2 rounded-md text-center bg-gray-100">
                              <div className="flex justify-center mb-1">
                                <BarChart2 size={16} />
                              </div>
                              <div className="text-lg font-bold">{totalMessages}</div>
                              <div className="text-xs text-muted-foreground">Total</div>
                            </div>
                          </div>
                        </div>
                      </CardFooter>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum programa cadastrado. Clique em "Novo Programa" para adicionar.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
