import {
  Controller, Post, Get, Put, Body, Req, UseGuards,
  HttpCode, HttpStatus, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { CustomerService } from './customer.service';
import {
  RegisterCustomerDto, LoginCustomerDto,
  UpdateProfileDto, ChangePasswordDto,
  ForgotPasswordDto, ResetPasswordDto,
} from './customer.dto';
import { CustomerAuthGuard } from '../../common/guards/auth.guard';
import { RateLimit, RateLimitGuard } from '../../common/guards/rate-limit.guard';

@ApiTags('customer')
@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  // ── POST /api/v1/customer/register ──
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RateLimitGuard)
  @RateLimit({ max: 5, window: 300, keyPrefix: 'customer-register' })
  @ApiOperation({ summary: 'Register a new customer account' })
  async register(@Body() dto: RegisterCustomerDto) {
    return this.customerService.register(dto);
  }

  // ── POST /api/v1/customer/login ──
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ max: 10, window: 60, keyPrefix: 'customer-login' })
  @ApiOperation({ summary: 'Customer login' })
  async login(@Body() dto: LoginCustomerDto) {
    return this.customerService.login(dto);
  }

  // ── POST /api/v1/customer/forgot-password ──
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.customerService.forgotPassword(dto);
  }

  // ── POST /api/v1/customer/reset-password ──
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.customerService.resetPassword(dto);
  }

  // ── GET /api/v1/customer/profile ──
  @Get('profile')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get customer profile with orders and licenses' })
  async getProfile(@Req() req: Request) {
    const { customerId } = (req as any).customer;
    return this.customerService.getProfile(customerId);
  }

  // ── PUT /api/v1/customer/profile ──
  @Put('profile')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update customer profile' })
  async updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    const { customerId } = (req as any).customer;
    return this.customerService.updateProfile(customerId, dto);
  }

  // ── PUT /api/v1/customer/password ──
  @Put('password')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password' })
  async changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    const { customerId } = (req as any).customer;
    return this.customerService.changePassword(customerId, dto);
  }

  // ── GET /api/v1/customer/verify-email?token= ──
  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with token' })
  async verifyEmail(@Query('token') token: string) {
    return this.customerService.verifyEmail(token);
  }

  // ── POST /api/v1/customer/resend-verification ──
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resend verification email' })
  async resendVerification(@Req() req: Request) {
    const { customerId } = (req as any).customer;
    return this.customerService.resendVerification(customerId);
  }
}
