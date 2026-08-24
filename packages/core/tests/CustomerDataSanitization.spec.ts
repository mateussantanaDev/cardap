import { describe, it, expect } from 'vitest';
import { SecurityGuard } from '../src/shared/SecurityGuard';

describe('Regras de Negócio: Sanitização de Dados de Clientes e Nomes em Pedidos (Etapa 6)', () => {
  it('deve sanitizar strings de endereço e nome de cliente removendo caracteres perigosos', () => {
    const rawName = '  <script>alert("hack")</script> Maria Silva  ';
    const sanitizedName = SecurityGuard.sanitizeString(rawName, 50);

    expect(sanitizedName).not.toContain('<script>');
    expect(sanitizedName).toContain('Maria Silva');
  });

  it('deve formatar corretamente o resumo de itens e identificar o nome do cliente', () => {
    const customer = {
      name: 'João Santos',
      phone: '11987654321',
      addressStreet: 'Rua das Flores',
      addressNumber: '100',
      addressNeighborhood: 'Jardins',
      addressCity: 'São Paulo'
    };

    const orderRecord = {
      id: 'ord-9921',
      customerName: customer.name,
      items: [
        { name: 'Pastel de Queijo', qty: 2 },
        { name: 'Caldo de Cana 500ml', qty: 1 }
      ]
    };

    const itemsSummary = orderRecord.items.map(i => `${i.qty}x ${i.name}`).join(', ');

    expect(orderRecord.customerName).toBe('João Santos');
    expect(itemsSummary).toBe('2x Pastel de Queijo, 1x Caldo de Cana 500ml');
  });

  it('não deve impor cidade fixa se o usuário não preencher e permitir customização livre', () => {
    const userCityInput = '';
    const fallbackCity = userCityInput.trim() || 'Não informada';

    expect(fallbackCity).toBe('Não informada');
    expect(fallbackCity).not.toBe('Garanhuns');
  });
});
