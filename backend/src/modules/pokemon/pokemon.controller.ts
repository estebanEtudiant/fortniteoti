import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PokemonService } from './pokemon.service';
import {
  CreatePokemonProductDto, UpdatePokemonProductDto,
  UpdatePokemonSettingsDto, UpdatePokemonOrderDto,
} from './pokemon.dto';
import { AdminAuthGuard, CustomerAuthGuard } from '../../common/guards/auth.guard';

@ApiTags('pokemon')
@Controller('pokemon')
export class PokemonController {
  constructor(private readonly pokemon: PokemonService) {}

  // ─────────── Public (page /pokemon) ───────────
  @Get('products')
  getPublicProducts() {
    return this.pokemon.publicProducts();
  }

  @Get('settings')
  getPublicSettings() {
    return this.pokemon.getPublicSettings();
  }

  // ─────────── Client connecté : mes commandes ───────────
  @Get('orders')
  @UseGuards(CustomerAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mes commandes de kits Pokemon' })
  getMyOrders(@Req() req: Request) {
    const { customerId } = (req as any).customer;
    return this.pokemon.listCustomerOrders(customerId);
  }

  // ─────────── Admin: Réglages ───────────
  @Get('admin/settings')
  @UseGuards(AdminAuthGuard)
  getSettings() {
    return this.pokemon.getSettings();
  }

  @Patch('admin/settings')
  @UseGuards(AdminAuthGuard)
  updateSettings(@Body() dto: UpdatePokemonSettingsDto) {
    return this.pokemon.updateSettings(dto);
  }

  // ─────────── Admin: Produits ───────────
  @Get('admin/products')
  @UseGuards(AdminAuthGuard)
  listProducts() {
    return this.pokemon.listProducts();
  }

  @Post('admin/products')
  @UseGuards(AdminAuthGuard)
  createProduct(@Body() dto: CreatePokemonProductDto) {
    return this.pokemon.createProduct(dto);
  }

  @Patch('admin/products/:id')
  @UseGuards(AdminAuthGuard)
  updateProduct(@Param('id') id: string, @Body() dto: UpdatePokemonProductDto) {
    return this.pokemon.updateProduct(id, dto);
  }

  @Delete('admin/products/:id')
  @UseGuards(AdminAuthGuard)
  deleteProduct(@Param('id') id: string) {
    return this.pokemon.deleteProduct(id);
  }

  // ─────────── Admin: Commandes (préparation / expédition) ───────────
  @Get('admin/orders')
  @UseGuards(AdminAuthGuard)
  listOrders(@Query('status') status?: string) {
    return this.pokemon.listOrders(status);
  }

  @Patch('admin/orders/:id')
  @UseGuards(AdminAuthGuard)
  updateOrder(@Param('id') id: string, @Body() dto: UpdatePokemonOrderDto) {
    return this.pokemon.updateOrder(id, dto);
  }
}
