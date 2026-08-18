import { orderStore, type KdsOrder } from './orderStore';
import { tableStore } from './tableStore';

let orderCounter = 105;

/**
 * Simula o recebimento de eventos WebSocket em tempo real.
 * Dispara pedidos simulados para testar o KDS e a atualização de Mesas.
 */
export function startMockRealtimeSimulation() {
  const interval = setInterval(() => {
    const isTableOrder = Math.random() > 0.4;
    const tableNum = isTableOrder ? Math.floor(Math.random() * 5) + 1 : undefined;

    const newOrder: KdsOrder = {
      id: `ord-${orderCounter}`,
      orderNumber: orderCounter,
      type: isTableOrder ? 'SALAO' : Math.random() > 0.5 ? 'BALCAO' : 'DELIVERY',
      status: 'RECEBIDO',
      tableNumber: tableNum,
      totalAmountFormatted: `R$ ${(Math.floor(Math.random() * 60) + 25).toFixed(2).replace('.', ',')}`,
      totalAmountCents: 4500,
      createdAt: new Date(),
      slaMinutes: 15,
      items: [
        {
          id: `item-sim-${Date.now()}`,
          productName: isTableOrder ? 'Monte Seu Pastel (20cm)' : 'Pastel de Carne com Queijo',
          quantity: Math.floor(Math.random() * 2) + 1,
          notes: isTableOrder ? 'Sem cebola' : 'Fritar bem'
        }
      ]
    };

    console.log(`[Mock WS] Novo pedido recebido via WebSocket: #${newOrder.orderNumber}`);
    orderStore.addOrder(newOrder);

    if (tableNum) {
      tableStore.updateStatus(`tbl-${tableNum}`, 'OCUPADA');
    }

    orderCounter++;
  }, 15000); // Dispara a cada 15 segundos

  return () => clearInterval(interval);
}
