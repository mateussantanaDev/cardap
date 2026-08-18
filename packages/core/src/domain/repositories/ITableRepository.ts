export type TableStatus = 'LIVRE' | 'OCUPADA' | 'CONTA_SOLICITADA' | 'RESERVADA';

export interface TableData {
  id: string;
  number: number;
  capacity: number;
  qrTokenSignature: string;
  qrCodeUrl?: string;
  status: TableStatus;
  activeOrderTotalCents: number;
}

export interface ITableRepository {
  findById(id: string): Promise<TableData | null>;
  findByNumber(number: number): Promise<TableData | null>;
  findByQrTokenSignature(signature: string): Promise<TableData | null>;
  save(table: TableData): Promise<void>;
  updateStatus(id: string, status: TableStatus): Promise<void>;
}
