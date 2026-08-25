import http from 'node:http';
import os from 'node:os';
import { configStore } from './config/configStore.js';
import { WindowsSpooler } from './spooler/windowsSpooler.js';
import { EscPosBuilder } from './spooler/escpos.js';
import { cloudSync } from './client/cloudSync.js';
import type { PrintJob, PrintResult } from './types.js';

export function createPrintServer(port = 9898): http.Server {
  const server = http.createServer(async (req, res) => {
    // Headers CORS para permitir comunicação direta de qualquer aba do Cardap ERP
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    const sendJson = (statusCode: number, data: any) => {
      res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data));
    };

    try {
      // 1. GET /status ou /health
      if (req.method === 'GET' && (pathname === '/status' || pathname === '/health' || pathname === '/')) {
        const config = configStore.getConfig();
        const cloud = cloudSync.getStatus();
        return sendJson(200, {
          status: 'ONLINE',
          name: 'Cardap Print Agent',
          version: '1.0.0',
          platform: process.platform,
          hostname: os.hostname(),
          port,
          configPath: configStore.getConfigPath(),
          config: {
            restaurantId: config.restaurantId,
            restaurantName: config.restaurantName,
            deviceName: config.deviceName,
            allowedSectors: config.allowedSectors,
            printers: config.printers,
            autoCut: config.autoCut
          },
          cloudConnected: cloud.isConnected
        });
      }

      // 2. GET /printers (Lista impressoras detectadas no Windows)
      if (req.method === 'GET' && pathname === '/printers') {
        const printers = await WindowsSpooler.listPrinters();
        return sendJson(200, { success: true, printers });
      }

      // 3. POST /imprimir (Envio direto do Frontend Web para a Impressora)
      if (req.method === 'POST' && pathname === '/imprimir') {
        const body = await parseJsonBody<PrintJob>(req);
        const config = configStore.getConfig();

        const sector = body.sector || 'TODOS';
        const targetPrinter =
          body.printerName ||
          (sector === 'COZINHA' ? config.printers.COZINHA : '') ||
          (sector === 'CAIXA' ? config.printers.CAIXA : '') ||
          (sector === 'BAR' ? config.printers.BAR : '') ||
          (sector === 'DELIVERY' ? config.printers.DELIVERY : '') ||
          config.printers.DEFAULT ||
          '';

        if (!targetPrinter) {
          return sendJson(400, {
            success: false,
            error: `Nenhuma impressora configurada para o setor "${sector}". Configure nas opções do Agente ou envie o campo "printerName".`
          });
        }

        const copies = Math.max(1, body.copies || 1);
        const escposBuffer = EscPosBuilder.fromPlainText(body.content || '', {
          cut: body.cut ?? config.autoCut,
          openDrawer: body.openDrawer ?? (sector === 'CAIXA' && config.cashDrawerOnCashSale),
          beep: body.beep ?? (sector === 'COZINHA' && config.beepOnKitchenOrder)
        });

        for (let i = 0; i < copies; i++) {
          const resPrint = await WindowsSpooler.printRaw(targetPrinter, escposBuffer);
          if (!resPrint.success) {
            return sendJson(500, {
              success: false,
              printerUsed: targetPrinter,
              error: resPrint.error
            });
          }
        }

        const result: PrintResult = {
          success: true,
          jobId: body.id,
          printerUsed: targetPrinter,
          sector: body.sector,
          timestamp: new Date().toISOString()
        };

        return sendJson(200, result);
      }

      // 4. POST /pair (Vincula a máquina ao restaurante em 1 clique via Web)
      if (req.method === 'POST' && pathname === '/pair') {
        const body = await parseJsonBody<any>(req);
        if (!body.token || !body.restaurantId) {
          return sendJson(400, { success: false, error: 'Campos "token" e "restaurantId" são obrigatórios.' });
        }

        const updated = configStore.updateConfig({
          serverUrl: body.serverUrl || configStore.getConfig().serverUrl,
          token: body.token,
          restaurantId: body.restaurantId,
          restaurantName: body.restaurantName || '',
          deviceName: body.deviceName || configStore.getConfig().deviceName,
          printers: body.printers || configStore.getConfig().printers
        });

        // Reinicia sincronização com a nuvem
        cloudSync.stop();
        cloudSync.start();

        return sendJson(200, {
          success: true,
          message: 'Máquina vinculada com sucesso ao restaurante!',
          config: updated
        });
      }

      // 5. POST /test-print (Impressão de teste formatada)
      if (req.method === 'POST' && pathname === '/test-print') {
        const body = await parseJsonBody<any>(req);
        const printerName = body.printerName || configStore.getConfig().printers.DEFAULT || (await WindowsSpooler.listPrinters())[0]?.name;

        if (!printerName) {
          return sendJson(400, { success: false, error: 'Nenhuma impressora informada ou detectada.' });
        }

        const testLines = [
          '================================================',
          '               CARDAP ERP & PDV                 ',
          '        COMPROVANTE DE TESTE DE IMPRESSAO        ',
          '================================================',
          `DATA/HORA : ${new Date().toLocaleString('pt-BR')}`,
          `MAQUINA   : ${os.hostname()} (Windows)`,
          `IMPRESSORA: ${printerName}`,
          `AGENTE    : Cardap Local Print Agent v1.0.0`,
          '------------------------------------------------',
          '  STATUS: COMUNICACAO RAW ESC/POS OPERACIONAL!  ',
          '  - Corte automatico de guilhotina: OK          ',
          '  - Margens e espacamento 80mm/58mm: OK         ',
          '  - Zero dialogos / Impressao silenciosa: OK    ',
          '================================================',
          '        Sistema Cardap - Todos os direitos       ',
          '\n\n\n'
        ].join('\n');

        const buffer = EscPosBuilder.fromPlainText(testLines, { cut: true, beep: true });
        const resPrint = await WindowsSpooler.printRaw(printerName, buffer);

        return sendJson(resPrint.success ? 200 : 500, {
          success: resPrint.success,
          printerUsed: printerName,
          error: resPrint.error
        });
      }

      // Rota não encontrada
      sendJson(404, { success: false, error: `Endpoint não encontrado: ${pathname}` });
    } catch (err: any) {
      console.error('[PrintServer] Erro interno:', err);
      sendJson(500, { success: false, error: err?.message || 'Erro interno no servidor de impressão' });
    }
  });

  return server;
}

function parseJsonBody<T>(req: http.IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : ({} as T));
      } catch (err) {
        reject(new Error('JSON malformado no corpo da requisição.'));
      }
    });
    req.on('error', reject);
  });
}
