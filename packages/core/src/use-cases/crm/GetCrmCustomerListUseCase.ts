import { ICustomerRepository } from '../../domain/repositories/ICustomerRepository';

export interface CrmCustomerOutputDTO {
  id: string;
  name: string;
  phone: string;
  formattedPhone: string;
  totalOrdersCount: number;
  totalSpentCents: number;
  totalSpentFormatted: string;
  averageTicketFormatted: string;
  tags: string[];
  lastOrderDateFormatted?: string;
  createdAt: Date;
}

export class GetCrmCustomerListUseCase {
  constructor(private customerRepo: ICustomerRepository) {}

  async execute(): Promise<CrmCustomerOutputDTO[]> {
    const customers = await this.customerRepo.findAll();

    return customers.map(c => {
      const lastOrderDateFormatted = c.lastOrderAt
        ? c.lastOrderAt.toLocaleDateString('pt-BR')
        : undefined;

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        formattedPhone: c.formattedPhone,
        totalOrdersCount: c.totalOrdersCount,
        totalSpentCents: c.totalSpentCents,
        totalSpentFormatted: c.lifetimeValue.formatBRL(),
        averageTicketFormatted: c.averageTicket.formatBRL(),
        tags: [...c.tags],
        lastOrderDateFormatted,
        createdAt: c.createdAt
      };
    });
  }
}
