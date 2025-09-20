"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useWhatsAppStore, type PlatformType } from "@/lib/store"
import ConnectWhatsApp from "./connect-whatsapp"
import ConnectYouTube from "./connect-youtube"
import ConnectFacebook from "./connect-facebook"
import ConnectInstagram from "./connect-instagram"
import WhatsAppIntegrationInfo from "./whatsapp-integration-info"
import ApiIntegrationGuide from "./api-integration-guide"
import { Badge } from "@/components/ui/badge"

export default function PlatformSelector() {
  const { connections } = useWhatsAppStore()
  const [activeTab, setActiveTab] = useState<string>("whatsapp")

  // Verificar se uma plataforma está conectada
  const isPlatformConnected = (platform: PlatformType) => {
    return connections.some((conn) => conn.platform === platform && conn.isConnected)
  }

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="whatsapp" className="relative">
            WhatsApp
            {isPlatformConnected("whatsapp") && (
              <Badge variant="success" className="absolute -top-2 -right-2 h-3 w-3 p-0 rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger value="youtube" className="relative">
            YouTube
            {isPlatformConnected("youtube") && (
              <Badge variant="success" className="absolute -top-2 -right-2 h-3 w-3 p-0 rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger value="facebook" className="relative">
            Facebook
            {isPlatformConnected("facebook") && (
              <Badge variant="success" className="absolute -top-2 -right-2 h-3 w-3 p-0 rounded-full" />
            )}
          </TabsTrigger>
          <TabsTrigger value="instagram" className="relative">
            Instagram
            {isPlatformConnected("instagram") && (
              <Badge variant="success" className="absolute -top-2 -right-2 h-3 w-3 p-0 rounded-full" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="mt-6">
          <ConnectWhatsApp />
          <WhatsAppIntegrationInfo />
        </TabsContent>

        <TabsContent value="youtube" className="mt-6">
          <ConnectYouTube />
          <ApiIntegrationGuide />
        </TabsContent>

        <TabsContent value="facebook" className="mt-6">
          <ConnectFacebook />
          <ApiIntegrationGuide />
        </TabsContent>

        <TabsContent value="instagram" className="mt-6">
          <ConnectInstagram />
          <ApiIntegrationGuide />
        </TabsContent>
      </Tabs>
    </div>
  )
}
