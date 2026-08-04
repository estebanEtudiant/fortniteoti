import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../customer/mail.service';
import {
  CreatePokemonProductDto, UpdatePokemonProductDto,
  UpdatePokemonSettingsDto, UpdatePokemonOrderDto,
} from './pokemon.dto';
import { PokemonProduct, PokemonOrderStatus } from '@prisma/client';

@Injectable()
export class PokemonService {
  constructor(private prisma: PrismaService, private mail: MailService) {}

  // ─────────────── Shapes publiques (consommées par la page /pokemon) ───────────────
  private productToPublic(p: PokemonProduct) {
    return {
      id: p.slug,
      name: { fr: p.nameFr, en: p.nameEn },
      description: { fr: p.descriptionFr, en: p.descriptionEn },
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      images: p.images || [],
      includes: { fr: p.includesFr, en: p.includesEn },
      inStock: p.stock > 0,
      stock: p.stock,
      featured: p.featured,
    };
  }

  async publicProducts() {
    const products = await this.prisma.pokemonProduct.findMany({
      where: { visible: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    return products.map((p) => this.productToPublic(p));
  }

  async getPublicSettings() {
    const s = await this.getOrCreateSettings();
    return {
      heroImage: s.heroImage,
      freeShippingThresholdCents: s.freeShippingThresholdCents,
      flatShippingCents: s.flatShippingCents,
      allowedCountries: s.allowedCountries,
    };
  }

  // ─────────────── Réglages (livraison, hero) ───────────────
  private async getOrCreateSettings() {
    return this.prisma.pokemonSetting.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
  }

  async getSettings() {
    return this.getOrCreateSettings();
  }

  async updateSettings(dto: UpdatePokemonSettingsDto) {
    await this.getOrCreateSettings();
    return this.prisma.pokemonSetting.update({
      where: { id: 1 },
      data: { ...dto },
    });
  }

  // ─────────────── Admin: Produits CRUD ───────────────
  async listProducts() {
    return this.prisma.pokemonProduct.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createProduct(dto: CreatePokemonProductDto) {
    return this.prisma.pokemonProduct.create({
      data: {
        slug: dto.slug,
        nameFr: dto.nameFr,
        nameEn: dto.nameEn,
        descriptionFr: dto.descriptionFr ?? '',
        descriptionEn: dto.descriptionEn ?? '',
        price: dto.price,
        compareAtPrice: dto.compareAtPrice,
        images: dto.images ?? [],
        includesFr: dto.includesFr ?? [],
        includesEn: dto.includesEn ?? [],
        stock: dto.stock ?? 0,
        sku: dto.sku ?? '',
        featured: dto.featured ?? false,
        order: dto.order ?? 0,
        visible: dto.visible ?? true,
      },
    });
  }

  async updateProduct(id: string, dto: UpdatePokemonProductDto) {
    await this.getProductOrThrow(id);
    return this.prisma.pokemonProduct.update({ where: { id }, data: { ...dto } });
  }

  async deleteProduct(id: string) {
    await this.getProductOrThrow(id);
    await this.prisma.pokemonProduct.delete({ where: { id } });
    return { deleted: true };
  }

  private async getProductOrThrow(id: string) {
    const p = await this.prisma.pokemonProduct.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Produit introuvable');
    return p;
  }

  // ─────────────── Commandes : client (les siennes) ───────────────
  async listCustomerOrders(customerId: string) {
    return this.prisma.pokemonOrder.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─────────────── Commandes : admin (file de préparation/expédition) ───────────────
  async listOrders(status?: string) {
    return this.prisma.pokemonOrder.findMany({
      where: status ? { status: status as PokemonOrderStatus } : undefined,
      include: { customer: { select: { email: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateOrder(id: string, dto: UpdatePokemonOrderDto) {
    const order = await this.prisma.pokemonOrder.findUnique({ where: { id }, include: { customer: true } });
    if (!order) throw new NotFoundException('Commande introuvable');

    if (dto.status === 'SHIPPED' && !dto.trackingNumber && !order.trackingNumber) {
      throw new BadRequestException('Un numéro de suivi est requis pour marquer une commande comme expédiée');
    }

    const data: any = { ...dto };
    if (dto.status === 'SHIPPED' && order.status !== 'SHIPPED') data.shippedAt = new Date();
    if (dto.status === 'DELIVERED' && order.status !== 'DELIVERED') data.deliveredAt = new Date();

    const updated = await this.prisma.pokemonOrder.update({ where: { id }, data });

    if (dto.status === 'SHIPPED' && order.status !== 'SHIPPED' && order.customer?.email) {
      this.mail.sendShippingNotice(
        order.customer.email,
        updated.trackingNumber || '',
        updated.trackingUrl || undefined,
        updated.carrier || undefined,
      ).catch(() => {});
    }

    return updated;
  }
}
