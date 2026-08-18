import { json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '@cardap/database';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    let restaurant = await prisma.restaurant.findFirst();

    if (!restaurant) {
      restaurant = await prisma.restaurant.create({
        data: {
          name: 'Imperius do Pastel',
          slug: 'imperius-do-pastel',
          category: 'Pastelaria Artesanal & Caldos de Cana',
          phone: '(19) 99591-1878',
          email: 'contato@imperiusdopastel.com.br',
          cnpj: '52.894.103/0001-88',
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
          wahaSessionName: 'Imperiuspastel'
        }
      });
    }

    return json({
      success: true,
      settings: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        category: restaurant.category,
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
        deliveryFee: Number(restaurant.deliveryFee),
        minOrderValue: Number(restaurant.minOrderValue),
        slaMinutesMin: restaurant.slaMinutesMin,
        slaMinutesMax: restaurant.slaMinutesMax,
        isOpen: restaurant.isOpen,
        allowDelivery: restaurant.allowDelivery,
        allowTakeout: restaurant.allowTakeout,
        allowDineIn: restaurant.allowDineIn,
        operatingHours: restaurant.operatingHours || 'Segunda a Domingo: 17:00 às 23:30',
        instagram: restaurant.instagram || '',
        paymentGateway: restaurant.paymentGateway || 'MERCADO_PAGO',
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
        pixKeyType: restaurant.pixKeyType || 'CNPJ',
        pixReceiverName: restaurant.pixReceiverName || '',
        pixReceiverCity: restaurant.pixReceiverCity || '',
        pixInstructions: restaurant.pixInstructions || '',
        wahaSessionName: restaurant.wahaSessionName || 'Imperiuspastel',
        plan: restaurant.plan,
        status: restaurant.status
      }
    });
  } catch (err: any) {
    console.error('Erro ao buscar configurações:', err);
    return json({ success: false, error: err.message }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const data = await request.json();

    let restaurant = await prisma.restaurant.findFirst();

    if (!restaurant) {
      restaurant = await prisma.restaurant.create({
        data: {
          name: data.name || 'Meu Restaurante',
          slug: data.slug || 'meu-restaurante',
          phone: data.phone || ''
        }
      });
    }

    const updated = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: {
        name: data.name !== undefined ? data.name : restaurant.name,
        slug: data.slug !== undefined ? data.slug.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-') : restaurant.slug,
        category: data.category !== undefined ? data.category : restaurant.category,
        cnpj: data.cnpj !== undefined ? data.cnpj : restaurant.cnpj,
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
        wahaSessionName: data.wahaSessionName !== undefined ? data.wahaSessionName : restaurant.wahaSessionName
      }
    });

    return json({
      success: true,
      restaurant: updated
    });
  } catch (err: any) {
    console.error('Erro ao salvar configurações:', err);
    return json({ success: false, error: err.message }, { status: 500 });
  }
};
