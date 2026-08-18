import { ICustomerRepository, CustomerMessageData } from '../../domain/repositories/ICustomerRepository';
import { CustomerEntity } from '../../domain/entities/CustomerEntity';
import { Result } from '../../shared/Result';
import { DomainError } from '../../shared/DomainError';
import { randomUUID } from 'node:crypto';

export interface ProcessCrmWebhookInputDTO {
  event: string; // ex: "messages.upsert" ou "contacts.upsert"
  instanceId?: string;
  data: {
    remoteJid?: string;
    phone?: string;
    pushName?: string;
    messageText?: string;
    fromMe?: boolean;
  };
}

export class ProcessCrmWebhookUseCase {
  constructor(private customerRepo: ICustomerRepository) {}

  async execute(request: ProcessCrmWebhookInputDTO): Promise<Result<void, DomainError>> {
    const rawPhone = request.data.phone || (request.data.remoteJid ? request.data.remoteJid.split('@')[0] : null);
    if (!rawPhone) {
      return Result.ok(); // Evento sem identificador de telefone, ignorar silenciosamente
    }

    const cleanPhone = rawPhone.replace(/\D/g, '');
    let customer = await this.customerRepo.findByPhone(cleanPhone);

    if (!customer) {
      customer = new CustomerEntity({
        id: randomUUID(),
        phone: cleanPhone,
        name: request.data.pushName || `Cliente ${cleanPhone.slice(-4)}`,
        tags: ['NOVO']
      });
      await this.customerRepo.save(customer);
    }

    if (request.data.messageText) {
      const direction = request.data.fromMe ? 'OUTBOUND' : 'INBOUND';
      const msg: CustomerMessageData = {
        id: randomUUID(),
        customerId: customer.id,
        direction,
        remoteJid: request.data.remoteJid || `${cleanPhone}@s.whatsapp.net`,
        content: request.data.messageText,
        status: 'ENTREGUE',
        evoInstanceId: request.instanceId,
        createdAt: new Date()
      };

      await this.customerRepo.logMessage(msg);
    }

    return Result.ok();
  }
}
