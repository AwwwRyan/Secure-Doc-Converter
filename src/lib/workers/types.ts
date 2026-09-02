import type * as Comlink from 'comlink';

/** Progress in [0, 1]. Passed across the worker boundary via Comlink.proxy. */
export type ProgressFn = (fraction: number) => void;

export interface RunResultFile {
  name: string;
  bytes: ArrayBuffer;
}

/**
 * A tool run produces either a single file or several. The shell turns several
 * into one `.zip` for download.
 */
export type RunResult =
  | { kind: 'file'; name: string; mime: string; bytes: ArrayBuffer }
  | { kind: 'files'; files: RunResultFile[] };

/**
 * Every tool worker implements this. `inputs` are transferable ArrayBuffers so
 * document bytes are moved, not copied, and never touch the main thread longer
 * than necessary. `options` is a plain object the worker validates itself.
 */
export interface ToolWorkerApi {
  run(
    inputs: ArrayBuffer[],
    options: Readonly<Record<string, unknown>>,
    onProgress: ProgressFn,
  ): Promise<RunResult>;
}

export type RemoteToolWorker = Comlink.Remote<ToolWorkerApi>;
