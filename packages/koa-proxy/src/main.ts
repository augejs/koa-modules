import { IScanNode } from '@augejs/module-core';
import { MiddlewareFactory } from '@augejs/koa';
import proxy, { IKoaProxiesOptions } from 'koa-proxies';

const PROXY_IDENTIFIER = 'proxy';

// https://vagusx.github.io/koa-proxies/
// https://github.com/http-party/node-http-proxy
// 

export function KoaProxyMiddleware(opts?: IKoaProxiesOptions | Function): ClassDecorator & MethodDecorator {
  return MiddlewareFactory(async (scanNode: IScanNode) => {
    if (typeof opts === 'function') {
      opts = await opts(scanNode);
    }

    return proxy('*', {
      ...scanNode.context.rootScanNode!.getConfig(PROXY_IDENTIFIER),
      ...scanNode.getConfig(PROXY_IDENTIFIER),
      ...opts
    });
  });
}
