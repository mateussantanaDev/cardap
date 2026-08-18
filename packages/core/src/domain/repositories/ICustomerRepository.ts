import { CustomerEntity } from '../entities/CustomerEntity';

export interface CustomerMessageData {
  id: string;
  customerId: string;
  orderId?: string;
  direction: 'INBOUND' | 'OUTBOUND';
  remoteJid: string;
  content: string;
  status: 'ENVIADO' | 'ENTREGUE' | 'LIDO' | 'FALHA';
  evoInstanceId?: string;
  createdAt: Date;
}

export interface ICustomerRepository {
  findByPhone(phone: string): Promise<CustomerEntity | null>;
  findById(id: string): Promise<CustomerEntity | null>;
  findAll(): Promise<CustomerEntity[]>;
  save(customer: CustomerEntity): Promise<void>;
  logMessage(message: CustomerMessageData): Promise<void>;
  getMessagesByCustomerId(customerId: string): Promise<CustomerMessageData[]>;
}
