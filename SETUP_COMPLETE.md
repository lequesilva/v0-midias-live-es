# WhatsApp Web - Configuração Completa ✓

## Status da Instalação

✅ Chromium instalado: `/root/.cache/puppeteer/chrome/linux-131.0.6778.204`
✅ Dependências do sistema instaladas
✅ Puppeteer configurado como dependência de produção
✅ Build concluído com sucesso

## Como Usar

### 1. Iniciar o Servidor de Desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em: http://localhost:3000

### 2. Conectar WhatsApp

1. Acesse a página principal
2. Clique em "Conectar WhatsApp"
3. Aguarde o QR Code ser gerado (pode levar 10-30 segundos na primeira vez)
4. Escaneie o QR Code com seu WhatsApp no celular:
   - Abra o WhatsApp
   - Toque em Menu (três pontos) > Aparelhos conectados
   - Toque em "Conectar um aparelho"
   - Aponte para o QR Code na tela

### 3. Funcionamento

- **Autenticação persistente**: Após a primeira conexão, o sistema salva a sessão em `.wwebjs_auth`
- **Reconexão automática**: Na próxima vez que inicializar, conectará automaticamente sem precisar escanear o QR Code novamente
- **Status em tempo real**: O sistema mostra o status da conexão (conectando, aguardando scan, autenticado, conectado)

## Arquivos Importantes

### WhatsApp Client Manager
`/lib/whatsapp-client.ts` - Gerenciador principal do cliente WhatsApp

### APIs
- `/app/api/whatsapp/route.ts` - Endpoint principal (GET status, POST ações)
- `/app/api/whatsapp/status/route.ts` - Stream de eventos em tempo real (SSE)

### Componente UI
`/components/whatsapp-qr-manager.tsx` - Interface visual para QR Code

## Estrutura de Dados

### Status do Cliente
```typescript
{
  isReady: boolean,        // Cliente pronto para uso
  isAuthenticated: boolean, // Autenticado com sucesso
  qrCode: string | null,   // QR Code em base64 (data URL)
  hasClient: boolean,      // Cliente foi criado
  isInitializing: boolean, // Inicialização em progresso
  error: string | null     // Mensagem de erro (se houver)
}
```

### Eventos em Tempo Real (Server-Sent Events)
```typescript
// Tipos de eventos emitidos
{
  type: 'status' | 'qr' | 'authenticated' | 'ready' | 'auth_failure' | 'disconnected' | 'error',
  qrCode?: string,
  error?: string,
  reason?: string,
  authenticated?: boolean,
  ready?: boolean
}
```

## Ações Disponíveis

### POST /api/whatsapp
```json
// Inicializar conexão
{ "action": "initialize" }

// Desconectar
{ "action": "logout" }

// Destruir cliente
{ "action": "destroy" }

// Enviar mensagem
{
  "action": "sendMessage",
  "number": "5511999999999",
  "message": "Olá!"
}
```

## Solução de Problemas

### QR Code demora muito para aparecer
- É normal levar 10-30 segundos na primeira inicialização
- O Chromium precisa baixar e inicializar

### Erro "Browser not found"
✅ **RESOLVIDO** - Chromium instalado e configurado

### Desconexões frequentes
- Verifique a conexão de internet
- Não conecte o mesmo número em múltiplos lugares
- Mantenha o WhatsApp do celular ativo

### Limpar sessão e recomeçar
```bash
rm -rf .wwebjs_auth
```

## Logs de Debug

Os logs são exibidos no console do servidor:
- Inicialização do cliente
- Geração de QR Code
- Autenticação
- Conexão estabelecida
- Erros detalhados

## Próximos Passos

1. **Integrar com a UI existente**: Conectar o gerenciador de mensagens
2. **Receber mensagens**: Implementar handler para mensagens recebidas
3. **Enviar mensagens**: Interface para enviar mensagens
4. **Persistir mensagens**: Salvar no Supabase
5. **Notificações**: Alertas de novas mensagens

## Notas Importantes

⚠️ **Limitações do WhatsApp Web.js**:
- Não é a API oficial do WhatsApp
- Baseado no WhatsApp Web (pode ser detectado)
- Para uso comercial pesado, considere a API oficial do WhatsApp Business
- Requer Chromium/Puppeteer (não funciona em ambientes serverless como Vercel)

✅ **Ambientes Compatíveis**:
- Desenvolvimento local
- VPS (Digital Ocean, AWS EC2, Linode, etc)
- Railway
- Render
- Docker containers

❌ **Ambientes NÃO Compatíveis**:
- Vercel
- Netlify
- AWS Lambda (sem configuração especial)
- Google Cloud Functions (sem configuração especial)
