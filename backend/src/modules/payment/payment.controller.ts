// ── payment.controller.ts ──
import { Controller, Get, Post, Req, Body, Headers, HttpCode, HttpStatus, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentService } from './payment.service';
import { CustomerAuthGuard } from '../../common/guards/auth.guard';

@ApiTags('payment')
@Controller('payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  // ── GET /api/v1/payment/plans (public) ──
  @Get('plans')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get active plans with prices (public)' })
  async getPlans() {
    return this.paymentService.getActivePlans();
  }

  // ── GET /api/v1/payment/stats (public) ──
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Public stats: active clients this month' })
  async getPublicStats() {
    return this.paymentService.getPublicStats();
  }

  // ── GET /api/v1/payment/validate-promo (public) ──
  @Get('validate-promo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a promo code' })
  async validatePromo(@Query('code') code: string) {
    return this.paymentService.validatePromoCode(code);
  }

  // ── POST /api/v1/payment/confirm ──
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm payment and get license key' })
  async confirmPayment(@Req() req: Request, @Body() body: { sessionId: string }) {
    const { customerId } = (req as any).customer;
    return this.paymentService.confirmPayment(customerId, body.sessionId);
  }

  // ── POST /api/v1/payment/checkout ──
  @Post('checkout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a Stripe Checkout session' })
  async createCheckout(@Req() req: Request, @Body() body: { plan?: string; promoCode?: string }) {
    const { customerId } = (req as any).customer;
    return this.paymentService.createCheckoutSession(customerId, body.plan, body.promoCode);
  }

  // ── POST /api/v1/payment/webhook/stripe ──
  @Post('webhook/stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  async stripeWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    // rawBody is available when NestFactory.create is called with { rawBody: true }
    const rawBody = (req as any).rawBody as Buffer;
    await this.paymentService.handleWebhook(rawBody, signature);
    return { received: true };
  }
}
