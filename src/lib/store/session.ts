import { create } from 'zustand';

export type RunStatus = 'idle' | 'preparing' | 'running' | 'done' | 'error';

export interface SessionFile {
  readonly id: string;
  readonly name: string;
  readonly size: number;
  readonly file: File;
}

export interface ResultFile {
  name: string;
  url: string;
  /** Kept so a .zip can be built on demand without re-fetching. */
  bytes: ArrayBuffer;
}

interface SessionState {
  toolId: string | null;
  files: SessionFile[];
  status: RunStatus;
  progress: number; // [0, 1]
  error: string | null;
  /** Output files, or null before a run finishes. Length 1 for most tools. */
  result: ResultFile[] | null;

  openTool: (toolId: string) => void;
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  moveFileTo: (id: string, index: number) => void;
  setStatus: (status: RunStatus) => void;
  setProgress: (progress: number) => void;
  setError: (message: string) => void;
  setResult: (files: ResultFile[]) => void;
  reset: () => void;
}

function revoke(result: ResultFile[] | null): void {
  if (!result) return;
  for (const f of result) URL.revokeObjectURL(f.url);
}

const EMPTY = {
  files: [] as SessionFile[],
  status: 'idle' as RunStatus,
  progress: 0,
  error: null as string | null,
  result: null as ResultFile[] | null,
};

export const useSession = create<SessionState>((set, get) => ({
  toolId: null,
  ...EMPTY,

  openTool: (toolId) => {
    if (get().toolId === toolId) return;
    revoke(get().result);
    set({ toolId, ...EMPTY });
  },

  addFiles: (incoming) =>
    set((s) => ({
      files: [
        ...s.files,
        ...incoming.map((file) => ({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          file,
        })),
      ],
    })),

  removeFile: (id) => set((s) => ({ files: s.files.filter((f) => f.id !== id) })),

  moveFileTo: (id, index) =>
    set((s) => {
      const from = s.files.findIndex((f) => f.id === id);
      if (from === -1) return s;
      const to = Math.max(0, Math.min(s.files.length - 1, index));
      if (from === to) return s;
      const files = [...s.files];
      const [moved] = files.splice(from, 1);
      files.splice(to, 0, moved!);
      return { files };
    }),

  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  setError: (message) => set({ status: 'error', error: message }),

  setResult: (files) => {
    revoke(get().result);
    set({ status: 'done', progress: 1, error: null, result: files });
  },

  reset: () => {
    revoke(get().result);
    set({ ...EMPTY });
  },
}));
