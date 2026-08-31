/**
 * WAHA (WhatsApp HTTP API) Client Wrapper - Multi-Tenant Isolated
 */
export function getWahaConfig() {
  const baseUrl = process.env.WAHA_API_URL || 'http://localhost:3008';
  const apiKey = process.env.WAHA_API_KEY || 'cardap_waha_api_key_2026';
  const defaultSession = process.env.WAHA_SESSION || 'default';
  return { baseUrl, apiKey, defaultSession };
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

export async function getWahaSessionStatus(sessionName: string): Promise<{
  name: string;
  status: 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED' | string;
  me?: { id: string; pushName?: string } | null;
  engine?: any;
}> {
  const { baseUrl, apiKey, defaultSession } = getWahaConfig();
  const targetSession = sessionName || defaultSession;

  try {
    const res = await fetch(`${baseUrl}/api/sessions/${targetSession}`, {
      headers: { 'X-Api-Key': apiKey }
    });

    if (res.status === 404) {
      // Criar e iniciar sessão automaticamente para o restaurante se não existir
      console.log(`[WAHA] Criando nova sessão isolada para o restaurante: '${targetSession}'`);
      await fetch(`${baseUrl}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
        body: JSON.stringify({ name: targetSession })
      });
      await fetch(`${baseUrl}/api/sessions/${targetSession}/start`, {
        method: 'POST',
        headers: { 'X-Api-Key': apiKey }
      });
      return { name: targetSession, status: 'STARTING', me: null };
    }

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }

    const sessionData = await res.json();
    let meData = sessionData.me || null;

    // Se ainda não temos dados do perfil 'me', consulta o endpoint dedicado /auth/me
    if (!meData || !meData.id) {
      try {
        const meRes = await fetch(`${baseUrl}/api/${targetSession}/auth/me`, {
          headers: { 'X-Api-Key': apiKey }
        });
        if (meRes.ok) {
          const meJson = await meRes.json();
          if (meJson && meJson.id) {
            meData = meJson;
          }
        }
      } catch {}
    }

    const rawStatus = (sessionData.status || '').toUpperCase();
    const isConnected =
      rawStatus === 'WORKING' ||
      rawStatus === 'PAIRED' ||
      rawStatus === 'CONNECTED' ||
      rawStatus === 'ONLINE' ||
      Boolean(meData?.id);

    return {
      ...sessionData,
      name: targetSession,
      status: isConnected ? 'WORKING' : sessionData.status,
      me: meData
    };
  } catch (err: any) {
    console.warn(`[WAHA] Erro ao obter status da sessão '${targetSession}': ${err.message}`);
    return { name: targetSession, status: 'STOPPED', me: null };
  }
}

export async function getWahaQrCode(sessionName: string): Promise<{ mimetype: string; data: string } | null> {
  const { baseUrl, apiKey, defaultSession } = getWahaConfig();
  const targetSession = sessionName || defaultSession;

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
    console.warn(`[WAHA] Erro ao obter QR Code para '${targetSession}': ${err.message}`);
    return null;
  }
}

export async function startWahaSession(sessionName: string): Promise<boolean> {
  const { baseUrl, apiKey, defaultSession } = getWahaConfig();
  const targetSession = sessionName || defaultSession;

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

export async function restartWahaSession(sessionName: string): Promise<boolean> {
  const { baseUrl, apiKey, defaultSession } = getWahaConfig();
  const targetSession = sessionName || defaultSession;

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

export async function logoutWahaSession(sessionName: string): Promise<boolean> {
  const { baseUrl, apiKey, defaultSession } = getWahaConfig();
  const targetSession = sessionName || defaultSession;

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
  sessionName: string
): Promise<boolean> {
  const { baseUrl, apiKey, defaultSession } = getWahaConfig();
  const targetSession = sessionName || defaultSession;

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
