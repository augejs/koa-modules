import session from 'koa-session';
import { MiddlewareFactory, KOA_WEB_SERVER_IDENTIFIER, IKoaApplication } from '@augejs/koa';

import {
  IScanNode
} from '@augejs/module-core';

const SESSION_IDENTIFIER = 'session';

// // https://github.com/koajs/session
export function KoaSessionMiddleWare(opts?: session.opts | Function): ClassDecorator & MethodDecorator {
  return MiddlewareFactory(async (scanNode: IScanNode) => {
    if (typeof opts === 'function') {
      opts = await opts(scanNode);
    }

    const application: IKoaApplication = scanNode.context.container.get<IKoaApplication>(KOA_WEB_SERVER_IDENTIFIER);
  
    return session({
      ...scanNode.context.rootScanNode!.getConfig(SESSION_IDENTIFIER),
      ...scanNode.getConfig(SESSION_IDENTIFIER),
      ...opts
    }, application);
  }) 
}
