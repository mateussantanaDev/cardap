import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { exec, execSync } from 'node:child_process';

export class WindowsStartupManager {
  private static getStartupFolderPath(): string {
    if (process.platform === 'win32') {
      const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
      return path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
    }
    return '';
  }

  private static getVbsPath(): string {
    const folder = this.getStartupFolderPath();
    if (!folder) return '';
    return path.join(folder, 'CardapPrintAgent.vbs');
  }

  private static getBatPath(): string {
    const folder = this.getStartupFolderPath();
    if (!folder) return '';
    return path.join(folder, 'CardapPrintAgent.bat');
  }

  public static isEnabled(): boolean {
    if (process.platform !== 'win32') return false;

    const vbsPath = this.getVbsPath();
    const batPath = this.getBatPath();

    if ((vbsPath && fs.existsSync(vbsPath)) || (batPath && fs.existsSync(batPath))) {
      return true;
    }

    try {
      const stdout = execSync(
        'reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "CardapPrintAgent"',
        { stdio: ['ignore', 'pipe', 'ignore'] }
      ).toString();
      return stdout.includes('CardapPrintAgent');
    } catch {
      return false;
    }
  }

  public static enable(): { success: boolean; message: string } {
    if (process.platform !== 'win32') {
      return { success: false, message: 'Inicialização automática compatível com Windows.' };
    }

    try {
      const startupFolder = this.getStartupFolderPath();
      if (!fs.existsSync(startupFolder)) {
        fs.mkdirSync(startupFolder, { recursive: true });
      }

      // Identifica o caminho do executável ou script em execução
      const execPath = process.execPath;
      const scriptPath = process.argv[1] || '';

      let targetCmd = '';
      if (execPath.toLowerCase().endsWith('node.exe') && scriptPath) {
        targetCmd = `"${execPath}" "${scriptPath}"`;
      } else {
        targetCmd = `"${execPath}"`;
      }

      // Cria um lançador VBS silencioso (executa em background sem janela preta do cmd)
      const vbsContent = [
        'Set WshShell = CreateObject("WScript.Shell")',
        `WshShell.Run """${targetCmd.replace(/"/g, '""')}""", 0, False`
      ].join('\r\n');

      const vbsPath = this.getVbsPath();
      fs.writeFileSync(vbsPath, vbsContent, 'utf-8');

      // Também registra na chave do Registro Windows (HKCU Run) para máxima confiabilidade
      try {
        const regCmd = `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "CardapPrintAgent" /t REG_SZ /d "wscript.exe \\"${vbsPath}\\"" /f`;
        execSync(regCmd, { stdio: 'ignore' });
      } catch {}

      console.log(`[WindowsStartup] ✅ Inicialização com o Windows configurada em: ${vbsPath}`);
      return {
        success: true,
        message: 'Inicialização automática com o Windows ativada com sucesso! O agente iniciará sozinho ao ligar o computador.'
      };
    } catch (err: any) {
      console.error('[WindowsStartup] Erro ao ativar inicialização automática:', err);
      return {
        success: false,
        message: `Falha ao configurar inicialização automática: ${err.message}`
      };
    }
  }

  public static disable(): { success: boolean; message: string } {
    if (process.platform !== 'win32') {
      return { success: true, message: 'Desativado.' };
    }

    try {
      const vbsPath = this.getVbsPath();
      const batPath = this.getBatPath();

      if (vbsPath && fs.existsSync(vbsPath)) {
        fs.unlinkSync(vbsPath);
      }
      if (batPath && fs.existsSync(batPath)) {
        fs.unlinkSync(batPath);
      }

      try {
        execSync('reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "CardapPrintAgent" /f', {
          stdio: 'ignore'
        });
      } catch {}

      console.log('[WindowsStartup] ⏸️ Inicialização automática com o Windows desativada.');
      return {
        success: true,
        message: 'Inicialização automática desativada com sucesso.'
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Erro ao desativar: ${err.message}`
      };
    }
  }
}
