import { createPrintServer } from './server.js';
import { configStore } from './config/configStore.js';
import { cloudSync } from './client/cloudSync.js';
import { WindowsSpooler } from './spooler/windowsSpooler.js';

async function bootstrap() {
  const config = configStore.getConfig();
  const port = config.port || 9898;

  console.log('====================================================');
  console.log('   🖨️  CARDAP LOCAL PRINT AGENT (WINDOWS/POS)      ');
  console.log('   Tecnologia de Impressão Direta Silenciosa        ');
  console.log('====================================================');
  console.log(`[CardapAgent] Porta HTTP Local : http://127.0.0.1:${port}`);
  console.log(`[CardapAgent] Arquivo de Config: ${configStore.getConfigPath()}`);
  console.log(`[CardapAgent] Dispositivo      : ${config.deviceName}`);
  console.log(`[CardapAgent] Restaurante Vinculado: ${config.restaurantId || '(Aguardando Vinculação)'}`);

  // Inicia o servidor HTTP local
  const server = createPrintServer(port);
  server.listen(port, '127.0.0.1', () => {
    console.log(`[CardapAgent] ✅ Servidor Local de Impressão ativo e pronto na porta ${port}!`);
  });

  // Lista impressoras detectadas no boot
  try {
    const printers = await WindowsSpooler.listPrinters();
    console.log(`[CardapAgent] 📋 ${printers.length} impressora(s) detectada(s) no sistema:`);
    printers.forEach(p => {
      console.log(`  - [${p.isDefault ? 'PADRÃO' : 'DISPONÍVEL'}] ${p.name} (Porta: ${p.portName || 'N/A'})`);
    });
  } catch (err) {
    console.warn('[CardapAgent] Não foi possível listar impressoras no início:', err);
  }

  // Inicia worker de sincronização com a nuvem
  cloudSync.start();

  // Tratamento de encerramento gracioso
  const shutdown = () => {
    console.log('\n[CardapAgent] Encerrando Cardap Print Agent com segurança...');
    cloudSync.stop();
    server.close(() => {
      console.log('[CardapAgent] Servidor finalizado. Até logo!');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch(err => {
  console.error('[CardapAgent] Falha fatal na inicialização:', err);
  process.exit(1);
});
