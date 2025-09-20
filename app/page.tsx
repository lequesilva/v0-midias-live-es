import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import MessageManager from "@/components/message-manager"
import ScreenConfigurator from "@/components/screen-configurator"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import PlatformSelector from "@/components/platform-selector"
import { FileText, ExternalLink, Tablet } from "lucide-react"

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">Mídias Live ES</h1>
        <p className="text-muted-foreground">
          Conecte suas plataformas, gerencie mensagens e configure sua tela de exibição
        </p>
      </header>

      <Tabs defaultValue="connect" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="connect">Conectar</TabsTrigger>
          <TabsTrigger value="messages">Gerenciar Mensagens</TabsTrigger>
          <TabsTrigger value="configure">Configurar Tela</TabsTrigger>
        </TabsList>

        <TabsContent value="connect" className="mt-6">
          <PlatformSelector />
        </TabsContent>

        <TabsContent value="messages" className="mt-6">
          <MessageManager />
        </TabsContent>

        <TabsContent value="configure" className="mt-6">
          <ScreenConfigurator />
        </TabsContent>
      </Tabs>

      <div className="mt-8 text-center space-x-4">
        <Button asChild size="lg" variant="outline">
          <Link href="/display" target="_blank">
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir Tela de Exibição
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/apresentador" target="_blank">
            <Tablet className="h-4 w-4 mr-2" />
            Tela do Apresentador
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/relatorio">
            <FileText className="h-4 w-4 mr-2" />
            Relatório de Mensagens
          </Link>
        </Button>
      </div>
    </main>
  )
}
