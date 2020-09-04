import { IScanNode } from '@augejs/module-core';
import { MiddlewareFactory } from '@augejs/koa';
import multer, { Options, Field } from 'koa-multer';

const MULTER_IDENTIFIER = 'multer';

// https://github.com/expressjs/multer
export function KoaMulterSingleMiddleware(fieldName?: string, opts?: Options | Function): MethodDecorator {
  return MiddlewareFactory(async (scanNode: IScanNode) => {
    if (typeof opts === 'function') {
      opts = await opts(scanNode);
    }

    return multer({
      ...scanNode.context.rootScanNode!.getConfig(MULTER_IDENTIFIER),
      ...scanNode.getConfig(MULTER_IDENTIFIER),
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
      ...scanNode.context.rootScanNode!.getConfig(MULTER_IDENTIFIER),
      ...scanNode.getConfig(MULTER_IDENTIFIER),
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
      ...scanNode.context.rootScanNode!.getConfig(MULTER_IDENTIFIER),
      ...scanNode.getConfig(MULTER_IDENTIFIER),
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
      ...scanNode.context.rootScanNode!.getConfig(MULTER_IDENTIFIER),
      ...scanNode.getConfig(MULTER_IDENTIFIER),
      ...opts
    }).any()
  });
}


