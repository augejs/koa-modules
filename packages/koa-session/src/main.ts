import session from 'koa-session';
import { MiddlewareFactory, KOA_WEB_SERVER_IDENTIFIER, KoaApplication } from '@augejs/koa';

import {
  ScanNode
} from '@augejs/core';

export const ConfigName = 'session';

// // https://github.com/koajs/session
export function KoaSessionMiddleWare(opts?: session.opts | CallableFunction): ClassDecorator & MethodDecorator {
  return MiddlewareFactory(async (scanNode: ScanNode) => {
    if (typeof opts === 'function') {
      opts = await opts(scanNode);
    }

    const application = scanNode.context.container.get<KoaApplication>(KOA_WEB_SERVER_IDENTIFIER);
  
    return session({
      ...scanNode.context.rootScanNode!.getConfig(ConfigName),
      ...scanNode.getConfig(ConfigName),
      ...opts
    }, application);
  }) 
}
