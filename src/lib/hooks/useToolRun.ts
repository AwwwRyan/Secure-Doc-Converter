import { useCallback, useEffect, useRef } from 'react';
import * as Comlink from 'comlink';
import { createWorker, type ToolWorkerHandle } from '@/lib/workers/pool';
import type { RunResult } from '@/lib/workers/types';
import { useSession, type ResultFile } from '@/lib/store/session';

/**
 * Drives one tool run: spins the tool's code-split worker, streams progress into
 * the session store, and stores each output file (name + object URL + bytes) so
 * the shell can offer them individually or bundled as a .zip. The worker is
 * always terminated (success, error, cancel, or unmount) so document buffers are
 * freed.
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

        const parts =
          out.kind === 'file'
            ? [{ name: out.name, bytes: out.bytes, mime: out.mime }]
            : out.files.map((f) => ({ name: f.name, bytes: f.bytes, mime: 'application/pdf' }));

        const result: ResultFile[] = parts.map((p) => ({
          name: p.name,
          bytes: p.bytes,
          url: URL.createObjectURL(new Blob([p.bytes], { type: p.mime })),
        }));
        setResult(result);
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
