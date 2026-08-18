/**
 * WAHA (WhatsApp HTTP API) Client Wrapper
 */
export function getWahaConfig() {
  const baseUrl = process.env.WAHA_API_URL || 'http://localhost:3008';
  const apiKey = process.env.WAHA_API_KEY || 'cardap_waha_api_key_2026';
  const session = process.env.WAHA_SESSION || 'default';
  return { baseUrl, apiKey, session };
}

export async function getWahaSessionStatus(): Promise<{
  name: string;
  status: 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED' | string;
  me?: { id: string; pushName?: string } | null;
  engine?: any;
}> {
  const { baseUrl, apiKey, session } = getWahaConfig();
  try {
    const res = await fetch(`${baseUrl}/api/sessions/${session}`, {
      headers: { 'X-Api-Key': apiKey }
    });

    if (res.status === 404) {
      // Sessão ainda não existe, tenta criar
      await fetch(`${baseUrl}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
        body: JSON.stringify({ name: session })
      });
      return { name: session, status: 'STOPPED', me: null };
    }

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.warn(`[WAHA] Erro ao obter status da sessão: ${err.message}`);
    return { name: session, status: 'STOPPED', me: null };
  }
}

export async function getWahaQrCode(): Promise<{ mimetype: string; data: string } | null> {
  const { baseUrl, apiKey, session } = getWahaConfig();
  try {
    const res = await fetch(`${baseUrl}/api/${session}/auth/qr`, {
      headers: {
        'X-Api-Key': apiKey,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (data && data.data) {
      return {
        mimetype: data.mimetype || 'image/png',
        data: data.data
      };
    }
    return null;
  } catch (err: any) {
    console.warn(`[WAHA] Erro ao obter QR Code: ${err.message}`);
    return null;
  }
}

export async function startWahaSession(): Promise<boolean> {
  const { baseUrl, apiKey, session } = getWahaConfig();
  try {
    const res = await fetch(`${baseUrl}/api/sessions/${session}/start`, {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey }
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}

export async function restartWahaSession(): Promise<boolean> {
  const { baseUrl, apiKey, session } = getWahaConfig();
  try {
    await fetch(`${baseUrl}/api/sessions/${session}/stop`, {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey }
    });
    const startRes = await fetch(`${baseUrl}/api/sessions/${session}/start`, {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey }
    });
    return startRes.ok;
  } catch (err) {
    return false;
  }
}

export async function logoutWahaSession(): Promise<boolean> {
  const { baseUrl, apiKey, session } = getWahaConfig();
  try {
    const res = await fetch(`${baseUrl}/api/sessions/${session}/logout`, {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey }
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}

export async function sendWahaTextMessage(chatId: string, text: string): Promise<boolean> {
  const { baseUrl, apiKey, session } = getWahaConfig();
  try {
    // Formatar número para padrão WhatsApp (ex: 5587996036770@c.us)
    const cleanNumber = chatId.replace(/\D/g, '');
    const formattedChatId = cleanNumber.includes('@') ? cleanNumber : `${cleanNumber}@c.us`;

    const res = await fetch(`${baseUrl}/api/sendText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey
      },
      body: JSON.stringify({
        session,
        chatId: formattedChatId,
        text
      })
    });

    return res.ok;
  } catch (err: any) {
    console.error(`[WAHA] Falha ao enviar mensagem para ${chatId}:`, err.message);
    return false;
  }
}
