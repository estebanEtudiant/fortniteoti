import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AffiliateService } from './affiliate.service';

@Injectable()
export class AffiliateCronService {
  private readonly logger = new Logger(AffiliateCronService.name);

  constructor(private aff: AffiliateService) {}

  @Cron('0 3 * * *')
  async dailyAutoApprove() {
    const count = await this.aff.autoApproveConversions();
    if (count > 0) this.logger.log(`Daily auto-approve: ${count} conversions approved`);
  }

  @Cron('0 4 1 * *')
  async monthlyTierRecalc() {
    await this.aff.recalcTiers();
    this.logger.log('Monthly tier recalculation completed');
  }
}
