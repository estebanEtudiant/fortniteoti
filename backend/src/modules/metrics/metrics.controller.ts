import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminAuthGuard } from '../../common/guards/auth.guard';
import { MetricsService } from './metrics.service';

@ApiTags('metrics')
@Controller('admin/metrics')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class MetricsController {
  constructor(private metrics: MetricsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Dashboard overview stats' })
  async overview() {
    return this.metrics.getOverview();
  }

  @Get('mrr')
  @ApiOperation({ summary: 'Monthly recurring revenue (30-day rolling)' })
  async mrr(@Query('days') days?: string) {
    return this.metrics.getMrr(Math.min(90, parseInt(days || '30') || 30));
  }

  @Get('dau')
  @ApiOperation({ summary: 'Daily active users' })
  async dau(@Query('days') days?: string, @Query('productId') productId?: string) {
    return this.metrics.getDau(Math.min(90, parseInt(days || '30') || 30), productId);
  }

  @Get('errors')
  @ApiOperation({ summary: 'Error breakdown' })
  async errors(@Query('hours') hours?: string) {
    return this.metrics.getErrors(Math.min(168, parseInt(hours || '24') || 24));
  }

  @Get('top-users')
  @ApiOperation({ summary: 'Top users by activity' })
  async topUsers(@Query('limit') limit?: string, @Query('days') days?: string) {
    return this.metrics.getTopUsers(
      Math.min(100, parseInt(limit || '20') || 20),
      Math.min(90, parseInt(days || '7') || 7),
    );
  }

  @Get('signups-cancels')
  @ApiOperation({ summary: 'Signups vs cancels' })
  async signupsCancels(@Query('days') days?: string) {
    return this.metrics.getSignupsCancels(Math.min(90, parseInt(days || '14') || 14));
  }
}
