
import KoaHelmet from 'koa-helmet';
import helmet from 'helmet';

import { 
  IScanNode
} from '@augejs/core';

import { MiddlewareFactory } from '@augejs/koa';

export const ConfigName = 'security';

type HelmetOptions = Required<Parameters<typeof helmet>>[0];

export function KoaSecurityMiddleware(opts?: HelmetOptions | CallableFunction): ClassDecorator & MethodDecorator {
  return MiddlewareFactory(async (scanNode: IScanNode) => {
    if (typeof opts === 'function') {
      opts = await opts(scanNode);
    }

    return KoaHelmet({
      ...scanNode.context.rootScanNode!.getConfig(ConfigName),
      ...scanNode.getConfig(ConfigName),
      ...opts
    });
  });
}
