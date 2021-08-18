import crypto from 'crypto';
import ms from "ms";
import { Commands } from "@augejs/redis";

export interface StepData {

  readonly token: string
  readonly createAt: number
  readonly updateAt: number
  readonly sessionName: string;

  maxAge: number
  steps: string[] | null

  pushStep(step: string): void;
  popStep(): string | null;
  getCurrentStep(): string | null
  hasNextStep():boolean;
  
  set(key: string, val: unknown): void
  get<T=unknown>(key: string): T
  
  toJSON(): Record<string, unknown>
  active(): Promise<void>
  commit(): void
  save(force?: boolean): Promise<void> 
  delete(): Promise<void>
}

export class StepDataImpl implements StepData {
  static create(redis: Commands, sessionName: string, maxAge: string | number, props?: Record<string, unknown>): StepData {
    const maxAgeNum = typeof maxAge === 'string' ? ms(maxAge) : maxAge;
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(32).toString('hex');
    const token = crypto.createHash('md5').update(`${nonce}-${timestamp}`).digest('hex');

    const stepData = new StepDataImpl(redis, {
      ...props,
      steps: props?.steps ?? [],
      token,
      maxAge: maxAgeNum,
      sessionName,
      nonce,
      createAt: timestamp,
      updateAt: timestamp,
    });

    return stepData;
  }

  static async find(redis: Commands, sessionToken: string): Promise<StepData | null> {
    const jsonResultStr = await redis.get(sessionToken);
    if (!jsonResultStr) {
      return null;
    }

    try {
      return new StepDataImpl(redis, JSON.parse(jsonResultStr));
    } catch (err) {
      return null;
    }
  }

  static async delete(redis: Commands, stepToken: string): Promise<void> {
    await redis.del(stepToken);
  }

  private redis: Commands;
  private redisKey: string;

  private dataDirty = false;
  private data: Record<string, unknown> = {};

  private constructor(redis: Commands, data: Record<string, unknown>) {
    Object.assign(this.data, data);
    this.redis = redis;
    this.redisKey = this.token;
    this.dataDirty = true;
  }

  get token(): string {
    return this.get<string>("token") ?? "";
  }

  get createAt(): number {
    return this.get<number>("createAt") ?? 0;
  }

  get updateAt(): number {
    return this.get<number>("updateAt") ?? 0;
  }

  get maxAge(): number {
    return this.get<number>("maxAge") ?? 0;
  }

  set maxAge(val: number) {
    this.set("maxAge", val);
  }

  setMaxAge(maxAge: string | number): void {
    this.set("maxAge", typeof maxAge === 'string' ? ms(maxAge) : maxAge);
  }

  get steps(): string[] | null {
    return this.get<string[] | null>('steps') ?? null;
  }

  set steps(val: string[] | null) {
    this.set('steps', val);
  }

  pushStep(step: string): void {
    const steps = this.get<string[] | null>('steps') ?? [];
    steps.unshift(step);
    this.set('steps', steps);
  }

  popStep(): string | null {
    const steps = this.get<string[] | null>('steps');
    if (!steps) return null;
    const popVa = steps.shift() ?? null;
    this.set('steps', steps);
    return popVa;
  }

  getCurrentStep(): string | null {
    const steps = this.get<string[] | null>('steps');
    if (!steps) return null;
    if (steps.length > 0) return steps[0];
    return null;
  }

  hasNextStep():boolean {
    const steps = this.get<string[] | null>('steps');
    if (!steps) return false;
    return steps.length > 0;
  }

  get sessionName(): string {
    return this.get<string>("sessionName") ?? "";
  }

  set(key: string, val: unknown): void {
    if (this.data[key] === val) return;

    if (val === undefined) {
      delete this.data[key];
    } else {
      this.data[key] = val;
    }
    
    this.dataDirty = true;
  }

  get<T=unknown>(key: string): T {
    return this.data[key] as T;
  }

  toJSON(): Record<string, unknown> {
    const results: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(this.data)) {
      if (key.startsWith('_')) continue;
      results[key] = value;
    }
    return results;
  }

  async active(): Promise<void> {
    await this.redis.pexpire(this.redisKey, this.maxAge);
  }

  commit(): void {
    if (this.dataDirty) {
      this.data.updateAt = Date.now();
    }
  }

  async save(force?: boolean): Promise<void> {
    if (!force && !this.dataDirty) {
      return;
    }
    await this.redis.set(this.redisKey, JSON.stringify(this.toJSON()), 'PX', this.maxAge);
    this.dataDirty = false;
  }

  async delete(): Promise<void> {
    await this.redis.del(this.redisKey);
  }
}
