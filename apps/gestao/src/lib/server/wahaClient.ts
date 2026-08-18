/**
 * WAHA (WhatsApp HTTP API) Client Wrapper
 */
export function getWahaConfig() {
  const baseUrl = process.env.WAHA_API_URL || 'http://localhost:3008';
  const apiKey = process.env.WAHA_API_KEY || 'cardap_waha_api_key_2026';
  const session = process.env.WAHA_SESSION || 'default';
  return { baseUrl, apiKey, session };
}

export async function getAllWahaSessions(): Promise<any[]> {
  const { baseUrl, apiKey } = getWahaConfig();
  try {
    const res = await fetch(`${baseUrl}/api/sessions`, {
      headers: { 'X-Api-Key': apiKey }
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err: any) {
    console.warn(`[WAHA] Erro ao listar sessões: ${err.message}`);
  }
  return [];
}

export async function getActiveWahaSession(): Promise<{ name: string; status: string; me?: any } | null> {
  const sessions = await getAllWahaSessions();
  // 1. Procurar sessão em WORKING
  const working = sessions.find(s => s.status === 'WORKING');
  if (working) return working;

  // 2. Procurar sessão em SCAN_QR_CODE ou STARTING
  const starting = sessions.find(s => s.status === 'SCAN_QR_CODE' || s.status === 'STARTING');
  if (starting) return starting;

  // 3. Primeira sessão existente
  if (sessions.length > 0) return sessions[0];

  return null;
}

export async function getWahaSessionStatus(): Promise<{
  name: string;
  status: 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED' | string;
  me?: { id: string; pushName?: string } | null;
  engine?: any;
}> {
  const { baseUrl, apiKey, session } = getWahaConfig();
  try {
    const active = await getActiveWahaSession();
    if (active) return active;

    const res = await fetch(`${baseUrl}/api/sessions/${session}`, {
      headers: { 'X-Api-Key': apiKey }
    });

    if (res.status === 404) {
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

    return await res.json();
  } catch (err: any) {
    console.warn(`[WAHA] Erro ao obter status da sessão: ${err.message}`);
    return { name: session, status: 'STOPPED', me: null };
  }
}

export async function getWahaQrCode(sessionName?: string): Promise<{ mimetype: string; data: string } | null> {
  const { baseUrl, apiKey, session } = getWahaConfig();
  const targetSession = sessionName || (await getActiveWahaSession())?.name || session;

  try {
    const res = await fetch(`${baseUrl}/api/${targetSession}/auth/qr`, {
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

export async function startWahaSession(sessionName?: string): Promise<boolean> {
  const { baseUrl, apiKey, session } = getWahaConfig();
  const targetSession = sessionName || (await getActiveWahaSession())?.name || session;

  try {
    const res = await fetch(`${baseUrl}/api/sessions/${targetSession}/start`, {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey }
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}

export async function restartWahaSession(sessionName?: string): Promise<boolean> {
  const { baseUrl, apiKey, session } = getWahaConfig();
  const targetSession = sessionName || (await getActiveWahaSession())?.name || session;

  try {
    await fetch(`${baseUrl}/api/sessions/${targetSession}/stop`, {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey }
    });
    const startRes = await fetch(`${baseUrl}/api/sessions/${targetSession}/start`, {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey }
    });
    return startRes.ok;
  } catch (err) {
    return false;
  }
}

export async function logoutWahaSession(sessionName?: string): Promise<boolean> {
  const { baseUrl, apiKey, session } = getWahaConfig();
  const targetSession = sessionName || (await getActiveWahaSession())?.name || session;

  try {
    const res = await fetch(`${baseUrl}/api/sessions/${targetSession}/logout`, {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey }
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}

export async function sendWahaTextMessage(
  chatId: string,
  text: string,
  sessionName?: string
): Promise<boolean> {
  const { baseUrl, apiKey, session } = getWahaConfig();
  
  // Determinar a sessão de destino (da mensagem recebida, ou a sessão WORKING ativa)
  let targetSession = sessionName;
  if (!targetSession) {
    const active = await getActiveWahaSession();
    targetSession = active?.name || session || 'default';
  }

  // Preservar formatos de chat de WhatsApp (@c.us, @lid, @s.whatsapp.net)
  let formattedChatId = chatId.trim();
  if (!formattedChatId.includes('@')) {
    let cleanDigits = formattedChatId.replace(/\D/g, '');
    if (cleanDigits.length <= 11 && !cleanDigits.startsWith('55')) {
      cleanDigits = `55${cleanDigits}`;
    }
    formattedChatId = `${cleanDigits}@c.us`;
  }

  try {
    console.log(`[WAHA Client] Enviando mensagem via sessão '${targetSession}' para '${formattedChatId}'`);

    const res = await fetch(`${baseUrl}/api/sendText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey
      },
      body: JSON.stringify({
        session: targetSession,
        chatId: formattedChatId,
        text
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[WAHA Client] Falha ao enviar mensagem (Status ${res.status}): ${errText}`);
      return false;
    }

    const resData = await res.json();
    console.log(`[WAHA Client] Mensagem enviada com sucesso! ID: ${resData?.id || 'ok'}`);
    return true;
  } catch (err: any) {
    console.error(`[WAHA Client] Exceção ao enviar mensagem para ${formattedChatId}:`, err.message);
    return false;
  }
}
