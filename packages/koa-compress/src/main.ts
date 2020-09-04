import { IScanNode } from '@augejs/module-core';
import { MiddlewareFactory } from '@augejs/koa';
import compress, {CompressOptions} from 'koa-compress';

const COMPRESS_IDENTIFIER = 'compress';

export function KoaCompressMiddleware(opts?: CompressOptions | Function): ClassDecorator & MethodDecorator {
  return MiddlewareFactory(async (scanNode: IScanNode) => {
    if (typeof opts === 'function') {
      opts = await opts(scanNode);
    }

    return compress({
      ...scanNode.context.rootScanNode!.getConfig(COMPRESS_IDENTIFIER),
      ...scanNode.getConfig(COMPRESS_IDENTIFIER),
      ...opts
    });
  });
}
