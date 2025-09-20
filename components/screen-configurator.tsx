"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { useWhatsAppStore } from "@/lib/store"
import { Save, Upload, Trash2, Eye, UploadIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AlertCircle } from "lucide-react"
import Image from "next/image"

export default function ScreenConfigurator() {
  const { connections, displayConfig, updateDisplayConfig, savedLayouts, saveLayout, deleteLayout, loadLayout } =
    useWhatsAppStore()
  const [config, setConfig] = useState({
    ...displayConfig,
    cardOpacity: displayConfig.cardOpacity || 90,
  })
  const [layoutName, setLayoutName] = useState("")
  const { toast } = useToast()

  // Verificar se há alguma plataforma conectada
  const isAnyPlatformConnected = connections.some((conn) => conn.isConnected)

  // Atualizar configuração local quando a global mudar
  useEffect(() => {
    setConfig(displayConfig)
  }, [displayConfig])

  // Atualizar configuração
  const handleConfigChange = (key, value) => {
    setConfig({
      ...config,
      [key]: value,
    })
  }

  // Aplicar configuração
  const applyConfig = () => {
    updateDisplayConfig(config)
    toast({
      title: "Configuração aplicada",
      description: "As alterações foram aplicadas à tela de exibição.",
    })
  }

  // Salvar layout
  const handleSaveLayout = () => {
    if (!layoutName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para o layout antes de salvar.",
        variant: "destructive",
      })
      return
    }

    saveLayout(layoutName, config)
    setLayoutName("")
    toast({
      title: "Layout salvo",
      description: `O layout "${layoutName}" foi salvo com sucesso.`,
    })
  }

  // Carregar layout
  const handleLoadLayout = (name) => {
    loadLayout(name)
    toast({
      title: "Layout carregado",
      description: `O layout "${name}" foi carregado com sucesso.`,
    })
  }

  // Excluir layout
  const handleDeleteLayout = (name) => {
    deleteLayout(name)
    toast({
      title: "Layout excluído",
      description: `O layout "${name}" foi excluído.`,
    })
  }

  // Função para lidar com upload de imagem
  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        handleConfigChange("backgroundImage", event.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  if (!isAnyPlatformConnected) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center p-8">
            <h3 className="text-xl font-medium mb-4">Nenhuma plataforma conectada</h3>
            <p className="text-muted-foreground">
              Conecte pelo menos uma plataforma na aba "Conectar" para configurar sua tela de exibição.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Configurar Tela de Exibição</CardTitle>
        <CardDescription>Personalize a aparência da tela de exibição de mensagens</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="appearance">
          <TabsList className="mb-6">
            <TabsTrigger value="appearance">Aparência</TabsTrigger>
            <TabsTrigger value="content">Conteúdo</TabsTrigger>
            <TabsTrigger value="platform">Plataformas</TabsTrigger>
            <TabsTrigger value="layouts">Layouts Salvos</TabsTrigger>
          </TabsList>

          <TabsContent value="appearance">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Cor de Fundo</Label>
                    <div className="flex items-center gap-3 mt-1.5">
                      <Input
                        type="color"
                        value={config.backgroundColor || "#1e1e2e"}
                        onChange={(e) => handleConfigChange("backgroundColor", e.target.value)}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        type="text"
                        value={config.backgroundColor || "#1e1e2e"}
                        onChange={(e) => handleConfigChange("backgroundColor", e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Imagem de Fundo</Label>
                    <div className="grid grid-cols-1 gap-2 mt-1.5">
                      <div className="flex items-center gap-3">
                        <Input
                          type="text"
                          placeholder="URL da imagem de fundo"
                          value={config.backgroundImage || ""}
                          onChange={(e) => handleConfigChange("backgroundImage", e.target.value)}
                          className="flex-1"
                        />
                        <Button variant="outline" size="icon" onClick={() => handleConfigChange("backgroundImage", "")}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-3">
                        <Input
                          type="file"
                          id="background-image-upload"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <Button
                          variant="outline"
                          onClick={() => document.getElementById("background-image-upload").click()}
                          className="w-full"
                        >
                          <UploadIcon className="h-4 w-4 mr-2" />
                          Fazer Upload de Imagem
                        </Button>
                      </div>

                      {config.backgroundImage && (
                        <div className="mt-2 relative rounded-md overflow-hidden h-24">
                          <Image
                            src={config.backgroundImage || "/placeholder.svg"}
                            alt="Preview do plano de fundo"
                            fill
                            className="object-cover"
                            onError={() => {
                              toast({
                                title: "Erro ao carregar imagem",
                                description: "Verifique se a URL da imagem está correta.",
                                variant: "destructive",
                              })
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label>Cor do Cartão</Label>
                    <div className="flex items-center gap-3 mt-1.5">
                      <Input
                        type="color"
                        value={config.cardColor || "rgba(255, 255, 255, 0.9)"}
                        onChange={(e) => handleConfigChange("cardColor", e.target.value)}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        type="text"
                        value={config.cardColor || "rgba(255, 255, 255, 0.9)"}
                        onChange={(e) => handleConfigChange("cardColor", e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Transparência do Cartão</Label>
                    <div className="flex items-center gap-4 mt-1.5">
                      <Slider
                        value={[config.cardOpacity || 90]}
                        min={0}
                        max={100}
                        step={5}
                        onValueChange={(value) => {
                          const opacity = value[0]
                          handleConfigChange("cardOpacity", opacity)

                          // Extrair a cor base do cartão (sem a opacidade)
                          let baseColor
                          const currentColor = config.cardColor || "rgba(255, 255, 255, 0.9)"

                          if (currentColor.startsWith("rgba")) {
                            // Se já for rgba, extrair os componentes RGB
                            const matches = currentColor.match(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
                            if (matches && matches.length >= 4) {
                              const [, r, g, b] = matches
                              baseColor = `rgba(${r}, ${g}, ${b}`
                            } else {
                              baseColor = "rgba(255, 255, 255"
                            }
                          } else if (currentColor.startsWith("rgb")) {
                            // Se for rgb, converter para rgba
                            const matches = currentColor.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
                            if (matches && matches.length >= 4) {
                              const [, r, g, b] = matches
                              baseColor = `rgba(${r}, ${g}, ${b}`
                            } else {
                              baseColor = "rgba(255, 255, 255"
                            }
                          } else {
                            // Se for hex ou outro formato, usar branco como padrão
                            baseColor = "rgba(255, 255, 255"
                          }

                          // Atualizar a cor do cartão com a nova opacidade
                          handleConfigChange("cardColor", `${baseColor}, ${opacity / 100})`)
                        }}
                        className="flex-1"
                      />
                      <span className="w-12 text-center">{config.cardOpacity || 90}%</span>
                    </div>
                    <div className="mt-2 p-3 bg-gray-100 rounded-md">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Prévia:</span>
                        <div
                          className="w-16 h-8 rounded-md border"
                          style={{
                            backgroundColor:
                              config.cardColor || `rgba(255, 255, 255, ${(config.cardOpacity || 90) / 100})`,
                            backgroundImage:
                              "url(\"data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fillOpacity='0.05' fillRule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E\")",
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ajuste a transparência para controlar a visibilidade do fundo através do cartão de mensagem.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Cor do Nome</Label>
                    <div className="flex items-center gap-3 mt-1.5">
                      <Input
                        type="color"
                        value={config.nameColor || "#000000"}
                        onChange={(e) => handleConfigChange("nameColor", e.target.value)}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        type="text"
                        value={config.nameColor || "#000000"}
                        onChange={(e) => handleConfigChange("nameColor", e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Cor da Mensagem</Label>
                    <div className="flex items-center gap-3 mt-1.5">
                      <Input
                        type="color"
                        value={config.messageColor || "#000000"}
                        onChange={(e) => handleConfigChange("messageColor", e.target.value)}
                        className="w-12 h-10 p-1"
                      />
                      <Input
                        type="text"
                        value={config.messageColor || "#000000"}
                        onChange={(e) => handleConfigChange("messageColor", e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Fonte</Label>
                    <Select
                      value={config.fontFamily || "sans-serif"}
                      onValueChange={(value) => handleConfigChange("fontFamily", value)}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Selecione uma fonte" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sans-serif">Sans-serif</SelectItem>
                        <SelectItem value="serif">Serif</SelectItem>
                        <SelectItem value="monospace">Monospace</SelectItem>
                        <SelectItem value="cursive">Cursive</SelectItem>
                        <SelectItem value="fantasy">Fantasy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Tamanho da Fonte</Label>
                    <div className="flex items-center gap-4 mt-1.5">
                      <Slider
                        value={[config.fontSize || 24]}
                        min={16}
                        max={48}
                        step={1}
                        onValueChange={(value) => handleConfigChange("fontSize", value[0])}
                        className="flex-1"
                      />
                      <span className="w-12 text-center">{config.fontSize || 24}px</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="content">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-logo">Mostrar Logo</Label>
                    <Switch
                      id="show-logo"
                      checked={config.showLogo || false}
                      onCheckedChange={(checked) => handleConfigChange("showLogo", checked)}
                    />
                  </div>

                  {config.showLogo && (
                    <div>
                      <Label>URL do Logo</Label>
                      <Input
                        type="text"
                        placeholder="URL do logo"
                        value={config.logoUrl || ""}
                        onChange={(e) => handleConfigChange("logoUrl", e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-program-name">Mostrar Nome do Programa</Label>
                    <Switch
                      id="show-program-name"
                      checked={config.showProgramName || false}
                      onCheckedChange={(checked) => handleConfigChange("showProgramName", checked)}
                    />
                  </div>

                  {config.showProgramName && (
                    <div>
                      <Label>Nome do Programa</Label>
                      <Input
                        type="text"
                        placeholder="Nome do programa"
                        value={config.programName || ""}
                        onChange={(e) => handleConfigChange("programName", e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <Label>Intervalo de Atualização Automática (segundos)</Label>
                    <div className="flex items-center gap-4 mt-1.5">
                      <Slider
                        value={[config.autoRefreshInterval || 10]}
                        min={0}
                        max={60}
                        step={5}
                        onValueChange={(value) => handleConfigChange("autoRefreshInterval", value[0])}
                        className="flex-1"
                      />
                      <span className="w-16 text-center">
                        {config.autoRefreshInterval === 0 ? "Desativado" : `${config.autoRefreshInterval}s`}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Define o intervalo para buscar novas mensagens automaticamente. Defina como 0 para desativar.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="platform">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-platform-icon">Mostrar Ícone da Plataforma</Label>
                    <Switch
                      id="show-platform-icon"
                      checked={config.showPlatformIcon || false}
                      onCheckedChange={(checked) => handleConfigChange("showPlatformIcon", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-platform-name">Mostrar Nome da Plataforma</Label>
                    <Switch
                      id="show-platform-name"
                      checked={config.showPlatformName || false}
                      onCheckedChange={(checked) => handleConfigChange("showPlatformName", checked)}
                    />
                  </div>

                  <div className="p-3 bg-blue-50 text-blue-700 rounded-md text-sm mt-4">
                    <AlertCircle className="inline-block mr-2 h-4 w-4" />
                    <span>
                      Estas configurações controlam como as informações da plataforma (YouTube, Facebook, Instagram,
                      WhatsApp) são exibidas junto com a mensagem.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="layouts">
            <div className="space-y-6">
              <div>
                <Label>Salvar Layout Atual</Label>
                <div className="flex items-center gap-3 mt-1.5">
                  <Input
                    type="text"
                    placeholder="Nome do layout"
                    value={layoutName}
                    onChange={(e) => setLayoutName(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleSaveLayout}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Layouts Salvos</Label>
                {savedLayouts.length > 0 ? (
                  <div className="space-y-2">
                    {savedLayouts.map((layout) => (
                      <div key={layout.name} className="flex items-center justify-between p-3 bg-muted rounded-md">
                        <span className="font-medium">{layout.name}</span>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleLoadLayout(layout.name)}>
                            <Upload className="h-4 w-4 mr-1" />
                            Carregar
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteLayout(layout.name)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Nenhum layout salvo</div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-end">
          <Button onClick={applyConfig}>
            <Eye className="h-4 w-4 mr-2" />
            Aplicar Configuração
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
