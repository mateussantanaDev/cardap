import http from 'node:http';
import os from 'node:os';
import { configStore } from './config/configStore.js';
import { WindowsSpooler } from './spooler/windowsSpooler.js';
import { EscPosBuilder } from './spooler/escpos.js';
import { cloudSync } from './client/cloudSync.js';
import { WindowsStartupManager } from './utils/windowsStartup.js';
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
        const isAutoStart = WindowsStartupManager.isEnabled();
        const html = renderAgentDashboardHtml(port, stations, printers, isAutoStart);
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
          autoStart: WindowsStartupManager.isEnabled(),
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

      // 8. Gestão de Inicialização Automática com Windows
      if (req.method === 'GET' && pathname === '/api/system/startup') {
        return sendJson(200, { success: true, enabled: WindowsStartupManager.isEnabled() });
      }

      if (req.method === 'POST' && pathname === '/api/system/startup/enable') {
        const result = WindowsStartupManager.enable();
        return sendJson(200, result);
      }

      if (req.method === 'POST' && pathname === '/api/system/startup/disable') {
        const result = WindowsStartupManager.disable();
        return sendJson(200, result);
      }

      // 9. POST /imprimir (Envio direto de impressão do ERP)
      if (req.method === 'POST' && pathname === '/imprimir') {
        const body = await parseJsonBody<PrintJob>(req);
        const printers = await WindowsSpooler.listPrinters();
        const stations = configStore.getStations();

        const stationForSector = stations.find(s =>
          (body.sector && (s.sector === body.sector || s.sector === 'TODOS')) ||
          s.enabled !== false
        );
        const defaultPrinter = printers.find(p => p.isDefault)?.name;
        const thermalPrinters = printers.filter(p => !p.name.includes('OneNote') && !p.name.includes('PDF') && !p.name.includes('XPS') && !p.name.includes('Fax'));

        const targetPrinter =
          body.printerName ||
          stationForSector?.targetPrinter ||
          thermalPrinters[0]?.name ||
          defaultPrinter ||
          printers[0]?.name;

        if (!targetPrinter) {
          return sendJson(400, { success: false, error: 'Nenhuma impressora disponível detectada no Windows.' });
        }

        const rawBuffer = EscPosBuilder.fromPlainText(body.content || '', {
          cut: body.cut ?? true,
          beep: body.beep ?? false,
          openDrawer: body.openDrawer ?? false
        });

        const printResult = await WindowsSpooler.printRaw(
          targetPrinter,
          rawBuffer
        );

        return sendJson(printResult.success ? 200 : 500, {
          ...printResult,
          printerUsed: targetPrinter
        });
      }

      // 10. POST /test-print
      if (req.method === 'POST' && pathname === '/test-print') {
        const body = await parseJsonBody<{ printerName?: string }>(req);
        const printers = await WindowsSpooler.listPrinters();
        const targetPrinter = body.printerName || printers.find(p => p.isDefault)?.name || printers[0]?.name;

        if (!targetPrinter) {
          return sendJson(400, { success: false, error: 'Nenhuma impressora detectada.' });
        }

        const testText = `================================\n   CARDAP PRINT AGENT TESTE     \n================================\nImpressora: ${targetPrinter}\nData: ${new Date().toLocaleString('pt-BR')}\nStatus: IMPRESSAO RAW ESC/POS OK\n================================\n\n\n`;
        const rawBuffer = EscPosBuilder.fromPlainText(testText, { cut: true, beep: true });
        const resPrint = await WindowsSpooler.printRaw(targetPrinter, rawBuffer);

        return sendJson(resPrint.success ? 200 : 500, {
          ...resPrint,
          printerUsed: targetPrinter
        });
      }

      return sendJson(404, { success: false, error: `Rota não encontrada: ${pathname}` });
    } catch (err: any) {
      console.error('[CardapAgent Server Error]', err);
      return sendJson(500, { success: false, error: err.message || 'Erro interno no agente.' });
    }
  });

  return server;
}

function parseJsonBody<T>(req: http.IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => raw += chunk);
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : ({} as T));
      } catch (e) {
        reject(new Error('JSON inválido no corpo da requisição.'));
      }
    });
    req.on('error', reject);
  });
}

function renderAgentDashboardHtml(port: number, stations: PrintStation[], printers: any[], isAutoStart: boolean): string {
  const printersListHtml = printers.map(p => `
    <li style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <strong>${escapeHtml(p.name)}</strong>
        <span style="color:#64748b; font-size:11px; margin-left:6px;">(${escapeHtml(p.portName || 'N/A')})</span>
        ${p.isDefault ? '<span style="background:#dcfce7; color:#15803d; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px; margin-left:6px;">PADRÃO</span>' : ''}
      </div>
      <button class="btn-sm" onclick="testStationPrint('${escapeHtml(p.name)}')">Testar</button>
    </li>
  `).join('');

  const printerOptions = printers.map(p => `
    <option value="${escapeHtml(p.name)}">${escapeHtml(p.name)} (${escapeHtml(p.portName || 'Porta')})</option>
  `).join('');

  const stationsRows = stations.length === 0
    ? `<tr><td colspan="5" style="text-align:center; padding: 24px; color: #94a3b8;">Nenhum Ponto de Impressão configurado. Adicione abaixo para conectar à Nuvem.</td></tr>`
    : stations.map(s => {
      const isOnline = s.status === 'CONECTADO';
      const statusColor = isOnline ? '#16a34a' : (s.status === 'ERRO' ? '#dc2626' : '#ea580c');
      return `
        <tr>
          <td>
            <strong>${escapeHtml(s.name)}</strong>
            ${s.restaurantName ? `<div style="font-size:11px; color:#64748b;">${escapeHtml(s.restaurantName)}</div>` : ''}
          </td>
          <td><code style="font-size:11px; background:#f8fafc; padding:2px 4px;">${escapeHtml(s.serverUrl)}</code></td>
          <td><strong>${escapeHtml(s.targetPrinter)}</strong> (${escapeHtml(s.sector)})</td>
          <td>
            <span style="display:inline-flex; align-items:center; gap:4px; font-size:12px; font-weight:bold; color:${statusColor};">
              <span style="width:8px; height:8px; border-radius:50%; background:${statusColor}; display:inline-block;"></span>
              ${escapeHtml(s.status || '')}
            </span>
            ${s.lastError ? `<div style="font-size:10px; color:#dc2626; margin-top:2px;">${escapeHtml(s.lastError)}</div>` : ''}
          </td>
          <td style="text-align:right;">
            <button class="btn-sm" onclick="testStationPrint('${escapeHtml(s.targetPrinter)}')">Testar</button>
            <button class="btn-sm btn-danger" onclick="deleteStation('${escapeHtml(s.id)}')">Excluir</button>
          </td>
        </tr>
      `;
    }).join('');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Cardap Local Print Agent — Painel Local</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; }
    body { background: #f8fafc; color: #0f172a; padding: 24px; }
    .container { max-width: 900px; margin: 0 auto; }
    .header { background: #ffffff; border: 2px solid #0f172a; padding: 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .card { background: #ffffff; border: 1px solid #cbd5e1; padding: 20px; margin-bottom: 20px; }
    h1 { font-size: 18px; text-transform: uppercase; font-weight: 800; }
    h2 { font-size: 14px; text-transform: uppercase; margin-bottom: 12px; font-weight: 700; }
    h3 { font-size: 13px; text-transform: uppercase; margin-bottom: 10px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 12px; }
    th, td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .btn-primary { background: #dc2626; color: white; border: none; padding: 8px 16px; font-weight: bold; text-transform: uppercase; font-size: 12px; cursor: pointer; }
    .btn-primary:hover { background: #b91c1c; }
    .btn-sm { background: #0f172a; color: white; border: none; padding: 4px 8px; font-size: 11px; font-weight: bold; cursor: pointer; margin-left: 4px; }
    .btn-danger { background: #dc2626; }
    .form-group { margin-bottom: 12px; }
    label { display: block; font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
    input, select { width: 100%; padding: 8px; font-size: 12px; border: 1px solid #94a3b8; }
    .badge-on { background: #dcfce7; color: #15803d; padding: 4px 8px; font-weight: bold; font-size: 11px; }
    .badge-off { background: #f1f5f9; color: #64748b; padding: 4px 8px; font-weight: bold; font-size: 11px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>🖨️ CARDAP LOCAL PRINT AGENT</h1>
        <p style="font-size: 12px; color: #64748b; margin-top: 4px;">Servidor de Impressão Direta Silenciosa (Porta ${port})</p>
      </div>
      <div>
        <span class="badge-on">🟢 AGENTE OPERACIONAL</span>
      </div>
    </div>

    <!-- Card de Inicialização Automática com Windows -->
    <div class="card" style="display:flex; justify-content:space-between; align-items:center; background:#f0fdf4; border-color:#86efac;">
      <div>
        <h3>🚀 INICIAR COM O WINDOWS (AUTO-START NO BOOT)</h3>
        <p style="font-size: 12px; color: #166534;">
          ${isAutoStart
            ? '🟢 <strong>ATIVADO:</strong> O agente inicia silenciosamente em segundo plano assim que o Windows ligar.'
            : '⚪ <strong>DESATIVADO:</strong> O agente precisa ser aberto manualmente para imprimir.'}
        </p>
      </div>
      <div>
        ${isAutoStart
          ? `<button class="btn-sm btn-danger" onclick="toggleAutoStart(false)">⏸️ Desativar Auto-Start</button>`
          : `<button class="btn-sm" style="background:#16a34a;" onclick="toggleAutoStart(true)">▶️ Ativar com o Windows</button>`}
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <div class="card">
        <h3>📋 Impressoras Físicas Detectadas (${printers.length})</h3>
        <ul style="list-style: none; font-size: 12px;">
          ${printersListHtml}
        </ul>
      </div>

      <div class="card">
        <h3>ℹ️ Como Funciona o Pareamento</h3>
        <p style="font-size: 12px; color: #475569; line-height: 1.5;">
          1. No ERP (Configurações > Terminais de Impressão), clique em <strong>"Gerar Ponto de Impressão"</strong>.<br/>
          2. Copie o <strong>Token</strong> gerado.<br/>
          3. Cole no formulário abaixo, escolha a sua impressora térmica e clique em <strong>Salvar</strong>.<br/>
          4. O agente receberá todas as impressões da Nuvem em milissegundos sem abrir nenhuma janela!
        </p>
      </div>
    </div>

    <div class="card">
      <h2>🌐 Pontos de Impressão em Nuvem Conectados (${stations.length})</h2>
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
    async function toggleAutoStart(enable) {
      const endpoint = enable ? '/api/system/startup/enable' : '/api/system/startup/disable';
      const res = await fetch(endpoint, { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        alert(json.message || 'Configuração atualizada com sucesso!');
        location.reload();
      } else {
        alert('Erro ao atualizar inicialização automática.');
      }
    }

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
