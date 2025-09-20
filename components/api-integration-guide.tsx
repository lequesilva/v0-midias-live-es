"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, Info } from "lucide-react"

export default function ApiIntegrationGuide() {
  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Info className="mr-2 h-5 w-5 text-blue-500" />
          Guia de Integração com APIs Reais
        </CardTitle>
        <CardDescription>Como implementar a integração real com as APIs do YouTube e Facebook</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="youtube">
          <TabsList className="mb-4">
            <TabsTrigger value="youtube">YouTube API</TabsTrigger>
            <TabsTrigger value="facebook">Facebook API</TabsTrigger>
            <TabsTrigger value="implementation">Implementação</TabsTrigger>
          </TabsList>

          <TabsContent value="youtube">
            <div className="space-y-4">
              <p>Para uma integração real com o YouTube Live, você precisará usar a API do YouTube Data v3:</p>

              <ol className="list-decimal pl-5 space-y-2">
                <li>Crie um projeto no Google Cloud Console</li>
                <li>Ative a API do YouTube Data v3</li>
                <li>Obtenha uma chave de API ou configure OAuth 2.0</li>
                <li>
                  Use o endpoint <code>commentThreads</code> para buscar comentários
                </li>
              </ol>

              <div className="p-3 bg-blue-50 text-blue-700 rounded-md text-sm mt-4">
                <AlertCircle className="inline-block mr-2 h-4 w-4" />
                <span>
                  Para buscar apenas comentários novos, você deve armazenar o <code>pageToken</code> da última
                  requisição ou o ID do último comentário recebido.
                </span>
              </div>

              <div className="bg-gray-100 p-3 rounded-md text-sm mt-4 overflow-x-auto">
                <pre className="text-xs">
                  {`// Exemplo de código para buscar comentários do YouTube
async function getYouTubeComments(videoId, pageToken = null) {
  const params = {
    part: 'snippet',
    videoId: videoId,
    maxResults: 100,
    key: 'YOUR_API_KEY'
  };
  
  if (pageToken) {
    params.pageToken = pageToken;
  }
  
  const response = await fetch(
    \`https://www.googleapis.com/youtube/v3/commentThreads?\${new URLSearchParams(params)}\`
  );
  
  const data = await response.json();
  return {
    comments: data.items,
    nextPageToken: data.nextPageToken
  };
}`}
                </pre>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="facebook">
            <div className="space-y-4">
              <p>Para uma integração real com o Facebook, você precisará usar a API Graph do Facebook:</p>

              <ol className="list-decimal pl-5 space-y-2">
                <li>Crie um aplicativo no Facebook Developers</li>
                <li>Configure as permissões necessárias (pages_read_engagement)</li>
                <li>Obtenha um token de acesso de longa duração</li>
                <li>
                  Use o endpoint <code>/{"pageId"}/comments</code> para buscar comentários
                </li>
              </ol>

              <div className="p-3 bg-blue-50 text-blue-700 rounded-md text-sm mt-4">
                <AlertCircle className="inline-block mr-2 h-4 w-4" />
                <span>
                  Para buscar apenas comentários novos, você pode usar o parâmetro <code>since</code> com um timestamp
                  ou armazenar o ID do último comentário recebido.
                </span>
              </div>

              <div className="bg-gray-100 p-3 rounded-md text-sm mt-4 overflow-x-auto">
                <pre className="text-xs">
                  {`// Exemplo de código para buscar comentários do Facebook
async function getFacebookComments(postId, accessToken, since = null) {
  const params = {
    access_token: accessToken,
    fields: 'message,created_time,from',
    order: 'reverse_chronological',
    limit: 100
  };
  
  if (since) {
    params.since = since;
  }
  
  const response = await fetch(
    \`https://graph.facebook.com/v18.0/\${postId}/comments?\${new URLSearchParams(params)}\`
  );
  
  const data = await response.json();
  return data.data;
}`}
                </pre>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="implementation">
            <div className="space-y-4">
              <p>Para implementar uma solução robusta de atualização de comentários, siga estas práticas:</p>

              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  <strong>Polling Inteligente</strong>: Atualize em intervalos regulares, mas evite requisições
                  excessivas
                </li>
                <li>
                  <strong>Armazenamento de Estado</strong>: Guarde tokens de paginação ou IDs de comentários para buscar
                  apenas o que é novo
                </li>
                <li>
                  <strong>Cache Controlado</strong>: Use cabeçalhos HTTP para evitar problemas de cache
                </li>
                <li>
                  <strong>Tratamento de Erros</strong>: Implemente retry com backoff exponencial para lidar com falhas
                  de API
                </li>
                <li>
                  <strong>Webhooks</strong>: Quando possível, use webhooks em vez de polling para receber atualizações
                  em tempo real
                </li>
              </ol>

              <div className="bg-gray-100 p-3 rounded-md text-sm mt-4 overflow-x-auto">
                <pre className="text-xs">
                  {`// Exemplo de implementação de polling com Next.js
import { useState, useEffect } from 'react';

// Componente de item de comentário
function CommentItem({ comment }) {
  return (
    <div className="comment-item">
      <div className="comment-author">{comment.snippet.topLevelComment.snippet.authorDisplayName}</div>
      <div className="comment-text">{comment.snippet.topLevelComment.snippet.textDisplay}</div>
    </div>
  );
}

export default function CommentFeed({ videoId, apiKey }) {
  const [comments, setComments] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(null);

  // Função para buscar comentários
  const fetchComments = async () => {
    try {
      const result = await getYouTubeComments(videoId, nextPageToken, apiKey);
      
      if (result.comments.length > 0) {
        // Adicionar apenas comentários novos
        setComments(prev => {
          const newComments = result.comments.filter(
            comment => !prev.some(c => c.id === comment.id)
          );
          return [...newComments, ...prev];
        });
        
        // Atualizar token para próxima página
        setNextPageToken(result.nextPageToken);
      }
      
      setLastFetchTime(new Date());
    } catch (error) {
      console.error('Erro ao buscar comentários:', error);
    }
  };

  // Configurar polling
  useEffect(() => {
    // Buscar comentários iniciais
    fetchComments();
    
    // Configurar intervalo para atualizações
    const interval = setInterval(fetchComments, 30000); // 30 segundos
    
    return () => clearInterval(interval);
  }, [videoId]);

  return (
    <div>
      <div className="comments-feed">
        {comments.map(comment => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>
      {lastFetchTime && (
        <div className="text-xs text-gray-500">
          Última atualização: {lastFetchTime.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}`}
                </pre>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
