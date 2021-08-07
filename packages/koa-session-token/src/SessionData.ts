import crypto from 'crypto';
import ms from "ms";
import { Commands } from "@augejs/redis";

export interface SessionData {

  readonly token: string
  readonly createAt: number
  readonly updateAt: number
  readonly sessionName: string;

  maxAge: number

  setMaxAge(maxAge: string | number): void
  
  set(key: string, val: unknown): void
  get<T=unknown>(key: string): T
  
  toJSON(): Record<string, unknown>
  active(): Promise<void>
  commit(): void
  save(force?: boolean): Promise<void> 
  delete(): Promise<void>
}

export class SessionDataImpl implements SessionData {
  static create(redis: Commands, sessionName: string, maxAge: string | number): SessionData {
    const maxAgeNum = typeof maxAge === 'string' ? ms(maxAge) : maxAge;
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(32).toString('hex');
    const token = crypto.createHash('md5').update(`${nonce}-${timestamp}`).digest('hex');

    const sessionData = new SessionDataImpl(redis, {
      token,
      maxAge: maxAgeNum,
      sessionName,
      nonce,
      createAt: timestamp,
      updateAt: timestamp,
    });

    return sessionData;
  }

  static async find(redis: Commands, sessionToken: string): Promise<SessionData | null> {
    const jsonResultStr = await redis.get(sessionToken);
    if (!jsonResultStr) {
      return null;
    }

    try {
      return new SessionDataImpl(redis, JSON.parse(jsonResultStr));
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
