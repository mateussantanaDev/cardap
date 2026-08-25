import http from 'node:http';
import os from 'node:os';
import { configStore } from './config/configStore.js';
import { WindowsSpooler } from './spooler/windowsSpooler.js';
import { EscPosBuilder } from './spooler/escpos.js';
import { cloudSync } from './client/cloudSync.js';
import type { PrintJob, PrintResult, PrintStation } from './types.js';

export function createPrintServer(port = 9898): http.Server {
  const server = http.createServer(async (req, res) => {
    // Headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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

    const sendHtml = (statusCode: number, html: string) => {
      res.writeHead(statusCode, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    };

    try {
      // 1. GET / (Dashboard Web Embutido no Agente Local)
      if (req.method === 'GET' && pathname === '/') {
        const printers = await WindowsSpooler.listPrinters();
        const stations = configStore.getStations();
        const html = renderAgentDashboardHtml(port, stations, printers);
        return sendHtml(200, html);
      }

      // 2. GET /status ou /api/status ou /health
      if (req.method === 'GET' && (pathname === '/status' || pathname === '/api/status' || pathname === '/health')) {
        const stations = configStore.getStations();
        return sendJson(200, {
          status: 'ONLINE',
          name: 'Cardap Print Agent',
          version: '1.0.0',
          platform: process.platform,
          hostname: os.hostname(),
          port,
          configPath: configStore.getConfigPath(),
          stations,
          cloudSync: cloudSync.getStatus()
        });
      }

      // 3. GET /printers ou /api/printers
      if (req.method === 'GET' && (pathname === '/printers' || pathname === '/api/printers')) {
        const printers = await WindowsSpooler.listPrinters();
        return sendJson(200, { success: true, printers });
      }

      // 4. GET /api/stations
      if (req.method === 'GET' && pathname === '/api/stations') {
        const stations = configStore.getStations();
        return sendJson(200, { success: true, stations });
      }

      // 5. POST /api/stations ou /stations (Adiciona ou atualiza ponto de impressão)
      if (req.method === 'POST' && (pathname === '/api/stations' || pathname === '/stations')) {
        const body = await parseJsonBody<any>(req);
        if (!body.token || !body.targetPrinter) {
          return sendJson(400, { success: false, error: 'Campos "token" e "targetPrinter" são obrigatórios.' });
        }

        const station = configStore.addOrUpdateStation(body);
        cloudSync.reload();

        return sendJson(200, {
          success: true,
          message: `Ponto de impressão "${station.name}" salvo e conectado com sucesso!`,
          station
        });
      }

      // 6. DELETE /api/stations/:id ou DELETE /stations
      if (req.method === 'DELETE' && (pathname.startsWith('/api/stations') || pathname.startsWith('/stations'))) {
        const id = url.searchParams.get('id') || pathname.split('/').pop();
        if (id) {
          configStore.deleteStation(id);
          cloudSync.reload();
          return sendJson(200, { success: true, message: 'Ponto de impressão removido com sucesso.' });
        }
        return sendJson(400, { success: false, error: 'ID da estação obrigatório.' });
      }

      // 7. POST /pair (Atalho 1-Clique do ERP Web)
      if (req.method === 'POST' && pathname === '/pair') {
        const body = await parseJsonBody<any>(req);
        if (!body.token) {
          return sendJson(400, { success: false, error: 'Token de pareamento obrigatório.' });
        }

        const serverUrl = body.serverUrl || 'https://app.usecardap.com.br';
        const printers = await WindowsSpooler.listPrinters();
        const targetPrinter = body.targetPrinter || printers[0]?.name || 'Impressora Padrão';

        const station = configStore.addOrUpdateStation({
          name: body.deviceName || body.stationName || `Terminal ${body.sector || 'Principal'}`,
          serverUrl,
          token: body.token,
          targetPrinter,
          sector: body.sector || 'TODOS',
          restaurantName: body.restaurantName || ''
        });

        cloudSync.reload();

        return sendJson(200, {
          success: true,
          message: 'Ponto pareado com sucesso!',
          station
        });
      }

      // 8. POST /imprimir (Envio direto de impressão do ERP)
      if (req.method === 'POST' && pathname === '/imprimir') {
        const body = await parseJsonBody<PrintJob>(req);
        const printers = await WindowsSpooler.listPrinters();
        const targetPrinter = body.printerName || printers[0]?.name;

        if (!targetPrinter) {
          return sendJson(400, {
            success: false,
            error: 'Nenhuma impressora física informada ou detectada no sistema operacional.'
          });
        }

        const escposBuffer = EscPosBuilder.fromPlainText(body.content || '', {
          cut: body.cut ?? true,
          openDrawer: body.openDrawer ?? false,
          beep: body.beep ?? false
        });

        const resPrint = await WindowsSpooler.printRaw(targetPrinter, escposBuffer);
        return sendJson(resPrint.success ? 200 : 500, {
          success: resPrint.success,
          printerUsed: targetPrinter,
          error: resPrint.error
        });
      }

      // 9. POST /test-print (Impressão de teste com corte)
      if (req.method === 'POST' && pathname === '/test-print') {
        const body = await parseJsonBody<any>(req);
        const printers = await WindowsSpooler.listPrinters();
        const printerName = body.printerName || printers[0]?.name;

        if (!printerName) {
          return sendJson(400, { success: false, error: 'Nenhuma impressora física informada ou detectada.' });
        }

        const testLines = [
          '================================================',
          '               CARDAP ERP & PDV                 ',
          '        COMPROVANTE DE TESTE DE IMPRESSAO        ',
          '================================================',
          `DATA/HORA : ${new Date().toLocaleString('pt-BR')}`,
          `SISTEMA   : ${process.platform === 'win32' ? 'Windows' : 'macOS / Linux'} (${os.hostname()})`,
          `IMPRESSORA: ${printerName}`,
          `VERSAO    : Cardap Local Print Agent v1.0.0`,
          '------------------------------------------------',
          '  STATUS: COMUNICACAO RAW ESC/POS OPERACIONAL!  ',
          '  - Corte automatico de papel: OK               ',
          '  - Impressao silenciosa sem dialogos: OK       ',
          '================================================',
          '           https://app.usecardap.com.br         ',
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

      sendJson(404, { success: false, error: `Endpoint não encontrado: ${pathname}` });
    } catch (err: any) {
      console.error('[PrintServer] Erro:', err);
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

function renderAgentDashboardHtml(port: number, stations: PrintStation[], printers: any[]): string {
  const printerOptions = printers.length > 0
    ? printers.map(p => `<option value="${escapeHtml(p.name)}">${escapeHtml(p.name)} (${escapeHtml(p.portName || 'RAW')})</option>`).join('')
    : '<option value="">Nenhuma impressora detectada no sistema</option>';

  const stationsRows = stations.length > 0
    ? stations.map(s => `
      <tr>
        <td style="padding:12px; border-bottom:1px solid #e2e8f0; font-weight:bold;">${escapeHtml(s.name)}</td>
        <td style="padding:12px; border-bottom:1px solid #e2e8f0; font-family:monospace; font-size:12px;">${escapeHtml(s.serverUrl)}</td>
        <td style="padding:12px; border-bottom:1px solid #e2e8f0;"><strong>${escapeHtml(s.targetPrinter)}</strong></td>
        <td style="padding:12px; border-bottom:1px solid #e2e8f0;">
          <span style="padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold; ${s.status === 'CONECTADO' ? 'background:#dcfce7; color:#166534;' : s.status === 'RECONECTANDO' ? 'background:#fef9c3; color:#854d0e;' : 'background:#fee2e2; color:#991b1b;'}">
            ${s.status || 'DESCONECTADO'}
          </span>
        </td>
        <td style="padding:12px; border-bottom:1px solid #e2e8f0; text-align:right;">
          <button onclick="testStationPrint('${escapeHtml(s.targetPrinter)}')" style="padding:6px 12px; background:#0f172a; color:#fff; border:none; border-radius:4px; font-size:11px; cursor:pointer; font-weight:bold; margin-right:6px;">Testar Impressão</button>
          <button onclick="deleteStation('${escapeHtml(s.id)}')" style="padding:6px 12px; background:#ef4444; color:#fff; border:none; border-radius:4px; font-size:11px; cursor:pointer; font-weight:bold;">Remover</button>
        </td>
      </tr>
    `).join('')
    : `<tr><td colspan="5" style="padding:24px; text-align:center; color:#64748b;">Nenhum Ponto de Impressão configurado. Use o formulário abaixo para adicionar seu Token do Cardap ERP.</td></tr>`;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Cardap Print Agent - Painel Local</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
    .container { max-width: 900px; margin: 0 auto; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    h1, h2, h3 { margin-top: 0; }
    .badge-online { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; background: #dcfce7; color: #166534; border-radius: 9999px; font-size: 12px; font-weight: bold; }
    .dot { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; display: inline-block; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { padding: 10px 12px; background: #f1f5f9; border-bottom: 1px solid #cbd5e1; font-size: 11px; text-transform: uppercase; color: #475569; }
    .form-group { margin-bottom: 16px; }
    label { display: block; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #475569; margin-bottom: 6px; }
    input, select { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
    .btn-primary { background: #dc2626; color: white; padding: 10px 20px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px; }
    .btn-primary:hover { background: #b91c1c; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
      <div>
        <h2>🖨️ Cardap Local Print Agent</h2>
        <div style="font-size:13px; color:#64748b;">Agente de Impressão Direta ESC/POS para Restaurantes & PDVs</div>
      </div>
      <div class="badge-online">
        <span class="dot"></span> ONLINE (Porta ${port})
      </div>
    </div>

    <div class="card">
      <h3>📡 Pontos de Impressão Conectados (Terminais da Nuvem)</h3>
      <p style="font-size:13px; color:#64748b;">Cada ponto escuta os pedidos do seu restaurante na VPS em tempo real e imprime na impressora selecionada.</p>
      <table>
        <thead>
          <tr>
            <th>Nome do Ponto</th>
            <th>Servidor ERP</th>
            <th>Impressora Física</th>
            <th>Status Nuvem</th>
            <th style="text-align:right;">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${stationsRows}
        </tbody>
      </table>
    </div>

    <div class="card">
      <h3>➕ Adicionar Novo Ponto de Impressão</h3>
      <form id="stationForm" onsubmit="saveStation(event)">
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
          <div class="form-group">
            <label>Nome do Ponto / Setor:</label>
            <input type="text" id="name" placeholder="Ex: Cozinha, Caixa 1, Bar" required value="Cozinha">
          </div>
          <div class="form-group">
            <label>URL do Servidor ERP:</label>
            <input type="url" id="serverUrl" required value="https://app.usecardap.com.br">
          </div>
        </div>

        <div class="form-group">
          <label>Token de Pareamento (Gerado no Cardap ERP):</label>
          <input type="text" id="token" placeholder="Ex: cardap_prt_..." required font-family="monospace">
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
          <div class="form-group">
            <label>Impressora Física de Destino:</label>
            <select id="targetPrinter" required>
              ${printerOptions}
            </select>
          </div>
          <div class="form-group">
            <label>Setor:</label>
            <select id="sector">
              <option value="TODOS">TODOS (Imprime tudo)</option>
              <option value="COZINHA" selected>COZINHA / KDS</option>
              <option value="CAIXA">CAIXA / Balcão</option>
              <option value="BAR">BAR / Bebidas</option>
              <option value="DELIVERY">DELIVERY / Despacho</option>
            </select>
          </div>
        </div>

        <button type="submit" class="btn-primary">Salvar e Conectar à Nuvem</button>
      </form>
    </div>
  </div>

  <script>
    async function saveStation(e) {
      e.preventDefault();
      const payload = {
        name: document.getElementById('name').value,
        serverUrl: document.getElementById('serverUrl').value,
        token: document.getElementById('token').value,
        targetPrinter: document.getElementById('targetPrinter').value,
        sector: document.getElementById('sector').value
      };

      const res = await fetch('/api/stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('Ponto de impressão salvo e conectado com sucesso!');
        location.reload();
      } else {
        const err = await res.json();
        alert('Erro: ' + (err.error || 'Falha ao salvar'));
      }
    }

    async function deleteStation(id) {
      if (!confirm('Deseja realmente remover este ponto de impressão?')) return;
      const res = await fetch('/api/stations?id=' + encodeURIComponent(id), { method: 'DELETE' });
      if (res.ok) {
        location.reload();
      }
    }

    async function testStationPrint(printerName) {
      const res = await fetch('/test-print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printerName })
      });
      if (res.ok) {
        alert('Comprovante de teste enviado para "' + printerName + '" com sucesso!');
      } else {
        alert('Falha ao imprimir.');
      }
    }
  </script>
</body>
</html>
  `;
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
