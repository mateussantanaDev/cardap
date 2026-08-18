import { Result } from './Result';
import { DomainError } from './DomainError';
import { z } from 'zod';

export type UserRole = 'ADMIN' | 'GERENTE' | 'CAIXA' | 'GARCOM' | 'COZINHA' | 'MOTOBOY';

export type SystemPermission =
  | 'OPEN_CASH_SHIFT'
  | 'CLOSE_CASH_SHIFT'
  | 'REGISTER_SANGRIA'
  | 'REGISTER_SUPRIMENTO'
  | 'CREATE_ORDER'
  | 'CANCEL_ORDER'
  | 'ADVANCE_KDS_STATUS'
  | 'MANAGE_INVENTORY'
  | 'VIEW_REPORTS'
  | 'GENERATE_TABLE_TOKEN';

const ROLE_PERMISSIONS: Record<UserRole, SystemPermission[]> = {
  ADMIN: [
    'OPEN_CASH_SHIFT',
    'CLOSE_CASH_SHIFT',
    'REGISTER_SANGRIA',
    'REGISTER_SUPRIMENTO',
    'CREATE_ORDER',
    'CANCEL_ORDER',
    'ADVANCE_KDS_STATUS',
    'MANAGE_INVENTORY',
    'VIEW_REPORTS',
    'GENERATE_TABLE_TOKEN'
  ],
  GERENTE: [
    'OPEN_CASH_SHIFT',
    'CLOSE_CASH_SHIFT',
    'REGISTER_SANGRIA',
    'REGISTER_SUPRIMENTO',
    'CREATE_ORDER',
    'CANCEL_ORDER',
    'ADVANCE_KDS_STATUS',
    'MANAGE_INVENTORY',
    'VIEW_REPORTS',
    'GENERATE_TABLE_TOKEN'
  ],
  CAIXA: [
    'OPEN_CASH_SHIFT',
    'CLOSE_CASH_SHIFT',
    'REGISTER_SANGRIA',
    'REGISTER_SUPRIMENTO',
    'CREATE_ORDER',
    'ADVANCE_KDS_STATUS'
  ],
  GARCOM: [
    'CREATE_ORDER'
  ],
  COZINHA: [
    'ADVANCE_KDS_STATUS'
  ],
  MOTOBOY: []
};

export class UnauthorizedError extends DomainError {
  constructor(message: string = "Acesso negado: privilégios insuficientes para realizar esta operação.") {
    super(message, 'UNAUTHORIZED_ACCESS');
    this.name = 'UnauthorizedError';
  }
}

export class SecurityGuard {
  /**
   * Verifica se uma função/papel possui a permissão requerida no RBAC.
   */
  public static isAllowed(role: UserRole, permission: SystemPermission): boolean {
    const allowedPermissions = ROLE_PERMISSIONS[role];
    if (!allowedPermissions) return false;
    return allowedPermissions.includes(permission);
  }

  /**
   * Garante a autorização via RBAC retornando um Result com erro amigável se negado.
   */
  public static authorize(role: UserRole, permission: SystemPermission): Result<void, DomainError> {
    if (!this.isAllowed(role, permission)) {
      return Result.fail(
        new UnauthorizedError(
          `Segurança RBAC: O perfil '${role}' não possui a permissão '${permission}'.`
        )
      );
    }
    return Result.ok();
  }

  /**
   * Sanitiza strings contra XSS e caracteres nocivos de injeção de scripts HTML/JS.
   */
  public static sanitizeString(input: string): string {
    if (!input) return '';
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/["']/g, match => (match === '"' ? '&quot;' : '&#x27;'))
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }
}

// Schemas Zod de Validação de Input Sanitizados e Seguros
export const OrderItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  productId: z.string().min(1, "ID do produto é obrigatório"),
  productName: z.string().min(1, "Nome do produto é obrigatório").transform(SecurityGuard.sanitizeString),
  quantity: z.number().int().positive("A quantidade deve ser um inteiro positivo"),
  unitPriceCents: z.number().int().min(0, "O preço não pode ser negativo"),
  notes: z.string().max(250).transform(SecurityGuard.sanitizeString).optional(),
  modifiers: z.array(z.object({
    id: z.string(),
    name: z.string().transform(SecurityGuard.sanitizeString),
    priceAdjustmentCents: z.number().int(),
    quantity: z.number().int().positive().optional()
  })).optional(),
  assemblies: z.array(z.object({
    id: z.string(),
    name: z.string().transform(SecurityGuard.sanitizeString),
    priceAdjustmentCents: z.number().int(),
    quantity: z.number().int().positive().optional()
  })).optional(),
  complements: z.array(z.object({
    id: z.string(),
    name: z.string().transform(SecurityGuard.sanitizeString),
    priceAdjustmentCents: z.number().int(),
    quantity: z.number().int().positive().optional()
  })).optional()
});

export const CreateOrderSchema = z.object({
  type: z.enum(['SALAO', 'BALCAO', 'DELIVERY']),
  shiftId: z.string().uuid("ID de caixa inválido"),
  paymentMethod: z.enum(['DINHEIRO', 'PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'VR_VA']),
  tableQrToken: z.string().optional(),
  tableId: z.string().optional(),
  customerId: z.string().optional(),
  deliveryFeeCents: z.number().int().min(0).optional(),
  discountAmountCents: z.number().int().min(0).optional(),
  notes: z.string().max(500).transform(SecurityGuard.sanitizeString).optional(),
  items: z.array(OrderItemInputSchema).min(1, "O pedido deve conter pelo menos um item")
});

export const CloseBlindCashShiftSchema = z.object({
  shiftId: z.string().uuid("ID de caixa inválido"),
  closedByUserId: z.string().min(1, "ID do usuário é obrigatório"),
  actualFinalCents: z.number().int().min(0, "O valor informado não pode ser negativo"),
  notes: z.string().max(500).transform(SecurityGuard.sanitizeString).optional()
});
