import { describe, it, expect } from 'vitest';
import { SecurityGuard, CreateOrderSchema, CloseBlindCashShiftSchema } from '../src/shared/SecurityGuard';

describe('Segurança, RBAC & Validação de Payload Anti-Hacker', () => {
  it('deve conceder permissões corretas para ADMIN e GERENTE e limitar GARCOM/COZINHA', () => {
    // Admin & Gerente podem fazer tudo
    expect(SecurityGuard.isAllowed('ADMIN', 'CLOSE_CASH_SHIFT')).toBe(true);
    expect(SecurityGuard.isAllowed('GERENTE', 'REGISTER_SANGRIA')).toBe(true);
    expect(SecurityGuard.isAllowed('GERENTE', 'VIEW_REPORTS')).toBe(true);

    // Garçom pode criar pedido mas NÃO pode fechar caixa ou ver DRE
    expect(SecurityGuard.isAllowed('GARCOM', 'CREATE_ORDER')).toBe(true);
    expect(SecurityGuard.isAllowed('GARCOM', 'CLOSE_CASH_SHIFT')).toBe(false);
    expect(SecurityGuard.isAllowed('GARCOM', 'VIEW_REPORTS')).toBe(false);

    // Cozinha pode avançar KDS mas NÃO pode criar pedidos ou sangrias
    expect(SecurityGuard.isAllowed('COZINHA', 'ADVANCE_KDS_STATUS')).toBe(true);
    expect(SecurityGuard.isAllowed('COZINHA', 'CREATE_ORDER')).toBe(false);
    expect(SecurityGuard.isAllowed('COZINHA', 'REGISTER_SANGRIA')).toBe(false);
  });

  it('deve sanitizar strings contra injeção de script XSS (Cross-Site Scripting)', () => {
    const maliciousInput = "<script>alert('hack')</script> Pastel de Vento <img src=x onerror=alert(1)>";
    const sanitized = SecurityGuard.sanitizeString(maliciousInput);

    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('onerror=');
    expect(sanitized).toContain('&lt;script&gt;');
    expect(sanitized).toContain('Pastel de Vento');
  });

  it('deve validar e sanitizar o payload Zod ao criar um novo pedido', () => {
    const rawPayload = {
      type: 'SALAO',
      shiftId: '123e4567-e89b-12d3-a456-426614174000',
      paymentMethod: 'PIX',
      notes: "Observação com <script>evil()</script>",
      items: [
        {
          productId: 'prod-1',
          productName: 'Pastel de Queijo <b onmouseover=alert(1)>bold</b>',
          quantity: 2,
          unitPriceCents: 1500,
          notes: 'Sem orégano'
        }
      ]
    };

    const parseResult = CreateOrderSchema.safeParse(rawPayload);
    expect(parseResult.success).toBe(true);

    if (parseResult.success) {
      expect(parseResult.data.notes).toBe('Observação com &lt;script&gt;evil()&lt;/script&gt;');
      expect(parseResult.data.items[0].productName).not.toContain('onmouseover=');
    }
  });

  it('deve rejeitar payloads maliciosos com quantidades negativas ou tipos inválidos', () => {
    const invalidPayload = {
      type: 'INVALID_TYPE',
      shiftId: 'not-a-uuid',
      paymentMethod: 'PIX',
      items: [
        {
          productId: 'prod-1',
          productName: 'Pastel',
          quantity: -5, // Invalido!
          unitPriceCents: -100
        }
      ]
    };

    const parseResult = CreateOrderSchema.safeParse(invalidPayload);
    expect(parseResult.success).toBe(false);
  });
});
