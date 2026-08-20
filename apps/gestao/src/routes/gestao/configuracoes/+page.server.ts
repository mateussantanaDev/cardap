import type { PageServerLoad } from './$types';
import { prisma } from '@cardap/database';
import { getWahaSessionStatus, getWahaQrCode } from '$lib/server/wahaClient';

export const load: PageServerLoad = async ({ locals }) => {
  let restaurant: any = null;

  const isSuperAdmin = locals.user?.role === 'ADMIN' && !locals.user?.restaurantId;
  const targetRestaurantId = locals.user?.restaurantId;

  try {
    const dbRest = await prisma.restaurant.findFirst({
      where: targetRestaurantId ? { id: targetRestaurantId } : undefined
    });

    if (dbRest) {
      restaurant = {
        id: dbRest.id,
        name: dbRest.name,
        slug: dbRest.slug,
        category: dbRest.category || '',
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
        deliveryFee: Number(dbRest.deliveryFee || 0),
        minOrderValue: Number(dbRest.minOrderValue || 0),
        slaMinutesMin: dbRest.slaMinutesMin || 20,
        slaMinutesMax: dbRest.slaMinutesMax || 45,
        isOpen: dbRest.isOpen,
        allowDelivery: dbRest.allowDelivery,
        allowTakeout: dbRest.allowTakeout,
        allowDineIn: dbRest.allowDineIn,
        operatingHours: dbRest.operatingHours || 'Segunda a Domingo: 17:00 às 23:30',
        instagram: dbRest.instagram || '',
        paymentGateway: dbRest.paymentGateway || 'MANUAL',
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
        pixKeyType: dbRest.pixKeyType || 'CHAVE_ALEATORIA',
        pixReceiverName: dbRest.pixReceiverName || '',
        pixReceiverCity: dbRest.pixReceiverCity || '',
        pixInstructions: dbRest.pixInstructions || '',
        wahaSessionName: dbRest.wahaSessionName || `rest_${dbRest.slug}`,
        plan: dbRest.plan || 'PRO_DELIVERY',
        status: dbRest.status || 'ATIVO',
        highlights: dbRest.highlights || []
      };
    }
  } catch (err) {
    console.warn('Erro ao carregar restaurante no SSR:', err);
  }

  if (!restaurant) {
    restaurant = {
      name: '',
      slug: '',
      category: '',
      cnpj: '',
      phone: '',
      email: '',
      addressStreet: '',
      addressNumber: '',
      addressNeighborhood: '',
      addressCity: '',
      addressState: '',
      addressZipCode: '',
      logoUrl: '',
      bannerUrl: '',
      primaryColor: '#dc2626',
      secondaryColor: '#0f172a',
      accentColor: '#f59e0b',
      deliveryFee: 0.00,
      minOrderValue: 0.00,
      slaMinutesMin: 20,
      slaMinutesMax: 45,
      isOpen: true,
      allowDelivery: true,
      allowTakeout: true,
      allowDineIn: true,
      operatingHours: 'Segunda a Domingo: 17:00 às 23:30',
      paymentGateway: 'MANUAL',
      pixKey: '',
      pixKeyType: 'CHAVE_ALEATORIA',
      pixReceiverName: '',
      pixReceiverCity: '',
      wahaSessionName: 'default'
    };
  }

  let wahaStatus = 'SCAN_QR_CODE';
  let wahaQrBase64: string | null = null;
  let wahaSessionName = restaurant.wahaSessionName || 'default';
  let wahaMe: any = null;

  try {
    const session = await getWahaSessionStatus(wahaSessionName);
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
      where: isSuperAdmin
        ? (targetRestaurantId ? { restaurantId: targetRestaurantId } : undefined)
        : {
            restaurantId: targetRestaurantId || '__NONE__',
            NOT: { restaurantId: null }
          },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
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
      status: u.isActive ? 'ATIVO' : 'SUSPENSO'
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
