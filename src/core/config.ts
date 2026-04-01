import { homedir, tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface AppConfig {
  storageDir: string | null;
  projects: string[];
}

export interface ConfigDefaults {
  tempStorageDir: string;
  effectiveStorageDir: string;
  configFilePath: string;
}

const DEFAULT_CONFIG: AppConfig = {
  storageDir: null,
  projects: [],
};

export function getConfigFilePath(): string {
  if (process.platform === "win32") {
    const appDataDir = process.env.APPDATA || path.join(homedir(), "AppData", "Roaming");
    return path.join(appDataDir, "ai-track-tool", "config.json");
  }

  if (process.platform === "darwin") {
    return path.join(homedir(), "Library", "Application Support", "ai-track-tool", "config.json");
  }

  const xdgConfigHome = process.env.XDG_CONFIG_HOME || path.join(homedir(), ".config");
  return path.join(xdgConfigHome, "ai-track-tool", "config.json");
}

export function getDefaultStorageBaseDir(): string {
  return path.join(tmpdir(), "ai-track-tool");
}

export function getEffectiveStorageBaseDir(config: AppConfig): string {
  return config.storageDir ? path.resolve(config.storageDir) : getDefaultStorageBaseDir();
}

export function getConfigDefaults(config: AppConfig): ConfigDefaults {
  return {
    tempStorageDir: getDefaultStorageBaseDir(),
    effectiveStorageDir: getEffectiveStorageBaseDir(config),
    configFilePath: getConfigFilePath(),
  };
}

export function getLegacyStorageRoot(targetPath: string): string {
  return path.join(targetPath, ".ai-track");
}

export function getManagedStorageRoot(baseDir: string, targetPath: string): string {
  const targetName = path.basename(targetPath) || "project";
  const targetHash = createHash("sha256").update(targetPath).digest("hex").slice(0, 12);
  return path.join(baseDir, `${targetName}-${targetHash}`);
}

export async function readAppConfig(): Promise<AppConfig> {
  try {
    const content = await readFile(getConfigFilePath(), "utf8");
    const parsed = JSON.parse(content) as Partial<AppConfig>;
    return {
      storageDir: parsed.storageDir ? path.resolve(parsed.storageDir) : null,
      projects: Array.isArray(parsed.projects) ? parsed.projects.filter((p): p is string => typeof p === "string") : [],
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function writeAppConfig(config: AppConfig): Promise<AppConfig> {
  const normalized: AppConfig = {
    storageDir: config.storageDir ? path.resolve(config.storageDir) : null,
    projects: [...new Set(config.projects)],
  };

  const configFilePath = getConfigFilePath();
  await mkdir(path.dirname(configFilePath), { recursive: true });
  await writeFile(configFilePath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}
