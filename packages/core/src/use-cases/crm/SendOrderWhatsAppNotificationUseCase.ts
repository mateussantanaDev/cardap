import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { ICustomerRepository, CustomerMessageData } from '../../domain/repositories/ICustomerRepository';
import { Result } from '../../shared/Result';
import { DomainError, InvalidOrderStateError } from '../../shared/DomainError';
import { randomUUID } from 'node:crypto';

export interface SendOrderWhatsAppInputDTO {
  orderId: string;
  evoCrmApiUrl?: string;
  apiKey?: string;
}

export interface SendOrderWhatsAppOutputDTO {
  orderId: string;
  orderNumber: number;
  customerPhone: string;
  messageText: string;
  sentAt: Date;
}

export class SendOrderWhatsAppNotificationUseCase {
  constructor(
    private orderRepo: IOrderRepository,
    private customerRepo: ICustomerRepository
  ) {}

  async execute(request: SendOrderWhatsAppInputDTO): Promise<Result<SendOrderWhatsAppOutputDTO, DomainError>> {
    const order = await this.orderRepo.findById(request.orderId);
    if (!order) {
      return Result.fail(new InvalidOrderStateError(`Pedido com ID '${request.orderId}' não encontrado.`));
    }

    if (!order.customerId) {
      return Result.fail(new InvalidOrderStateError("O pedido não possui um cliente associado com WhatsApp."));
    }

    const customer = await this.customerRepo.findById(order.customerId);
    if (!customer || !customer.phone) {
      return Result.fail(new InvalidOrderStateError("Cadastro de cliente ou telefone WhatsApp não encontrado."));
    }

    const statusLabels: Record<string, string> = {
      PENDENTE: 'Pendente ⏳',
      RECEBIDO: 'Recebido na Cozinha 🧾',
      EM_PREPARO: 'Em Preparo na Cozinha 👨‍🍳',
      PRONTO: 'Pronto para Retirada/Entrega 🛵',
      SAIU_PARA_ENTREGA: 'Saiu para Entrega 🚀',
      ENTREGUE: 'Entregue com Sucesso! 🎉',
      CANCELADO: 'Cancelado ❌'
    };

    const statusText = statusLabels[order.status] || order.status;
    const trackingUrl = `https://usecardap.com.br/status/${order.id}`;

    const messageText = [
      `*Cardap Delivery*`,
      ``,
      `*ATUALIZAÇÃO DO PEDIDO #${order.orderNumber}*`,
      `*Status Atual*: ${statusText}`,
      `*Total*: ${order.totalAmount.formatBRL()}`,
      ``,
      `*👉 Acompanhe em tempo real:*`,
      `${trackingUrl}`,
      ``,
      `Agradecemos a preferência!`
    ].join('\n');

    // Registrar no histórico de mensagens do CRM
    const msgData: CustomerMessageData = {
      id: randomUUID(),
      customerId: customer.id,
      orderId: order.id,
      direction: 'OUTBOUND',
      remoteJid: `${customer.phone}@s.whatsapp.net`,
      content: messageText,
      status: 'ENVIADO',
      createdAt: new Date()
    };

    await this.customerRepo.logMessage(msgData);

    return Result.ok({
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerPhone: customer.phone,
      messageText,
      sentAt: msgData.createdAt
    });
  }
}
