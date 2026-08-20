import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '@cardap/database';

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  }

  const isSuperAdmin = locals.user.role === 'ADMIN' && !locals.user.restaurantId;
  const targetId = isSuperAdmin
    ? (url.searchParams.get('restaurantId') || undefined)
    : (locals.user.restaurantId || '__NONE__');

  try {
    const restaurant = targetId
      ? await prisma.restaurant.findUnique({ where: { id: targetId } })
      : await prisma.restaurant.findFirst();

    if (!restaurant) {
      return json({
        success: true,
        settings: {
          id: '',
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
          deliveryFee: 0,
          minOrderValue: 0,
          slaMinutesMin: 20,
          slaMinutesMax: 45,
          isOpen: true,
          allowDelivery: true,
          allowTakeout: true,
          allowDineIn: true,
          operatingHours: '',
          instagram: '',
          paymentGateway: 'MANUAL',
          pixKey: '',
          pixKeyType: 'CHAVE_ALEATORIA',
          pixReceiverName: '',
          pixReceiverCity: '',
          pixInstructions: '',
          wahaSessionName: 'default',
          highlights: []
        }
      });
    }

    return json({
      success: true,
      settings: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        category: restaurant.category || '',
        cnpj: restaurant.cnpj || '',
        phone: restaurant.phone || '',
        email: restaurant.email || '',
        addressStreet: restaurant.addressStreet || '',
        addressNumber: restaurant.addressNumber || '',
        addressNeighborhood: restaurant.addressNeighborhood || '',
        addressCity: restaurant.addressCity || '',
        addressState: restaurant.addressState || '',
        addressZipCode: restaurant.addressZipCode || '',
        logoUrl: restaurant.logoUrl || '',
        bannerUrl: restaurant.bannerUrl || '',
        primaryColor: restaurant.primaryColor || '#dc2626',
        secondaryColor: restaurant.secondaryColor || '#0f172a',
        accentColor: restaurant.accentColor || '#f59e0b',
        deliveryFee: Number(restaurant.deliveryFee || 0),
        minOrderValue: Number(restaurant.minOrderValue || 0),
        slaMinutesMin: restaurant.slaMinutesMin,
        slaMinutesMax: restaurant.slaMinutesMax,
        isOpen: restaurant.isOpen,
        allowDelivery: restaurant.allowDelivery,
        allowTakeout: restaurant.allowTakeout,
        allowDineIn: restaurant.allowDineIn,
        operatingHours: restaurant.operatingHours || '',
        instagram: restaurant.instagram || '',
        paymentGateway: restaurant.paymentGateway || 'MANUAL',
        mpPublicKey: restaurant.mpPublicKey || '',
        mpAccessToken: restaurant.mpAccessToken || '',
        mpSandbox: restaurant.mpSandbox || false,
        asaasApiKey: restaurant.asaasApiKey || '',
        asaasWalletId: restaurant.asaasWalletId || '',
        asaasSandbox: restaurant.asaasSandbox || false,
        efiClientId: restaurant.efiClientId || '',
        efiClientSecret: restaurant.efiClientSecret || '',
        efiPixKey: restaurant.efiPixKey || '',
        pagarmeApiKey: restaurant.pagarmeApiKey || '',
        pagarmeEncKey: restaurant.pagarmeEncKey || '',
        pixKey: restaurant.pixKey || '',
        pixKeyType: restaurant.pixKeyType || 'CHAVE_ALEATORIA',
        pixReceiverName: restaurant.pixReceiverName || '',
        pixReceiverCity: restaurant.pixReceiverCity || '',
        pixInstructions: restaurant.pixInstructions || '',
        wahaSessionName: restaurant.wahaSessionName || `rest_${restaurant.slug}`,
        plan: restaurant.plan,
        status: restaurant.status,
        highlights: restaurant.highlights || []
      }
    });
  } catch (err: any) {
    console.error('Erro ao buscar configurações:', err);
    return json({ success: false, error: err.message }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ success: false, error: 'Não autenticado.' }, { status: 401 });
  }

  try {
    const data = await request.json();

    const isSuperAdmin = locals.user.role === 'ADMIN' && !locals.user.restaurantId;
    const targetId = isSuperAdmin
      ? (data.id || (await prisma.restaurant.findFirst())?.id)
      : (locals.user.restaurantId || '__NONE__');

    if (!targetId || targetId === '__NONE__') {
      return json({ success: false, error: 'Nenhum estabelecimento selecionado para atualizar.' }, { status: 400 });
    }

    const restaurant = await prisma.restaurant.findUnique({ where: { id: targetId } });
    if (!restaurant) {
      return json({ success: false, error: 'Estabelecimento não encontrado.' }, { status: 404 });
    }

    const updated = await prisma.restaurant.update({
      where: { id: targetId },
      data: {
        name: data.name !== undefined ? data.name : restaurant.name,
        slug: data.slug !== undefined ? data.slug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-') : restaurant.slug,
        category: data.category !== undefined ? data.category : restaurant.category,
        cnpj: data.cnpj !== undefined ? (data.cnpj?.trim() ? data.cnpj.trim() : null) : restaurant.cnpj,
        phone: data.phone !== undefined ? data.phone : restaurant.phone,
        email: data.email !== undefined ? data.email : restaurant.email,
        addressStreet: data.addressStreet !== undefined ? data.addressStreet : restaurant.addressStreet,
        addressNumber: data.addressNumber !== undefined ? data.addressNumber : restaurant.addressNumber,
        addressNeighborhood: data.addressNeighborhood !== undefined ? data.addressNeighborhood : restaurant.addressNeighborhood,
        addressCity: data.addressCity !== undefined ? data.addressCity : restaurant.addressCity,
        addressState: data.addressState !== undefined ? data.addressState : restaurant.addressState,
        addressZipCode: data.addressZipCode !== undefined ? data.addressZipCode : restaurant.addressZipCode,
        logoUrl: data.logoUrl !== undefined ? data.logoUrl : restaurant.logoUrl,
        bannerUrl: data.bannerUrl !== undefined ? data.bannerUrl : restaurant.bannerUrl,
        primaryColor: data.primaryColor !== undefined ? data.primaryColor : restaurant.primaryColor,
        secondaryColor: data.secondaryColor !== undefined ? data.secondaryColor : restaurant.secondaryColor,
        accentColor: data.accentColor !== undefined ? data.accentColor : restaurant.accentColor,
        deliveryFee: data.deliveryFee !== undefined ? Number(data.deliveryFee) : restaurant.deliveryFee,
        minOrderValue: data.minOrderValue !== undefined ? Number(data.minOrderValue) : restaurant.minOrderValue,
        slaMinutesMin: data.slaMinutesMin !== undefined ? Number(data.slaMinutesMin) : restaurant.slaMinutesMin,
        slaMinutesMax: data.slaMinutesMax !== undefined ? Number(data.slaMinutesMax) : restaurant.slaMinutesMax,
        isOpen: data.isOpen !== undefined ? Boolean(data.isOpen) : restaurant.isOpen,
        allowDelivery: data.allowDelivery !== undefined ? Boolean(data.allowDelivery) : restaurant.allowDelivery,
        allowTakeout: data.allowTakeout !== undefined ? Boolean(data.allowTakeout) : restaurant.allowTakeout,
        allowDineIn: data.allowDineIn !== undefined ? Boolean(data.allowDineIn) : restaurant.allowDineIn,
        operatingHours: data.operatingHours !== undefined ? data.operatingHours : restaurant.operatingHours,
        instagram: data.instagram !== undefined ? data.instagram : restaurant.instagram,
        paymentGateway: data.paymentGateway !== undefined ? data.paymentGateway : restaurant.paymentGateway,
        mpPublicKey: data.mpPublicKey !== undefined ? data.mpPublicKey : restaurant.mpPublicKey,
        mpAccessToken: data.mpAccessToken !== undefined ? data.mpAccessToken : restaurant.mpAccessToken,
        mpSandbox: data.mpSandbox !== undefined ? Boolean(data.mpSandbox) : restaurant.mpSandbox,
        asaasApiKey: data.asaasApiKey !== undefined ? data.asaasApiKey : restaurant.asaasApiKey,
        asaasWalletId: data.asaasWalletId !== undefined ? data.asaasWalletId : restaurant.asaasWalletId,
        asaasSandbox: data.asaasSandbox !== undefined ? Boolean(data.asaasSandbox) : restaurant.asaasSandbox,
        efiClientId: data.efiClientId !== undefined ? data.efiClientId : restaurant.efiClientId,
        efiClientSecret: data.efiClientSecret !== undefined ? data.efiClientSecret : restaurant.efiClientSecret,
        efiPixKey: data.efiPixKey !== undefined ? data.efiPixKey : restaurant.efiPixKey,
        pagarmeApiKey: data.pagarmeApiKey !== undefined ? data.pagarmeApiKey : restaurant.pagarmeApiKey,
        pagarmeEncKey: data.pagarmeEncKey !== undefined ? data.pagarmeEncKey : restaurant.pagarmeEncKey,
        pixKey: data.pixKey !== undefined ? data.pixKey : restaurant.pixKey,
        pixKeyType: data.pixKeyType !== undefined ? data.pixKeyType : restaurant.pixKeyType,
        pixReceiverName: data.pixReceiverName !== undefined ? data.pixReceiverName : restaurant.pixReceiverName,
        pixReceiverCity: data.pixReceiverCity !== undefined ? data.pixReceiverCity : restaurant.pixReceiverCity,
        pixInstructions: data.pixInstructions !== undefined ? data.pixInstructions : restaurant.pixInstructions,
        wahaSessionName: data.wahaSessionName !== undefined ? data.wahaSessionName : restaurant.wahaSessionName,
        highlights: data.highlights !== undefined ? data.highlights : restaurant.highlights
      }
    });

    return json({
      success: true,
      restaurant: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        category: updated.category || '',
        cnpj: updated.cnpj || '',
        phone: updated.phone || '',
        email: updated.email || '',
        addressStreet: updated.addressStreet || '',
        addressNumber: updated.addressNumber || '',
        addressNeighborhood: updated.addressNeighborhood || '',
        addressCity: updated.addressCity || '',
        addressState: updated.addressState || '',
        addressZipCode: updated.addressZipCode || '',
        logoUrl: updated.logoUrl || '',
        bannerUrl: updated.bannerUrl || '',
        primaryColor: updated.primaryColor || '#dc2626',
        secondaryColor: updated.secondaryColor || '#0f172a',
        accentColor: updated.accentColor || '#f59e0b',
        deliveryFee: Number(updated.deliveryFee || 0),
        minOrderValue: Number(updated.minOrderValue || 0),
        slaMinutesMin: updated.slaMinutesMin,
        slaMinutesMax: updated.slaMinutesMax,
        isOpen: updated.isOpen,
        allowDelivery: updated.allowDelivery,
        allowTakeout: updated.allowTakeout,
        allowDineIn: updated.allowDineIn,
        operatingHours: updated.operatingHours || '',
        instagram: updated.instagram || '',
        paymentGateway: updated.paymentGateway || 'MANUAL',
        mpPublicKey: updated.mpPublicKey || '',
        mpAccessToken: updated.mpAccessToken || '',
        mpSandbox: updated.mpSandbox || false,
        asaasApiKey: updated.asaasApiKey || '',
        asaasWalletId: updated.asaasWalletId || '',
        asaasSandbox: updated.asaasSandbox || false,
        efiClientId: updated.efiClientId || '',
        efiClientSecret: updated.efiClientSecret || '',
        efiPixKey: updated.efiPixKey || '',
        pagarmeApiKey: updated.pagarmeApiKey || '',
        pagarmeEncKey: updated.pagarmeEncKey || '',
        pixKey: updated.pixKey || '',
        pixKeyType: updated.pixKeyType || 'CHAVE_ALEATORIA',
        pixReceiverName: updated.pixReceiverName || '',
        pixReceiverCity: updated.pixReceiverCity || '',
        pixInstructions: updated.pixInstructions || '',
        wahaSessionName: updated.wahaSessionName || `rest_${updated.slug}`,
        plan: updated.plan,
        status: updated.status,
        highlights: updated.highlights || []
      }
    });
  } catch (err: any) {
    console.error('Erro ao salvar configurações:', err);
    return json({ success: false, error: err.message }, { status: 500 });
  }
};
