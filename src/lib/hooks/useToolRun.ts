import { useCallback, useEffect, useRef } from 'react';
import * as Comlink from 'comlink';
import { createToolWorker, type ToolWorkerHandle } from '@/lib/workers/pool';
import { useSession } from '@/lib/store/session';

/**
 * Drives one tool run: spins a code-split worker, streams progress into the
 * session store, hands back a result object URL. The worker is always
 * terminated (success, error, or unmount) so document buffers are freed.
 *
 * M0 uses the demo worker for every tool; M1+ maps tool ids to real workers.
 */
export function useToolRun(toolId: string) {
  const handleRef = useRef<ToolWorkerHandle | null>(null);
  const { addFiles, removeFile, reset, setStatus, setProgress, setError, setResult } = useSession();

  const dispose = useCallback(() => {
    handleRef.current?.dispose();
    handleRef.current = null;
  }, []);

  useEffect(() => dispose, [dispose]);

  const run = useCallback(async () => {
    const { files } = useSession.getState();
    if (files.length === 0) return;

    dispose();
    setStatus('preparing');
    setProgress(0);

    try {
      const buffers = await Promise.all(files.map((f) => f.file.arrayBuffer()));
      const handle = createToolWorker(toolId);
      handleRef.current = handle;

      setStatus('running');
      const out = await handle.api.run(
        buffers,
        {},
        Comlink.proxy((fraction: number) => setProgress(fraction)),
      );

      // M0 demo returns an empty buffer; still exercise the result path.
      const blob = new Blob([out], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setResult(url, `${toolId}-result.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      dispose();
    }
  }, [toolId, dispose, setStatus, setProgress, setError, setResult]);

  const cancel = useCallback(() => {
    dispose();
    reset();
  }, [dispose, reset]);

  return { run, cancel, addFiles, removeFile, reset };
}
