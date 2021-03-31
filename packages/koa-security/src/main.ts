
import helmet from 'koa-helmet';
import { IHelmetConfiguration } from 'helmet'

import { 
  IScanNode
} from '@augejs/core';

import { MiddlewareFactory } from '@augejs/koa';

export const ConfigName = 'security';

export function KoaSecurityMiddleware(opts?: IHelmetConfiguration | CallableFunction): ClassDecorator & MethodDecorator {
  return MiddlewareFactory(async (scanNode: IScanNode) => {
    if (typeof opts === 'function') {
      opts = await opts(scanNode);
    }

    return helmet({
      ...scanNode.context.rootScanNode!.getConfig(ConfigName),
      ...scanNode.getConfig(ConfigName),
      ...opts
    });
  });
}
