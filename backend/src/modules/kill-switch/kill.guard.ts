import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { KillService } from './kill.service';

const SLUG_TO_PRODUCT: Record<string, string> = {
  ftnoptimizer: 'FTN_OPTIMIZER',
  ngloader: 'NG_LOADER',
  nglauncher: 'NG_LAUNCHER',
  menoria: 'MENORIA',
  menorialoader: 'MENORIA',
  loader: 'LOADER',
  jre: 'JRE',
  veltharloader: 'VELTHAR_LOADER',
  veltharlauncher: 'VELTHAR_LAUNCHER',
  fortniteclient: 'FORTNITE_CLIENT',
};

@Injectable()
export class KillGuard implements CanActivate {
  constructor(private killService: KillService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const rawProduct =
      req.params?.productId ||
      req.params?.product ||
      req.body?.product ||
      '';

    const normalized = rawProduct.toLowerCase().replace(/[_-]/g, '');
    const productId = SLUG_TO_PRODUCT[normalized] || rawProduct.toUpperCase() || 'FTN_OPTIMIZER';

    const hwid = req.body?.hwid || (req as any).license?.hwid;
    const userId = (req as any).license?.licenseId;

    const kill = await this.killService.isKilled(productId, hwid, userId);
    if (kill) {
      throw new ForbiddenException({
        error: 'SERVICE_SUSPENDED',
        reason: kill.reason,
        scope: kill.scope,
      });
    }

    return true;
  }
}
