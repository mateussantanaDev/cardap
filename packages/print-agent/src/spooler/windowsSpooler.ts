import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import type { WindowsPrinter } from '../types.js';

const execAsync = promisify(exec);

export class WindowsSpooler {
  /**
   * Lista todas as impressoras instaladas no Windows (USB, Rede, Virtuais)
   */
  public static async listPrinters(): Promise<WindowsPrinter[]> {
    if (process.platform !== 'win32') {
      // Mock para desenvolvimento no Mac / Linux
      return [
        {
          name: 'EPSON TM-T20 Thermal Printer',
          portName: 'USB001',
          driverName: 'EPSON Advanced Printer Driver 5',
          isDefault: true,
          status: 'Pronta'
        },
        {
          name: 'Bematech MP-4200 TH',
          portName: 'COM3',
          driverName: 'Bematech Driver v4',
          isDefault: false,
          status: 'Pronta'
        },
        {
          name: 'Elgin i9 (Cozinha)',
          portName: '192.168.1.200:9100',
          driverName: 'Elgin i9 Driver',
          isDefault: false,
          status: 'Disponivel'
        }
      ];
    }

    try {
      const psCommand = `powershell -NoProfile -Command "Get-CimInstance Win32_Printer | Select-Object Name, PortName, DriverName, Default, PrinterStatus | ConvertTo-Json"`;
      const { stdout } = await execAsync(psCommand);

      if (!stdout || !stdout.trim()) {
        return [];
      }

      const parsed = JSON.parse(stdout);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      return items.map((p: any) => ({
        name: p.Name || 'Impressora Sem Nome',
        portName: p.PortName || '',
        driverName: p.DriverName || '',
        isDefault: Boolean(p.Default),
        status: p.PrinterStatus === 3 ? 'Pronta' : 'Disponivel'
      }));
    } catch (err) {
      console.error('[WindowsSpooler] Erro ao listar impressoras via PowerShell:', err);
      return [];
    }
  }

  /**
   * Envia buffer bruto (RAW ESC/POS) para a impressora
   */
  public static async printRaw(printerName: string, buffer: Buffer): Promise<{ success: boolean; error?: string }> {
    // 1. Se a impressora for um IP de rede direto (ex: 192.168.1.100 ou 192.168.1.100:9100)
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(printerName.trim())) {
      return this.printToNetworkSocket(printerName.trim(), buffer);
    }

    // 2. Se for ambiente de desenvolvimento (macOS / Linux)
    if (process.platform !== 'win32') {
      console.log(`[WindowsSpooler DEV] Impressão simulada com sucesso para: "${printerName}" (${buffer.length} bytes)`);
      return { success: true };
    }

    // 3. Impressão nativa no Windows Spooler (RAW ESC/POS)
    try {
      const tempFile = path.join(os.tmpdir(), `cardap_job_${Date.now()}_${Math.random().toString(36).substring(7)}.bin`);
      await fs.promises.writeFile(tempFile, buffer);

      // Envia diretamente para o spooler do Windows sem abrir nenhuma janela
      // Usa comando PowerShell com Out-Printer ou Raw Print
      const escapedPrinter = printerName.replace(/"/g, '`"');
      const escapedFile = tempFile.replace(/"/g, '`"');

      // Script PowerShell que envia arquivo RAW direto para a fila da impressora Windows
      const psScript = `
        $printer = "${escapedPrinter}";
        $file = "${escapedFile}";
        Get-Content -Path $file -Raw -Encoding Byte | Out-Printer -Name $printer;
      `;

      await execAsync(`powershell -NoProfile -Command "${psScript.replace(/\n/g, ' ')}"`);

      // Limpa arquivo temporário
      try {
        await fs.promises.unlink(tempFile);
      } catch {}

      return { success: true };
    } catch (err: any) {
      console.error(`[WindowsSpooler] Falha ao enviar para impressora "${printerName}":`, err);
      return {
        success: false,
        error: err?.message || 'Falha ao comunicar com o spooler do Windows'
      };
    }
  }

  /**
   * Envia dados ESC/POS diretamente via Socket TCP para impressoras de rede (Porta padrão 9100 / JetDirect)
   */
  private static async printToNetworkSocket(hostAndPort: string, buffer: Buffer): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const parts = hostAndPort.split(':');
      const host = parts[0];
      const port = parts[1] ? parseInt(parts[1], 10) : 9100;

      const client = new net.Socket();
      client.setTimeout(5000);

      client.connect(port, host, () => {
        client.write(buffer, () => {
          client.end();
          resolve({ success: true });
        });
      });

      client.on('timeout', () => {
        client.destroy();
        resolve({ success: false, error: `Timeout de 5s ao conectar na impressora de rede ${host}:${port}` });
      });

      client.on('error', (err) => {
        client.destroy();
        resolve({ success: false, error: `Erro na impressora de rede ${host}:${port}: ${err.message}` });
      });
    });
  }
}
