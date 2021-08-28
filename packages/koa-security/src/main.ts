
import KoaHelmet from 'koa-helmet';
import helmet from 'helmet';
import cors from 'koa2-cors';

import { 
  ScanNode
} from '@augejs/core';

import { MiddlewareFactory } from '@augejs/koa';

export const ConfigName = 'security';

type HelmetOptions = Required<Parameters<typeof helmet>>[0];
type CorsOptions = {
  cors?: cors.Options
}

type SecurityOptions = HelmetOptions & CorsOptions

export function KoaSecurityMiddleware(opts?: SecurityOptions | CallableFunction): ClassDecorator & MethodDecorator {
  return MiddlewareFactory(async (scanNode: ScanNode) => {
    if (typeof opts === 'function') {
      opts = await opts(scanNode);
    }

    const config: SecurityOptions = {
      ...scanNode.context.rootScanNode!.getConfig(ConfigName),
      ...scanNode.getConfig(ConfigName),
      ...opts
    }

    return [
      cors(config.cors),
      KoaHelmet(config)
    ];
  });
}
