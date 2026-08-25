import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '@cardap/database';
import { randomBytes } from 'node:crypto';

// GET: Lista todos os terminais/agentes de impressão vinculados ao restaurante
export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  }

  let restaurantId = locals.user.restaurantId || url.searchParams.get('restaurantId');

  // Se for SuperAdmin sem restaurantId fixo, busca o primeiro restaurante cadastrado
  if (!restaurantId && locals.user.role === 'ADMIN') {
    const firstRest = await prisma.restaurant.findFirst();
    restaurantId = firstRest?.id;
  }

  try {
    const devices = await prisma.printerDevice.findMany({
      where: restaurantId ? { restaurantId } : {},
      orderBy: { createdAt: 'desc' }
    });

    return json({
      success: true,
      devices: devices.map(d => ({
        id: d.id,
        name: d.name,
        token: d.token,
        allowedSectors: d.allowedSectors,
        status: d.status,
        ipAddress: d.ipAddress,
        lastPingAt: d.lastPingAt,
        printersConfig: d.printersConfig,
        createdAt: d.createdAt
      }))
    });
  } catch (err: any) {
    console.error('[API Printers] Erro ao listar dispositivos (verifique se a tabela printer_devices foi criada):', err);
    // Retorna lista vazia graciosa se a tabela ainda estiver sendo criada
    return json({ success: true, devices: [], warning: 'Tabela printer_devices não encontrada ou vazia.' });
  }
};

// POST: Gera um novo Token de Pareamento para uma máquina/terminal do restaurante
export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    let restaurantId = locals.user.restaurantId || body.restaurantId;

    // Se for SuperAdmin sem restaurantId no token, busca o primeiro restaurante
    if (!restaurantId && locals.user.role === 'ADMIN') {
      const firstRest = await prisma.restaurant.findFirst();
      restaurantId = firstRest?.id;
    }

    if (!restaurantId) {
      return json({ success: false, error: 'Nenhum restaurante encontrado para vincular o terminal.' }, { status: 400 });
    }

    const name = body.name?.trim() || 'Terminal Caixa / Cozinha';
    const allowedSectors = Array.isArray(body.allowedSectors) && body.allowedSectors.length > 0
      ? body.allowedSectors
      : ['TODOS'];

    // Gera um token seguro de pareamento exclusivo
    const randomHex = randomBytes(16).toString('hex');
    const token = `cardap_prt_${restaurantId.substring(0, 8)}_${randomHex}`;

    const device = await prisma.printerDevice.create({
      data: {
        restaurantId,
        name,
        token,
        allowedSectors,
        status: 'OFFLINE',
        printersConfig: body.printersConfig || {}
      }
    });

    return json({
      success: true,
      message: 'Token de pareamento gerado com sucesso!',
      device: {
        id: device.id,
        name: device.name,
        token: device.token,
        allowedSectors: device.allowedSectors,
        status: device.status,
        createdAt: device.createdAt
      }
    });
  } catch (err: any) {
    console.error('[API Printers] Erro ao criar dispositivo de impressão:', err);
    return json({
      success: false,
      error: `Erro ao gerar pareamento: ${err.message}. Certifique-se de ter rodado "npx prisma db push" no servidor.`
    }, { status: 500 });
  }
};

// DELETE: Remove um dispositivo pareado
export const DELETE: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  }

  const id = url.searchParams.get('id');
  if (!id) {
    return json({ success: false, error: 'ID do dispositivo obrigatório.' }, { status: 400 });
  }

  const restaurantId = locals.user.restaurantId;

  try {
    await prisma.printerDevice.deleteMany({
      where: {
        id,
        ...(restaurantId ? { restaurantId } : {})
      }
    });

    return json({ success: true, message: 'Dispositivo desvinculado com sucesso.' });
  } catch (err: any) {
    console.error('[API Printers] Erro ao excluir dispositivo:', err);
    return json({ success: false, error: 'Erro ao desvincular dispositivo.' }, { status: 500 });
  }
};
