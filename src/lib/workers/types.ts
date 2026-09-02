import type * as Comlink from 'comlink';

/** Progress in [0, 1]. Passed across the worker boundary via Comlink.proxy. */
export type ProgressFn = (fraction: number) => void;

/**
 * Every tool worker implements this. `input`/output are transferable
 * ArrayBuffers so document bytes are moved, not copied, and never touch the
 * main thread longer than necessary.
 */
export interface ToolWorkerApi {
  run(
    input: ArrayBuffer[],
    options: Readonly<Record<string, unknown>>,
    onProgress: ProgressFn,
  ): Promise<ArrayBuffer>;
}

export type RemoteToolWorker = Comlink.Remote<ToolWorkerApi>;
