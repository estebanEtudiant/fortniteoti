import {
  Controller, Get, Post, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsInt, Min, Max, Matches, IsIn, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { AdminAuthGuard } from '../../common/guards/auth.guard';
import { KernelSymbolsService } from './kernel-symbols.service';

const GUID_RE = /^[0-9A-Fa-f]{32}$/;
const BUILD_RE = /^\d+\.\d+\.\d+\.\d+$/;
const VALID_PDB = new Set(['ntkrnlmp.pdb', 'ntoskrnl.pdb']);

class ResolveDto {
  @IsString() @Matches(/^[0-9A-Fa-f]{32}$/, { message: 'pdbGuid must be 32 hex characters' })
  pdbGuid: string;

  @Type(() => Number) @IsInt() @Min(1) @Max(99)
  age: number;

  @IsString() @IsIn(['ntkrnlmp.pdb', 'ntoskrnl.pdb'])
  pdbName: string;

  @IsString() @Matches(/^\d+\.\d+\.\d+\.\d+$/, { message: 'build must be format x.x.x.x' })
  build: string;
}

class ValidateDto {
  @IsString()
  validatedBy: string;

  @IsOptional() @IsString()
  notes?: string;
}

class UnvalidateDto {
  @IsString()
  reason: string;

  @IsOptional() @IsBoolean()
  wasBsod?: boolean;
}

class ReportBsodDto {
  @IsString() @Matches(/^[0-9A-Fa-f]{32}$/, { message: 'pdbGuid must be 32 hex characters' })
  pdbGuid: string;

  @Type(() => Number) @IsInt() @Min(1) @Max(99)
  age: number;

  @IsOptional() @IsString()
  bugcheckCode?: string;

  @IsOptional() @IsString()
  bugcheckArgs?: string;
}

@ApiTags('symbols')
@Controller('symbols')
export class KernelSymbolsController {
  constructor(private svc: KernelSymbolsService) {}

  @Post('resolve')
  @HttpCode(HttpStatus.OK)
  async resolve(@Body() dto: ResolveDto) {
    if (!dto.pdbGuid || !GUID_RE.test(dto.pdbGuid)) {
      throw new BadRequestException('pdbGuid must be 32 hex characters');
    }
    const age = Number(dto.age);
    if (!Number.isInteger(age) || age < 1 || age > 99) {
      throw new BadRequestException('age must be 1-99');
    }
    if (!dto.pdbName || !VALID_PDB.has(dto.pdbName.toLowerCase())) {
      throw new BadRequestException('pdbName must be ntkrnlmp.pdb or ntoskrnl.pdb');
    }
    if (!dto.build || !BUILD_RE.test(dto.build)) {
      throw new BadRequestException('build must be format x.x.x.x');
    }

    const result = await this.svc.resolve(
      dto.pdbGuid, age, dto.pdbName.toLowerCase(), dto.build,
    );

    if ('error' in result && !result.found) {
      throw new BadRequestException(result.error);
    }

    return result;
  }

  @Post('report-bsod')
  @HttpCode(HttpStatus.OK)
  async reportBsod(@Body() dto: ReportBsodDto) {
    return this.svc.reportBsod(dto.pdbGuid, dto.age, dto.bugcheckCode, dto.bugcheckArgs);
  }
}

@ApiTags('admin/symbols')
@Controller('admin/symbols')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class KernelSymbolsAdminController {
  constructor(private svc: KernelSymbolsService) {}

  @Get('overview')
  async overview() {
    return this.svc.overview();
  }

  @Get('cache')
  async listCache(
    @Query('build') build?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('sortBy') sortBy?: string,
    @Query('order') order?: string,
    @Query('filter') filter?: string,
  ) {
    return this.svc.listCache({
      build, search,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      sortBy, order, filter,
    });
  }

  @Get('pending')
  async listPending() {
    return this.svc.listPending();
  }

  @Get('timeline')
  async timeline(@Query('days') days?: string) {
    return this.svc.timeline(days ? Math.min(90, parseInt(days)) : 30);
  }

  @Post('cache/:id/invalidate')
  @HttpCode(HttpStatus.OK)
  async invalidate(@Param('id') id: string) {
    return this.svc.invalidateCache(id);
  }

  @Delete('extraction/:id')
  async deleteExtraction(@Param('id') id: string) {
    const result = await this.svc.deleteExtraction(id);
    if (!result.ok) throw new BadRequestException(result.error);
    return result;
  }

  @Delete('cache/:id')
  async deleteCacheEntry(@Param('id') id: string) {
    const result = await this.svc.deleteCacheEntry(id);
    if (!result.ok) throw new BadRequestException(result.error);
    return result;
  }

  @Post('extractions/purge-failed')
  @HttpCode(HttpStatus.OK)
  async purgeFailedExtractions(@Query('olderThanMinutes') olderThanMinutes?: string) {
    return this.svc.purgeFailedExtractions(olderThanMinutes ? parseInt(olderThanMinutes) : 60);
  }

  @Post('cache/:id/validate')
  @HttpCode(HttpStatus.OK)
  async validate(@Param('id') id: string, @Body() dto: ValidateDto) {
    const result = await this.svc.validateCache(id, dto.validatedBy, dto.notes);
    if (!result.ok) throw new BadRequestException(result.error);
    return result;
  }

  @Post('cache/:id/unvalidate')
  @HttpCode(HttpStatus.OK)
  async unvalidate(@Param('id') id: string, @Body() dto: UnvalidateDto) {
    const result = await this.svc.unvalidateCache(id, dto.reason, dto.wasBsod);
    if (!result.ok) throw new BadRequestException(result.error);
    return result;
  }
}
