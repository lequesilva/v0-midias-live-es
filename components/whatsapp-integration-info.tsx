import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, Info } from "lucide-react"

export default function WhatsAppIntegrationInfo() {
  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Info className="mr-2 h-5 w-5 text-blue-500" />
          Informações sobre Integração com Plataformas
        </CardTitle>
        <CardDescription>Como implementar a integração real com o WhatsApp em sua aplicação</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="business">
          <TabsList className="mb-4">
            <TabsTrigger value="business">API WhatsApp Business</TabsTrigger>
            <TabsTrigger value="alternative">Alternativas</TabsTrigger>
          </TabsList>

          <TabsContent value="business">
            <div className="space-y-4">
              <p>
                Para uma integração oficial com o WhatsApp, você precisará usar a API do WhatsApp Business, que requer:
              </p>

              <ol className="list-decimal pl-5 space-y-2">
                <li>Uma conta comercial verificada no WhatsApp Business</li>
                <li>Aprovação da Meta (Facebook) para uso da API</li>
                <li>Integração com um provedor de serviços aprovado ou implementação direta</li>
                <li>Conformidade com as políticas de uso do WhatsApp</li>
              </ol>

              <div className="p-3 bg-blue-50 text-blue-700 rounded-md text-sm mt-4">
                <AlertCircle className="inline-block mr-2 h-4 w-4" />
                <span>
                  A API oficial do WhatsApp não permite a leitura de mensagens de contas pessoais por questões de
                  privacidade. Apenas contas comerciais podem ser integradas oficialmente.
                </span>
              </div>

              <p className="mt-4">
                Saiba mais na{" "}
                <a
                  href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  documentação oficial da API do WhatsApp
                </a>
                .
              </p>
            </div>
          </TabsContent>

          <TabsContent value="alternative">
            <div className="space-y-4">
              <p>Existem algumas alternativas não oficiais para integração com o WhatsApp:</p>

              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Bibliotecas não oficiais</strong>: Como whatsapp-web.js, que utiliza um navegador headless
                  para interagir com o WhatsApp Web
                </li>
                <li>
                  <strong>Serviços de terceiros</strong>: Existem serviços que oferecem APIs para WhatsApp, mas estes
                  podem violar os termos de serviço
                </li>
              </ul>

              <div className="p-3 bg-amber-50 text-amber-700 rounded-md text-sm mt-4">
                <AlertCircle className="inline-block mr-2 h-4 w-4" />
                <span>
                  Atenção: O uso de métodos não oficiais pode resultar no bloqueio da sua conta do WhatsApp e não é
                  recomendado para uso em produção.
                </span>
              </div>

              <p className="mt-4">
                Para uma solução robusta e em conformidade com os termos de serviço, recomendamos usar a API oficial do
                WhatsApp Business.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
