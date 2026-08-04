import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DiscordRoleService {
  private readonly logger = new Logger(DiscordRoleService.name);
  private readonly base = 'https://discord.com/api/v10';

  constructor(private config: ConfigService) {}

  private async addRole(discordUserId: string, roleId: string): Promise<void> {
    const token   = this.config.get<string>('discord.botToken');
    const guildId = this.config.get<string>('discord.ngGuildId');
    if (!token || !guildId || !roleId || !discordUserId) return;

    const res = await fetch(
      `${this.base}/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`,
      { method: 'PUT', headers: { Authorization: `Bot ${token}`, 'Content-Length': '0' } },
    );

    if (res.ok || res.status === 204) {
      this.logger.log(`Role ${roleId} assigned to Discord user ${discordUserId}`);
    } else {
      const body = await res.text();
      this.logger.warn(`Failed to assign role ${roleId} to ${discordUserId}: ${res.status} ${body}`);
    }
  }

  // Rôle attribué à la connexion Discord (toujours)
  async assignDiscordLinkedRole(discordUserId: string): Promise<void> {
    const roleId = this.config.get<string>('discord.ngRoleDiscord');
    await this.addRole(discordUserId, roleId!).catch(err =>
      this.logger.error(`assignDiscordLinkedRole error: ${err}`),
    );
  }

  // Rôle attribué à l'achat (ou à la connexion Discord si licence déjà active)
  async assignNgLicensedRole(discordUserId: string): Promise<void> {
    const roleId = this.config.get<string>('discord.ngRoleLicensed');
    await this.addRole(discordUserId, roleId!).catch(err =>
      this.logger.error(`assignNgLicensedRole error: ${err}`),
    );
  }
}
