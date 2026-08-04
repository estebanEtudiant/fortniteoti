import {
  Controller, Post, Get, Put, Delete, Body, Req, Res, UseGuards,
  HttpCode, HttpStatus, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CustomerService } from './customer.service';
import { ForumService } from '../forum/forum.service';
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
  constructor(
    private readonly customerService: CustomerService,
    private readonly forum: ForumService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RateLimitGuard)
  @RateLimit({ max: 5, window: 300, keyPrefix: 'customer-register' })
  @ApiOperation({ summary: 'Register a new customer account' })
  async register(@Body() dto: RegisterCustomerDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.customerService.register(dto);
    await this.forum.setSessionCookie(res, result.customer);
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ max: 10, window: 60, keyPrefix: 'customer-login' })
  @ApiOperation({ summary: 'Customer login' })
  async login(@Body() dto: LoginCustomerDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.customerService.login(dto);
    await this.forum.setSessionCookie(res, result.customer);
    return result;
  }

  @Post('forum-sso')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh forum SSO cookie for logged-in customer' })
  async refreshForumSso(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { customerId } = (req as any).customer;
    const profile = await this.customerService.getProfile(customerId);
    await this.forum.setSessionCookie(res, {
      id: profile.id,
      username: profile.username,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
    });
    return { success: true };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear forum SSO cookie' })
  logout(@Res({ passthrough: true }) res: Response) {
    this.forum.clearSessionCookie(res);
    return { success: true };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ max: 3, window: 300, keyPrefix: 'forgot-password' })
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.customerService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @RateLimit({ max: 5, window: 300, keyPrefix: 'reset-password' })
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.customerService.resetPassword(dto);
  }

  @Get('profile')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get customer profile with orders and licenses' })
  async getProfile(@Req() req: Request) {
    const { customerId } = (req as any).customer;
    return this.customerService.getProfile(customerId);
  }

  @Put('profile')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update customer profile' })
  async updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    const { customerId } = (req as any).customer;
    return this.customerService.updateProfile(customerId, dto);
  }

  @Put('password')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password' })
  async changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    const { customerId } = (req as any).customer;
    return this.customerService.changePassword(customerId, dto);
  }

  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with token' })
  async verifyEmail(@Query('token') token: string) {
    return this.customerService.verifyEmail(token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resend verification email' })
  async resendVerification(@Req() req: Request) {
    const { customerId } = (req as any).customer;
    return this.customerService.resendVerification(customerId);
  }

  // ── Discord OAuth ──

  @Get('discord/connect')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Discord OAuth URL to link account' })
  async discordConnect(@Req() req: Request) {
    const { customerId } = (req as any).customer;
    return this.customerService.discordConnectUrl(customerId);
  }

  @Get('discord/callback')
  @ApiOperation({ summary: 'Discord OAuth callback' })
  async discordCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.customerService.discordCallback(code, state);
    return res.redirect(redirectUrl);
  }

  @Delete('discord')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlink Discord account' })
  async discordDisconnect(@Req() req: Request) {
    const { customerId } = (req as any).customer;
    return this.customerService.discordDisconnect(customerId);
  }
}
