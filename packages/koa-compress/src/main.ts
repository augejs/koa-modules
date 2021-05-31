import { ScanNode } from '@augejs/core';
import { MiddlewareFactory } from '@augejs/koa';
import compress, {CompressOptions} from 'koa-compress';

export const ConfigName = 'compress';

export function KoaCompressMiddleware(opts?: CompressOptions | CallableFunction): ClassDecorator & MethodDecorator {
  return MiddlewareFactory(async (scanNode: ScanNode) => {
    if (typeof opts === 'function') {
      opts = await opts(scanNode);
    }

    return compress({
      ...scanNode.context.rootScanNode!.getConfig(ConfigName),
      ...scanNode.getConfig(ConfigName),
      ...opts
    });
  });
}
