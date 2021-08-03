import crypto from 'crypto';
import ms from "ms";
import { Commands } from "@augejs/redis";

const DEFAULT_ACCESS_TOKE_KEY_PREFIX = 'access';

export interface FindAccessDataListByUserIdOpts {
  skipCount?: number,
  incudesCurrent?: boolean,
}

export interface AccessData {
  readonly token: string
  readonly userId: string
  readonly nonce: string
  readonly fingerprint: string
  readonly ip: string
  readonly createAt: number
  readonly updateAt: number
  readonly hasSaved: boolean;

  maxAge: number
  isDeadNextTime: boolean
  flashMessage: string | null

  setMaxAge(maxAge: string | number): void
  
  set(key: string, val: unknown): void
  get<T=unknown>(key: string): T
  
  toJSON(): Record<string, unknown>
  active(): Promise<void>
  commit(): void
  save(force?: boolean): Promise<void> 
  delete(): Promise<void>
}

function getRedisKeyFromAccessToken(accessToken: string): string {
  return Buffer.from(accessToken, 'hex').toString('utf8');
}

function getAccessionTokenFromRedisKey(redisKey: string): string {
  return Buffer.from(redisKey, 'utf8').toString('hex');
}

export class AccessDataImpl implements AccessData {
  static create(redis: Commands, userId:string, ip: string, maxAge: string | number): AccessData {
    const maxAgeNum = typeof maxAge === 'string' ? ms(maxAge) : maxAge;
    const timestamp = Date.now();
    const nonce: string = crypto.randomBytes(32).toString('hex');
    const hash: string = crypto.createHash('md5').update(`${userId}-${ip}-${nonce}-${timestamp}`).digest('hex');
    const redisKey = `${DEFAULT_ACCESS_TOKE_KEY_PREFIX}:${userId}:${hash}`;
    const accessToken = getAccessionTokenFromRedisKey(redisKey);

    const accessData = new AccessDataImpl(redis, {
      token: accessToken,
      userId,
      maxAge: maxAgeNum,
      nonce,
      ip,
      createAt: timestamp,
      updateAt: timestamp,
    });

    return accessData;
  }

  static async find(redis: Commands, accessToken: string): Promise<AccessData | null> {
    const redisKey = getRedisKeyFromAccessToken(accessToken);

    const jsonResultStr = await redis.get(redisKey);
    if (!jsonResultStr) {
      return null;
    }

    try {
      return new AccessDataImpl(redis, JSON.parse(jsonResultStr));
    } catch (err) {
      return null;
    }
  }

  static async findAccessDataListByUserId(redis: Commands, userId: string, currentAccessToken: string | null, opts?: FindAccessDataListByUserIdOpts): Promise<AccessData[]> {
    let results: AccessData[] = [];

    const skipCount = opts?.skipCount ?? 0;
    const incudesCurrent = opts?.incudesCurrent ?? false;
  
    const redisKeys: string[] = await redis.keys(`${DEFAULT_ACCESS_TOKE_KEY_PREFIX}:${userId}:*`);
    if (redisKeys.length === 0) return results;

    for (const redisKey of redisKeys) {
      // fix the first prefix
      const accessToken: string = getAccessionTokenFromRedisKey(redisKey);
      const accessData = await AccessDataImpl.find(redis, accessToken);
      if (!accessData) continue;
      if (!incudesCurrent && currentAccessToken && currentAccessToken === accessData.token) continue;

      results.push(accessData);
    }

    // last login is the top one
    results.sort((a:AccessData, b: AccessData ) => {
      return b.createAt - a.createAt;
    });

    if (skipCount > 0) {
      results = results.slice(skipCount);
    }
  
    return results;
  }

  static async delete(redis: Commands, accessToken: string): Promise<void> {
    const redisKey = getRedisKeyFromAccessToken(accessToken);
    await redis.del(redisKey);
  }

  private redis: Commands;
  private redisKey: string;

  private dataDirty = false;
  private _hasSaved = false;
  private data: Record<string, unknown> = {};

  private constructor(redis: Commands, data: Record<string, unknown>) {
    Object.assign(this.data, data);
    this.redis = redis;
    this.redisKey = getRedisKeyFromAccessToken(this.token);
  }

  get token(): string {
    return this.get<string>("token") ?? "";
  }

  get userId(): string {
    return this.get<string>("userId") ?? "";
  }

  get nonce(): string {
    return this.get<string>("nonce") ?? "";
  }

  get fingerprint(): string {
    return this.get<string>("fingerprint") ?? "";
  }

  get ip(): string {
    return this.get<string>("ip") ?? "";
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

  get isDeadNextTime(): boolean {
    return !!this.get("_isDeadNextTime");
  }

  set isDeadNextTime(val: boolean) {
    this.set("_isDeadNextTime", val);
  }

  get hasSaved(): boolean {
    return this._hasSaved;
  }

  get flashMessage() : string | null {
    return this.get<string | null>("_flashMessage") ?? null;
  }

  set flashMessage(val: string | null) {
    this.set("_flashMessage", val === null ? undefined : val);
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
    this._hasSaved = true;
  }

  async delete(): Promise<void> {
    await this.redis.del(this.redisKey);
  }
}
