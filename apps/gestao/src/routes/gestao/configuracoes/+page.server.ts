import type { PageServerLoad } from './$types';
import { prisma } from '@cardap/database';
import { getWahaSessionStatus, getWahaQrCode } from '$lib/server/wahaClient';

export const load: PageServerLoad = async ({ locals }) => {
  let restaurant: any = null;

  try {
    const dbRest = await prisma.restaurant.findFirst();
    if (dbRest) {
      restaurant = {
        id: dbRest.id,
        name: dbRest.name,
        slug: dbRest.slug,
        category: dbRest.category || 'Pastelaria Artesanal & Caldos de Cana',
        cnpj: dbRest.cnpj || '',
        phone: dbRest.phone || '',
        email: dbRest.email || '',
        addressStreet: dbRest.addressStreet || '',
        addressNumber: dbRest.addressNumber || '',
        addressNeighborhood: dbRest.addressNeighborhood || '',
        addressCity: dbRest.addressCity || '',
        addressState: dbRest.addressState || '',
        addressZipCode: dbRest.addressZipCode || '',
        logoUrl: dbRest.logoUrl || '',
        bannerUrl: dbRest.bannerUrl || '',
        primaryColor: dbRest.primaryColor || '#dc2626',
        secondaryColor: dbRest.secondaryColor || '#0f172a',
        accentColor: dbRest.accentColor || '#f59e0b',
        deliveryFee: Number(dbRest.deliveryFee || 6.00),
        minOrderValue: Number(dbRest.minOrderValue || 15.00),
        slaMinutesMin: dbRest.slaMinutesMin || 20,
        slaMinutesMax: dbRest.slaMinutesMax || 45,
        isOpen: dbRest.isOpen,
        allowDelivery: dbRest.allowDelivery,
        allowTakeout: dbRest.allowTakeout,
        allowDineIn: dbRest.allowDineIn,
        operatingHours: dbRest.operatingHours || 'Segunda a Domingo: 17:00 às 23:30',
        instagram: dbRest.instagram || '',
        paymentGateway: dbRest.paymentGateway || 'MERCADO_PAGO',
        mpPublicKey: dbRest.mpPublicKey || '',
        mpAccessToken: dbRest.mpAccessToken || '',
        mpSandbox: dbRest.mpSandbox || false,
        asaasApiKey: dbRest.asaasApiKey || '',
        asaasWalletId: dbRest.asaasWalletId || '',
        asaasSandbox: dbRest.asaasSandbox || false,
        efiClientId: dbRest.efiClientId || '',
        efiClientSecret: dbRest.efiClientSecret || '',
        efiPixKey: dbRest.efiPixKey || '',
        pagarmeApiKey: dbRest.pagarmeApiKey || '',
        pagarmeEncKey: dbRest.pagarmeEncKey || '',
        pixKey: dbRest.pixKey || '',
        pixKeyType: dbRest.pixKeyType || 'CNPJ',
        pixReceiverName: dbRest.pixReceiverName || '',
        pixReceiverCity: dbRest.pixReceiverCity || '',
        pixInstructions: dbRest.pixInstructions || '',
        wahaSessionName: dbRest.wahaSessionName || 'Imperiuspastel',
        plan: dbRest.plan || 'PRO',
        status: dbRest.status || 'ATIVO'
      };
    }
  } catch (err) {
    console.warn('Erro ao carregar restaurante no SSR:', err);
  }

  if (!restaurant) {
    restaurant = {
      name: 'Imperius do Pastel',
      slug: 'imperius-do-pastel',
      category: 'Pastelaria Artesanal & Caldos de Cana',
      cnpj: '52.894.103/0001-88',
      phone: '(87) 9 9603-6770',
      email: 'contato@imperiusdopastel.com.br',
      addressStreet: 'Av. Rui Barbosa',
      addressNumber: '450',
      addressNeighborhood: 'Centro',
      addressCity: 'Garanhuns',
      addressState: 'PE',
      addressZipCode: '55295-000',
      logoUrl: '',
      bannerUrl: '',
      primaryColor: '#dc2626',
      secondaryColor: '#0f172a',
      accentColor: '#f59e0b',
      deliveryFee: 6.00,
      minOrderValue: 15.00,
      slaMinutesMin: 20,
      slaMinutesMax: 45,
      isOpen: true,
      allowDelivery: true,
      allowTakeout: true,
      allowDineIn: true,
      operatingHours: 'Segunda a Domingo: 17:00 às 23:30',
      paymentGateway: 'MERCADO_PAGO',
      pixKey: '52.894.103/0001-88',
      pixKeyType: 'CNPJ',
      pixReceiverName: 'Imperius do Pastel LTDA',
      pixReceiverCity: 'Garanhuns',
      wahaSessionName: 'Imperiuspastel'
    };
  }

  let wahaStatus = 'SCAN_QR_CODE';
  let wahaQrBase64: string | null = null;
  let wahaSessionName = restaurant.wahaSessionName || 'default';
  let wahaMe: any = null;

  try {
    const session = await getWahaSessionStatus();
    wahaStatus = session.status;
    wahaSessionName = session.name;
    wahaMe = session.me || null;
    const qr = await getWahaQrCode(wahaSessionName);
    if (qr) {
      wahaQrBase64 = `data:${qr.mimetype};base64,${qr.data}`;
    }
  } catch {}

  let users: any[] = [];
  try {
    const dbUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    });
    users = dbUsers.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      roleLabel: u.role === 'ADMIN' ? 'Administrador' : (u.role === 'CAIXA' ? 'Operador de Caixa' : (u.role === 'COZINHA' ? 'Cozinha / KDS' : 'Atendente')),
      status: u.status
    }));
  } catch {}

  return {
    restaurant,
    waha: {
      status: wahaStatus,
      sessionName: wahaSessionName,
      qrBase64: wahaQrBase64,
      me: wahaMe
    },
    users
  };
};
