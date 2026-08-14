// Tiny transactional JSON persistence layer. Zero external deps.
// Each collection is a JSON array file with an id-based upsert API.
// A per-file write queue serializes concurrent writes to avoid corruption.

import { promises as fs } from "node:fs";
import path from "node:path";

const RUNTIME_DIR = path.join(process.cwd(), "data", "runtime");

async function ensureDir() {
  await fs.mkdir(RUNTIME_DIR, { recursive: true });
}

// Hoist write queues onto globalThis so Next.js dev-mode's separate module
// contexts don't each get their own lock table.
declare global {
  // eslint-disable-next-line no-var
  var __fontevaWriteQueues: Map<string, Promise<void>> | undefined;
}
const writeQueues: Map<string, Promise<void>> =
  globalThis.__fontevaWriteQueues ?? (globalThis.__fontevaWriteQueues = new Map());

async function readFileSafe(file: string): Promise<string | null> {
  try {
    return await fs.readFile(file, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

async function withWriteLock<T>(file: string, work: () => Promise<T>): Promise<T> {
  const prev = writeQueues.get(file) ?? Promise.resolve();
  let release!: () => void;
  const wait = new Promise<void>((r) => (release = r));
  writeQueues.set(
    file,
    prev.then(() => wait),
  );
  try {
    await prev;
    return await work();
  } finally {
    release();
    if (writeQueues.get(file) === prev.then(() => wait)) writeQueues.delete(file);
  }
}

export interface Entity {
  id: string;
}

export class Collection<T extends Entity> {
  constructor(private readonly name: string) {}

  private get file() {
    return path.join(RUNTIME_DIR, `${this.name}.json`);
  }

  async all(): Promise<T[]> {
    await ensureDir();
    const raw = await readFileSafe(this.file);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as T[];
    } catch {
      return [];
    }
  }

  async findById(id: string): Promise<T | null> {
    const items = await this.all();
    return items.find((it) => it.id === id) ?? null;
  }

  async find(predicate: (item: T) => boolean): Promise<T[]> {
    const items = await this.all();
    return items.filter(predicate);
  }

  async upsert(item: T): Promise<T> {
    return withWriteLock(this.file, async () => {
      await ensureDir();
      const items = await this.all();
      const idx = items.findIndex((it) => it.id === item.id);
      if (idx >= 0) items[idx] = item;
      else items.push(item);
      await fs.writeFile(this.file, JSON.stringify(items, null, 2), "utf8");
      return item;
    });
  }

  async replaceAll(items: T[]): Promise<void> {
    return withWriteLock(this.file, async () => {
      await ensureDir();
      await fs.writeFile(this.file, JSON.stringify(items, null, 2), "utf8");
    });
  }

  async append(item: T): Promise<T> {
    return withWriteLock(this.file, async () => {
      await ensureDir();
      const items = await this.all();
      items.push(item);
      await fs.writeFile(this.file, JSON.stringify(items, null, 2), "utf8");
      return item;
    });
  }

  async remove(id: string): Promise<void> {
    return withWriteLock(this.file, async () => {
      const items = await this.all();
      const next = items.filter((it) => it.id !== id);
      await fs.writeFile(this.file, JSON.stringify(next, null, 2), "utf8");
    });
  }
}

import type {
  UpgradeRun,
  AgentDecision,
  ApprovalRequest,
  AgentActivity,
  AuditEntry,
} from "./types";

export const db = {
  upgrades: new Collection<UpgradeRun>("upgrades"),
  decisions: new Collection<AgentDecision>("decisions"),
  approvals: new Collection<ApprovalRequest>("approvals"),
  activities: new Collection<AgentActivity>("activities"),
  audit: new Collection<AuditEntry>("audit"),
};
