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
   * Lista todas as impressoras REAIS instaladas no sistema operacional (Windows, macOS CUPS, Linux)
   */
  public static async listPrinters(): Promise<WindowsPrinter[]> {
    // 1. Ambientes macOS e Linux (via CUPS / lpstat)
    if (process.platform !== 'win32') {
      try {
        const { stdout: destsOut } = await execAsync('lpstat -e').catch(() => ({ stdout: '' }));
        const printerNames = destsOut
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean);

        if (printerNames.length === 0) {
          return [];
        }

        // Obtém a impressora padrão do sistema se houver
        const { stdout: defaultOut } = await execAsync('lpstat -d').catch(() => ({ stdout: '' }));
        const defaultMatch = defaultOut.match(/system default destination:\s*(.+)/i);
        const defaultPrinter = defaultMatch ? defaultMatch[1].trim() : '';

        return printerNames.map(name => ({
          name,
          portName: 'CUPS RAW / USB',
          driverName: 'CUPS Native Driver',
          isDefault: name === defaultPrinter,
          status: 'Pronta'
        }));
      } catch (err) {
        console.error('[SystemSpooler] Erro ao consultar impressoras via CUPS:', err);
        return [];
      }
    }

    // 2. Ambiente Windows (via PowerShell WMI / Win32_Printer)
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
      console.error('[SystemSpooler] Erro ao listar impressoras via PowerShell:', err);
      return [];
    }
  }

  /**
   * Envia buffer bruto (RAW ESC/POS) diretamente para a impressora real
   */
  public static async printRaw(printerName: string, buffer: Buffer): Promise<{ success: boolean; error?: string }> {
    if (!printerName) {
      return { success: false, error: 'Nome da impressora não especificado.' };
    }

    // 1. Impressão via IP de rede direto (ex: 192.168.1.100 ou 192.168.1.100:9100)
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(printerName.trim())) {
      return this.printToNetworkSocket(printerName.trim(), buffer);
    }

    const tempFile = path.join(os.tmpdir(), `cardap_job_${Date.now()}_${Math.random().toString(36).substring(7)}.bin`);
    await fs.promises.writeFile(tempFile, buffer);

    // 2. macOS e Linux (envio RAW real via CUPS lpr)
    if (process.platform !== 'win32') {
      try {
        const escapedPrinter = printerName.replace(/"/g, '\\"');
        const escapedFile = tempFile.replace(/"/g, '\\"');
        await execAsync(`lpr -P "${escapedPrinter}" -o raw "${escapedFile}"`);

        try {
          await fs.promises.unlink(tempFile);
        } catch {}

        return { success: true };
      } catch (err: any) {
        console.error(`[SystemSpooler] Falha ao enviar para impressora macOS/Linux "${printerName}":`, err);
        try {
          await fs.promises.unlink(tempFile);
        } catch {}
        return {
          success: false,
          error: err?.message || 'Falha ao imprimir no CUPS (verifique se a impressora existe no sistema).'
        };
      }
    }

    // 3. Windows (envio RAW direto para a fila do Spooler)
    try {
      const escapedPrinter = printerName.replace(/"/g, '`"');
      const escapedFile = tempFile.replace(/"/g, '`"');

      const psScript = `
        $printer = "${escapedPrinter}";
        $file = "${escapedFile}";
        Get-Content -Path $file -Raw -Encoding Byte | Out-Printer -Name $printer;
      `;

      await execAsync(`powershell -NoProfile -Command "${psScript.replace(/\n/g, ' ')}"`);

      try {
        await fs.promises.unlink(tempFile);
      } catch {}

      return { success: true };
    } catch (err: any) {
      console.error(`[SystemSpooler] Falha ao enviar para impressora Windows "${printerName}":`, err);
      try {
        await fs.promises.unlink(tempFile);
      } catch {}
      return {
        success: false,
        error: err?.message || 'Falha ao comunicar com o spooler do Windows.'
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
