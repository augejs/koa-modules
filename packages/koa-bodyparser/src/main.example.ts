import { 
  ILogger, 
  boot, 
  GetLogger, 
  Value,
  Module,
} from '@augejs/module-core';

import {
  KoaWebServer,
  Prefix, 
  RequestMapping,
  RequestParams,
  } from '@augejs/koa';

import { KoaBodyParserMiddleware } from './main'
  
import { Context } from 'koa';

@Prefix('/module1')
@KoaBodyParserMiddleware()
@Module()
class Module1 {

  @GetLogger()
  logger!:ILogger;

  @RequestMapping()
  async bodyParse(@RequestParams.Context() context: Context) {
    this.logger.info(`bodyParse`);

    return '---';
  }

  @RequestMapping()
  async bodyParse2(@RequestParams.Context() context: Context) {
    this.logger.info(`bodyParse2`);

    return '---';
  }
}

@Prefix('/module2')
@Module()
class Module2 {

  @GetLogger()
  logger!:ILogger;

  @KoaBodyParserMiddleware()
  @RequestMapping()
  async bodyParse(@RequestParams.Context() context: Context) {
    this.logger.info(`bodyParse`);

    return '---';
  }

  @RequestMapping()
  async bodyParse2(@RequestParams.Context() context: Context) {
    this.logger.info(`bodyParse2`);

    return '---';
  }
}

@KoaWebServer()
@Module({
  subModules: [
    Module1,
    Module2,
  ]
})
class AppModule {

  @GetLogger()
  logger!:ILogger;

  @Value('/')
  globalConfig!:object;

  async onInit() {
    this.logger.info('app on onInit');
  }

  async onAppWillReady() {
    this.logger.info('app on onAppWillReady');
  }

  async onAppDidReady() {
    this.logger.info('app on onAppDidReady');
  }
}

async function main() {
    await boot(AppModule);
}

main();
