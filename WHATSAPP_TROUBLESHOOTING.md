# Guia de Solução de Problemas - WhatsApp Web Integration

## Problemas Comuns

### 1. Erro ao Inicializar Conexão

**Sintomas:**
- Mensagem "Erro ao inicializar conexão"
- O QR Code não é gerado
- Console mostra erros relacionados ao Puppeteer/Chromium

**Possíveis Causas e Soluções:**

#### A. Chromium não está instalado ou acessível
O `whatsapp-web.js` usa Puppeteer que precisa do Chromium para funcionar.

**Solução:**
```bash
# Instalar dependências necessárias no sistema
# Ubuntu/Debian:
sudo apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils
```

#### B. Ambiente de desenvolvimento não suporta Puppeteer
Alguns ambientes (como Vercel, Netlify) não suportam Puppeteer nativamente.

**Soluções:**
1. **Desenvolvimento Local**: Deve funcionar sem problemas
2. **Produção/Deploy**: Use plataformas que suportam Puppeteer:
   - Railway
   - Render
   - VPS (Digital Ocean, AWS EC2, etc)
   - Docker containers

#### C. Permissões insuficientes
O processo pode não ter permissões para executar o Chromium.

**Solução:**
Verifique se o diretório `.wwebjs_auth` tem permissões corretas:
```bash
chmod -R 755 .wwebjs_auth
```

### 2. QR Code gerado mas não conecta

**Possíveis Causas:**
- QR Code expirou (válido por ~20 segundos)
- Problemas de rede
- WhatsApp no celular com problemas

**Soluções:**
1. Clique em "Gerar novo QR Code"
2. Verifique a conexão de internet do celular
3. Reinicie o WhatsApp no celular
4. Tente limpar o cache: `rm -rf .wwebjs_auth`

### 3. Desconexões frequentes

**Possíveis Causas:**
- Timeout do servidor
- Memória insuficiente
- Múltiplas instâncias do cliente

**Soluções:**
1. Aumente o timeout do servidor
2. Monitore o uso de memória
3. Certifique-se de que apenas uma instância do cliente está rodando

## Verificações de Debug

### Logs do Servidor
Verifique os logs do servidor Node.js para mensagens de erro detalhadas:
```bash
# Durante desenvolvimento
npm run dev

# Verifique os logs no terminal
```

### Console do Navegador
Abra o Console do Navegador (F12) e procure por:
- Erros de rede (falhas nas chamadas à API)
- Erros do EventSource
- Mensagens de erro específicas

### Verificar Status da Conexão
Acesse diretamente a API:
```bash
# Verificar status
curl http://localhost:3000/api/whatsapp

# Tentar inicializar
curl -X POST http://localhost:3000/api/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"action":"initialize"}'
```

## Alternativas

Se `whatsapp-web.js` não funcionar no seu ambiente, considere:

1. **WhatsApp Business API Oficial**
   - Mais estável e confiável
   - Requer aprovação do Facebook
   - Custos associados

2. **Twilio WhatsApp API**
   - Integração mais simples
   - Suporte empresarial
   - Custos por mensagem

3. **Baileys**
   - Biblioteca Node.js alternativa
   - Não usa Puppeteer
   - Mais leve mas menos features

## Suporte

Para mais ajuda:
- Documentação oficial: https://github.com/pedroslopez/whatsapp-web.js
- Issues no GitHub: https://github.com/pedroslopez/whatsapp-web.js/issues
