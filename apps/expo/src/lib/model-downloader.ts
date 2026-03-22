import * as FileSystem from "expo-file-system";

const HUGGINGFACE_BASE_URL = "https://huggingface.co";
const MODELS_DIR = `${FileSystem.documentDirectory}models/`;

export interface DownloadProgress {
  written: number;
  total: number;
  percentage: number;
}

export interface ModelConfig {
  name: string;
  repo: string;
  filename: string;
  size: string;
}

export const DEFAULT_MODEL: ModelConfig = {
  name: "Qwen3.5 0.8B (Q4_K_M)",
  repo: "unsloth/Qwen3.5-0.8B-GGUF",
  filename: "Qwen3.5-0.8B-Q4_K_M.gguf",
  size: "~530 MB",
};

function getModelDownloadUrl(repo: string, filename: string): string {
  return `${HUGGINGFACE_BASE_URL}/${repo}/resolve/main/${filename}?download=true`;
}

async function ensureModelsDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(MODELS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(MODELS_DIR, { intermediates: true });
  }
}

export async function getModelPath(filename: string): Promise<string | null> {
  const filePath = `${MODELS_DIR}${filename}`;
  const info = await FileSystem.getInfoAsync(filePath);
  return info.exists ? filePath : null;
}

export async function isModelDownloaded(filename: string): Promise<boolean> {
  const path = await getModelPath(filename);
  return path !== null;
}

export async function downloadModel(
  repo: string,
  filename: string,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<string> {
  await ensureModelsDir();

  const filePath = `${MODELS_DIR}${filename}`;

  // Check if already downloaded
  const info = await FileSystem.getInfoAsync(filePath);
  if (info.exists) {
    return filePath;
  }

  const url = getModelDownloadUrl(repo, filename);
  const tmpPath = `${filePath}.tmp`;

  const downloadResumable = FileSystem.createDownloadResumable(
    url,
    tmpPath,
    {},
    (downloadProgress) => {
      if (onProgress && downloadProgress.totalBytesExpectedToWrite > 0) {
        const percentage = Math.round(
          (downloadProgress.totalBytesWritten /
            downloadProgress.totalBytesExpectedToWrite) *
            100,
        );
        onProgress({
          written: downloadProgress.totalBytesWritten,
          total: downloadProgress.totalBytesExpectedToWrite,
          percentage,
        });
      }
    },
  );

  const result = await downloadResumable.downloadAsync();

  if (!result) {
    throw new Error("Download failed: no result returned");
  }

  if (result.status !== 200) {
    // Clean up tmp file
    try {
      await FileSystem.deleteAsync(tmpPath, { idempotent: true });
    } catch {
      // ignore
    }
    throw new Error(`Download failed with HTTP ${result.status}`);
  }

  // Move tmp to final path
  await FileSystem.moveAsync({ from: tmpPath, to: filePath });

  return filePath;
}

export async function deleteModel(filename: string): Promise<void> {
  const filePath = `${MODELS_DIR}${filename}`;
  await FileSystem.deleteAsync(filePath, { idempotent: true });
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
