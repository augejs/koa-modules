
import helmet from 'koa-helmet';
import { IHelmetConfiguration } from 'helmet'

import { 
  IScanNode
} from '@augejs/module-core';

import { MiddlewareFactory } from '@augejs/koa';

const HELMET_IDENTIFIER = 'helmet';

export function KoaHelmetMiddleware(opts?: IHelmetConfiguration | Function): ClassDecorator & MethodDecorator {
  return MiddlewareFactory(async (scanNode: IScanNode) => {
    if (typeof opts === 'function') {
      opts = await opts(scanNode);
    }

    return helmet({
      ...scanNode.context.rootScanNode!.getConfig(HELMET_IDENTIFIER),
      ...scanNode.getConfig(HELMET_IDENTIFIER),
      ...opts
    });
  });
}
