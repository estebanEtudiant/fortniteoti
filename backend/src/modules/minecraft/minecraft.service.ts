import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { Rcon } from 'rcon-client';

const execFileAsync = promisify(execFile);

function execFileWithInput(file: string, args: string[], input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile(file, args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout);
    });
    child.stdin!.end(input);
  });
}

const PLAYER_NAME_RE = /^[A-Za-z0-9_]{1,16}$/;

const EDITABLE_PROPERTIES = [
  'motd', 'max-players', 'difficulty', 'gamemode', 'pvp', 'white-list',
  'view-distance', 'simulation-distance', 'spawn-protection', 'online-mode',
  'enable-command-block', 'hardcore',
] as const;

type EditableProperty = typeof EDITABLE_PROPERTIES[number];

@Injectable()
export class MinecraftService {
  private readonly logger = new Logger(MinecraftService.name);
  private readonly serviceName: string;
  private readonly dir: string;
  private readonly rconHost: string;
  private readonly rconPort: number;
  private readonly rconPassword: string;
  private readonly allocatedRamMb: number;
  private readonly hostPublic: string;
  private readonly port: number;

  constructor(private config: ConfigService) {
    this.serviceName = this.config.get<string>('minecraft.serviceName')!;
    this.dir = this.config.get<string>('minecraft.dir')!;
    this.rconHost = this.config.get<string>('minecraft.rconHost')!;
    this.rconPort = this.config.get<number>('minecraft.rconPort')!;
    this.rconPassword = this.config.get<string>('minecraft.rconPassword')!;
    this.allocatedRamMb = this.config.get<number>('minecraft.allocatedRamMb')!;
    this.hostPublic = this.config.get<string>('minecraft.hostPublic')!;
    this.port = this.config.get<number>('minecraft.port')!;
  }

  // ── low-level helpers ──

  private async sudo(args: string[]): Promise<string> {
    const { stdout } = await execFileAsync('sudo', ['-n', ...args], { maxBuffer: 10 * 1024 * 1024 });
    return stdout;
  }

  private async withRcon<T>(fn: (rcon: Rcon) => Promise<T>): Promise<T> {
    const rcon = await Rcon.connect({
      host: this.rconHost, port: this.rconPort, password: this.rconPassword,
      timeout: 5000,
    });
    try {
      return await fn(rcon);
    } finally {
      rcon.end();
    }
  }

  private assertPlayerName(name: string) {
    if (!PLAYER_NAME_RE.test(name)) {
      throw new BadRequestException('Pseudo Minecraft invalide (1-16 caractères alphanumériques ou _)');
    }
  }

  // ── status ──

  async getStatus() {
    let active = false;
    let uptimeSeconds: number | null = null;
    let memoryUsedMb: number | null = null;

    try {
      const { stdout } = await execFileAsync('systemctl', [
        'show', this.serviceName, '--no-page', '-p',
        'ActiveState,ActiveEnterTimestamp,MemoryCurrent',
      ]);
      const props: Record<string, string> = {};
      for (const line of stdout.trim().split('\n')) {
        const idx = line.indexOf('=');
        if (idx === -1) continue;
        props[line.slice(0, idx)] = line.slice(idx + 1);
      }
      active = props.ActiveState === 'active';
      if (active && props.ActiveEnterTimestamp) {
        const started = new Date(props.ActiveEnterTimestamp).getTime();
        if (!isNaN(started)) uptimeSeconds = Math.max(0, Math.floor((Date.now() - started) / 1000));
      }
      if (props.MemoryCurrent && props.MemoryCurrent !== '[not set]') {
        memoryUsedMb = Math.round(parseInt(props.MemoryCurrent, 10) / 1024 / 1024);
      }
    } catch (err) {
      this.logger.warn(`getStatus systemctl show failed: ${(err as Error).message}`);
    }

    let players: { online: number; max: number; names: string[] } | null = null;
    if (active) {
      try {
        players = await this.getPlayers();
      } catch {
        // server may still be starting up, RCON not ready yet
      }
    }

    let worldSizeMb: number | null = null;
    try {
      const out = await this.sudo(['/usr/bin/du', '-sh', `${this.dir}/world`]);
      const match = out.match(/^([\d.]+)([KMGT])/);
      if (match) {
        const num = parseFloat(match[1]);
        const unit = match[2];
        worldSizeMb = unit === 'G' ? num * 1024 : unit === 'K' ? num / 1024 : unit === 'T' ? num * 1024 * 1024 : num;
        worldSizeMb = Math.round(worldSizeMb);
      }
    } catch {
      // ignore, informational only
    }

    return {
      active,
      uptimeSeconds,
      memoryUsedMb,
      memoryAllocatedMb: this.allocatedRamMb,
      worldSizeMb,
      players,
      connect: `${this.hostPublic}:${this.port}`,
    };
  }

  // ── power actions ──

  async start() {
    await this.sudo(['/usr/bin/systemctl', 'start', this.serviceName]);
    return { ok: true };
  }

  async stop() {
    await this.sudo(['/usr/bin/systemctl', 'stop', this.serviceName]);
    return { ok: true };
  }

  async restart() {
    await this.sudo(['/usr/bin/systemctl', 'restart', this.serviceName]);
    return { ok: true };
  }

  // ── logs ──

  async getLogs() {
    const out = await this.sudo([
      '/usr/bin/journalctl', '-u', this.serviceName, '-n', '300', '--no-pager', '-o', 'cat',
    ]);
    return { lines: out.split('\n').filter((_, i, arr) => !(i === arr.length - 1 && arr[i] === '')) };
  }

  // ── players (RCON) ──

  async getPlayers() {
    const raw = await this.withRcon(rcon => rcon.send('list'));
    // "There are 2 of a max of 10 players online: Steve, Alex"
    const countMatch = raw.match(/There are (\d+) of a max(?: of)? (\d+) players online/);
    const online = countMatch ? parseInt(countMatch[1], 10) : 0;
    const max = countMatch ? parseInt(countMatch[2], 10) : 0;
    const namesPart = raw.split(':')[1];
    const names = namesPart ? namesPart.split(',').map(s => s.trim()).filter(Boolean) : [];
    return { online, max, names };
  }

  async kickPlayer(name: string, reason?: string) {
    this.assertPlayerName(name);
    const cmd = reason ? `kick ${name} ${reason}` : `kick ${name}`;
    const result = await this.withRcon(rcon => rcon.send(cmd));
    return { ok: true, result };
  }

  async broadcast(message: string) {
    if (!message || message.length > 256) {
      throw new BadRequestException('Message invalide (1-256 caractères)');
    }
    const result = await this.withRcon(rcon => rcon.send(`say ${message}`));
    return { ok: true, result };
  }

  async saveAll() {
    const result = await this.withRcon(rcon => rcon.send('save-all'));
    return { ok: true, result };
  }

  async sendCommand(command: string) {
    if (!command || command.length > 512) {
      throw new BadRequestException('Commande invalide');
    }
    const result = await this.withRcon(rcon => rcon.send(command));
    return { ok: true, result };
  }

  // ── whitelist / ops (RCON + JSON read) ──

  async getWhitelist() {
    const out = await this.sudo(['/usr/bin/cat', `${this.dir}/whitelist.json`]);
    return JSON.parse(out || '[]') as { uuid: string; name: string }[];
  }

  async addWhitelist(name: string) {
    this.assertPlayerName(name);
    const result = await this.withRcon(rcon => rcon.send(`whitelist add ${name}`));
    return { ok: true, result };
  }

  async removeWhitelist(name: string) {
    this.assertPlayerName(name);
    const result = await this.withRcon(rcon => rcon.send(`whitelist remove ${name}`));
    return { ok: true, result };
  }

  async toggleWhitelistEnforcement(enabled: boolean) {
    const result = await this.withRcon(rcon => rcon.send(`whitelist ${enabled ? 'on' : 'off'}`));
    return { ok: true, result };
  }

  async getOps() {
    const out = await this.sudo(['/usr/bin/cat', `${this.dir}/ops.json`]);
    return JSON.parse(out || '[]') as { uuid: string; name: string; level: number }[];
  }

  async addOp(name: string) {
    this.assertPlayerName(name);
    const result = await this.withRcon(rcon => rcon.send(`op ${name}`));
    return { ok: true, result };
  }

  async removeOp(name: string) {
    this.assertPlayerName(name);
    const result = await this.withRcon(rcon => rcon.send(`deop ${name}`));
    return { ok: true, result };
  }

  async getBanned() {
    const out = await this.sudo(['/usr/bin/cat', `${this.dir}/banned-players.json`]);
    return JSON.parse(out || '[]') as { uuid: string; name: string; reason: string; created: string }[];
  }

  async banPlayer(name: string, reason?: string) {
    this.assertPlayerName(name);
    const cmd = reason ? `ban ${name} ${reason}` : `ban ${name}`;
    const result = await this.withRcon(rcon => rcon.send(cmd));
    return { ok: true, result };
  }

  async pardonPlayer(name: string) {
    this.assertPlayerName(name);
    const result = await this.withRcon(rcon => rcon.send(`pardon ${name}`));
    return { ok: true, result };
  }

  // ── server.properties ──

  async getProperties() {
    const out = await this.sudo(['/usr/bin/cat', `${this.dir}/server.properties`]);
    const values: Record<string, string> = {};
    for (const line of out.split('\n')) {
      if (!line || line.startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx === -1) continue;
      const key = line.slice(0, idx);
      if ((EDITABLE_PROPERTIES as readonly string[]).includes(key)) {
        values[key] = line.slice(idx + 1);
      }
    }
    return values;
  }

  async updateProperties(patch: Partial<Record<EditableProperty, string>>) {
    const keys = Object.keys(patch);
    for (const key of keys) {
      if (!(EDITABLE_PROPERTIES as readonly string[]).includes(key)) {
        throw new BadRequestException(`Propriété non autorisée: ${key}`);
      }
    }

    const current = await this.sudo(['/usr/bin/cat', `${this.dir}/server.properties`]);
    const lines = current.split('\n');
    const seen = new Set<string>();

    const updated = lines.map(line => {
      if (!line || line.startsWith('#')) return line;
      const idx = line.indexOf('=');
      if (idx === -1) return line;
      const key = line.slice(0, idx);
      if (key in patch) {
        seen.add(key);
        return `${key}=${patch[key as EditableProperty]}`;
      }
      return line;
    });

    for (const key of keys) {
      if (!seen.has(key)) updated.push(`${key}=${patch[key as EditableProperty]}`);
    }

    const content = updated.join('\n');
    await execFileWithInput('sudo', ['-n', '/usr/bin/tee', `${this.dir}/server.properties`], content);

    return this.getProperties();
  }
}
