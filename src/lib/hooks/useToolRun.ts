import { useCallback, useEffect, useRef } from 'react';
import * as Comlink from 'comlink';
import { createWorker, type ToolWorkerHandle } from '@/lib/workers/pool';
import type { RunResult } from '@/lib/workers/types';
import { useSession } from '@/lib/store/session';
import { zipFiles } from '@/lib/zip';

/**
 * Drives one tool run: spins the tool's code-split worker, streams progress into
 * the session store, turns the worker result into a downloadable object URL
 * (zipping when there are several files). The worker is always terminated
 * (success, error, cancel, or unmount) so document buffers are freed.
 */
export function useToolRun(workerId: string) {
  const handleRef = useRef<ToolWorkerHandle | null>(null);
  const setStatus = useSession((s) => s.setStatus);
  const setProgress = useSession((s) => s.setProgress);
  const setError = useSession((s) => s.setError);
  const setResult = useSession((s) => s.setResult);
  const reset = useSession((s) => s.reset);

  const dispose = useCallback(() => {
    handleRef.current?.dispose();
    handleRef.current = null;
  }, []);

  useEffect(() => dispose, [dispose]);

  const run = useCallback(
    async (options: Record<string, unknown>) => {
      const { files } = useSession.getState();
      if (files.length === 0) return;

      dispose();
      setStatus('preparing');
      setProgress(0);

      try {
        const inputs = await Promise.all(files.map((f) => f.file.arrayBuffer()));
        const handle = createWorker(workerId);
        handleRef.current = handle;

        setStatus('running');
        const out: RunResult = await handle.api.run(
          inputs,
          options,
          Comlink.proxy((fraction: number) => setProgress(fraction)),
        );

        const { blob, name, fileCount } = toDownload(out);
        setResult({ url: URL.createObjectURL(blob), name, fileCount });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      } finally {
        dispose();
      }
    },
    [workerId, dispose, setStatus, setProgress, setError, setResult],
  );

  const cancel = useCallback(() => {
    dispose();
    reset();
  }, [dispose, reset]);

  return { run, cancel };
}

function toDownload(out: RunResult): { blob: Blob; name: string; fileCount: number } {
  if (out.kind === 'file') {
    return { blob: new Blob([out.bytes], { type: out.mime }), name: out.name, fileCount: 1 };
  }
  if (out.files.length === 1) {
    const only = out.files[0]!;
    return {
      blob: new Blob([only.bytes], { type: 'application/pdf' }),
      name: only.name,
      fileCount: 1,
    };
  }
  return {
    blob: new Blob([zipFiles(out.files)], { type: 'application/zip' }),
    name: 'result.zip',
    fileCount: out.files.length,
  };
}
