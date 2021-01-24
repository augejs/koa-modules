import { IScanNode } from '@augejs/core';
import { MiddlewareFactory } from '@augejs/koa';
import multer, { Options, Field } from 'koa-multer';

export const ConfigName = 'multer';

// https://github.com/expressjs/multer
export function KoaMulterSingleMiddleware(fieldName?: string, opts?: Options | Function): MethodDecorator {
  return MiddlewareFactory(async (scanNode: IScanNode) => {
    if (typeof opts === 'function') {
      opts = await opts(scanNode);
    }

    return multer({
      ...scanNode.context.rootScanNode!.getConfig(ConfigName),
      ...scanNode.getConfig(ConfigName),
      ...opts
    }).single(fieldName);
  });
}

export function KoaMulterArrayMiddleware(fieldName: string, maxCount?: number, opts?: Options | Function): MethodDecorator {
  return MiddlewareFactory(async (scanNode: IScanNode) => {
    if (typeof opts === 'function') {
      opts = await opts(scanNode);
    }

    return multer({
      ...scanNode.context.rootScanNode!.getConfig(ConfigName),
      ...scanNode.getConfig(ConfigName),
      ...opts
    }).array(fieldName, maxCount);
  });
}

export function KoaMulterFieldsMiddleware(fields: Field[], opts?: Options | Function): MethodDecorator {
  return MiddlewareFactory(async (scanNode: IScanNode) => {
    if (typeof opts === 'function') {
      opts = await opts(scanNode);
    }

    return multer({
      ...scanNode.context.rootScanNode!.getConfig(ConfigName),
      ...scanNode.getConfig(ConfigName),
      ...opts
    }).fields(fields);
  });
}

export function KoaMulterAnyMiddleware(opts?: Options | Function): MethodDecorator {
  return MiddlewareFactory(async (scanNode: IScanNode) => {
    if (typeof opts === 'function') {
      opts = await opts(scanNode);
    }

    return multer({
      ...scanNode.context.rootScanNode!.getConfig(ConfigName),
      ...scanNode.getConfig(ConfigName),
      ...opts
    }).any()
  });
}


