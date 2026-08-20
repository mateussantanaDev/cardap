/**
 * Simulação de tempo real desativada para produção limpa.
 */
export function startMockRealtimeSimulation() {
  // Desativado em produção para não injetar pedidos falsos
  return () => {};
}
