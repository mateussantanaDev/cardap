import { Result } from '../../shared/Result';
import { DomainError } from '../../shared/DomainError';
import { ICustomerRepository } from '../../domain/repositories/ICustomerRepository';
import { CustomerEntity } from '../../domain/entities/CustomerEntity';

export interface CustomerData {
  id: string;
  phone: string;
  name?: string;
  cpf?: string;
  email?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  addressZipCode?: string;
}

export interface IdentifyOrCreateCustomerInputDTO {
  phone: string;
  name?: string;
  cpf?: string;
  email?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  addressZipCode?: string;
}

export class IdentifyOrCreateCustomerUseCase {
  constructor(private customerRepo: ICustomerRepository) {}

  async execute(request: IdentifyOrCreateCustomerInputDTO): Promise<Result<CustomerData, DomainError>> {
    const cleanPhone = request.phone.replace(/\D/g, '');
    let existing = await this.customerRepo.findByPhone(cleanPhone);

    if (existing) {
      const customerToSave = new CustomerEntity({
        id: existing.id,
        phone: existing.phone,
        name: request.name || existing.name,
        cpf: request.cpf || existing.cpf,
        email: request.email || existing.email,
        addressStreet: request.addressStreet || existing.addressStreet,
        addressNumber: request.addressNumber || existing.addressNumber,
        addressNeighborhood: request.addressNeighborhood || existing.addressNeighborhood,
        addressCity: request.addressCity || existing.addressCity,
        addressState: request.addressState || existing.addressState,
        totalOrdersCount: existing.totalOrdersCount,
        totalSpentCents: existing.totalSpentCents,
        tags: [...existing.tags]
      });

      await this.customerRepo.save(customerToSave);

      return Result.ok({
        id: customerToSave.id,
        phone: customerToSave.phone,
        name: customerToSave.name,
        cpf: customerToSave.cpf,
        email: customerToSave.email,
        addressStreet: customerToSave.addressStreet,
        addressNumber: customerToSave.addressNumber,
        addressNeighborhood: customerToSave.addressNeighborhood
      });
    }

    const createdCustomer = new CustomerEntity({
      id: crypto.randomUUID(),
      phone: cleanPhone,
      name: request.name,
      cpf: request.cpf,
      email: request.email,
      addressStreet: request.addressStreet,
      addressNumber: request.addressNumber,
      addressNeighborhood: request.addressNeighborhood,
      addressCity: request.addressCity,
      addressState: request.addressState,
      tags: ['NOVO']
    });

    await this.customerRepo.save(createdCustomer);

    return Result.ok({
      id: createdCustomer.id,
      phone: createdCustomer.phone,
      name: createdCustomer.name,
      cpf: createdCustomer.cpf,
      email: createdCustomer.email,
      addressStreet: createdCustomer.addressStreet,
      addressNumber: createdCustomer.addressNumber,
      addressNeighborhood: createdCustomer.addressNeighborhood
    });
  }
}
