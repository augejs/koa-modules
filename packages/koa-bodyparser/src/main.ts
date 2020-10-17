import { IScanNode } from '@augejs/module-core';
import { MiddlewareFactory } from '@augejs/koa';
import bodyparser, { Options } from 'koa-bodyparser';

// https://github.com/koajs/bodyparser

export const ConfigName = 'bodyparser';

export function KoaBodyParserMiddleware(opts?: Options | Function): ClassDecorator & MethodDecorator {
  return MiddlewareFactory(async (scanNode: IScanNode) => {
    if (typeof opts === 'function') {
      opts = await opts(scanNode);
    }

    return bodyparser({
      ...scanNode.context.rootScanNode!.getConfig(ConfigName),
      ...scanNode.getConfig(ConfigName),
      ...opts
    });
  });
}
