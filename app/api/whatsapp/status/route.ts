import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const { whatsappClientManager } = await import('@/lib/whatsapp-client');

      const sendEvent = (data: any) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      const onQR = (qrCode: string) => {
        sendEvent({ type: 'qr', qrCode });
      };

      const onReady = (data: any) => {
        sendEvent({ type: 'ready', ...data });
      };

      const onAuthenticated = (data: any) => {
        sendEvent({ type: 'authenticated', ...data });
      };

      const onAuthFailure = (data: any) => {
        sendEvent({ type: 'auth_failure', ...data });
      };

      const onDisconnected = (data: any) => {
        sendEvent({ type: 'disconnected', ...data });
      };

      whatsappClientManager.on('qr', onQR);
      whatsappClientManager.on('ready', onReady);
      whatsappClientManager.on('authenticated', onAuthenticated);
      whatsappClientManager.on('auth_failure', onAuthFailure);
      whatsappClientManager.on('disconnected', onDisconnected);

      const status = await whatsappClientManager.getStatus();
      sendEvent({ type: 'status', ...status });

      request.signal.addEventListener('abort', () => {
        whatsappClientManager.off('qr', onQR);
        whatsappClientManager.off('ready', onReady);
        whatsappClientManager.off('authenticated', onAuthenticated);
        whatsappClientManager.off('auth_failure', onAuthFailure);
        whatsappClientManager.off('disconnected', onDisconnected);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
