import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Res,
  StreamableFile,
  BadRequestException,
  NotFoundException,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join, resolve } from 'path';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { IsString, IsNotEmpty } from 'class-validator';
import { AdminAuthGuard } from '../../common/guards/auth.guard';
import { SoftwareService } from './software.service';

class UploadDto {
  @IsString() @IsNotEmpty() version: string;
  @IsString() @IsNotEmpty() changelog: string;
}

// __dirname = dist/modules/software/ → 3 niveaux au-dessus = racine backend/
const UPLOAD_DIR = resolve(__dirname, '..', '..', '..', 'uploads', 'software');

const softwareStorage = diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `upload-${unique}${extname(file.originalname)}`);
  },
});

const exeFileFilter = (_req: any, file: any, cb: any) => {
  if (extname(file.originalname).toLowerCase() !== '.exe') {
    return cb(new BadRequestException('Seuls les fichiers .exe sont autorisés'), false);
  }
  cb(null, true);
};

@Controller('software')
export class SoftwareController {
  constructor(private softwareService: SoftwareService) {}

  @Post('upload')
  @UseGuards(AdminAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: softwareStorage,
      fileFilter: exeFileFilter,
      limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
    }),
  )
  async uploadSoftware(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDto,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier fourni');
    return this.softwareService.handleUpload(file, dto.version, dto.changelog);
  }

  // Public endpoint — called by C++ client to check for updates
  @Get('latest')
  async getLatest() {
    const current = await this.softwareService.getCurrentVersion();
    if (!current) throw new NotFoundException('No version available');
    return current;
  }

  @Get('versions')
  @UseGuards(AdminAuthGuard)
  async getVersions() {
    return this.softwareService.getVersions();
  }

  @Get('stats')
  @UseGuards(AdminAuthGuard)
  async getStats() {
    return this.softwareService.getStats();
  }

  @Delete(':version')
  @UseGuards(AdminAuthGuard)
  @HttpCode(204)
  async deleteVersion(@Param('version') version: string) {
    await this.softwareService.deleteVersion(version);
  }

  @Get('download/:filename')
  async downloadFile(
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const filePath = await this.softwareService.incrementDownload(filename);

    const stream = createReadStream(filePath);
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(stream);
  }
}
