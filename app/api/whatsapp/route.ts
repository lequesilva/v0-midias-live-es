import { NextRequest, NextResponse } from 'next/server';
import { whatsappClientManager } from '@/lib/whatsapp-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const status = await whatsappClientManager.getStatus();
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get WhatsApp status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, ...data } = await request.json();

    switch (action) {
      case 'initialize':
        await whatsappClientManager.initialize();
        return NextResponse.json({ success: true, message: 'Initializing...' });

      case 'logout':
        await whatsappClientManager.logout();
        return NextResponse.json({ success: true, message: 'Logged out' });

      case 'destroy':
        await whatsappClientManager.destroy();
        return NextResponse.json({ success: true, message: 'Client destroyed' });

      case 'sendMessage':
        const { number, message } = data;
        if (!number || !message) {
          return NextResponse.json(
            { error: 'Number and message are required' },
            { status: 400 }
          );
        }
        const result = await whatsappClientManager.sendMessage(number, message);
        return NextResponse.json({ success: true, result });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}
