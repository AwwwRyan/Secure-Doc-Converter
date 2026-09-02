import { create } from 'zustand';

export type RunStatus = 'idle' | 'preparing' | 'running' | 'done' | 'error';

export interface SessionFile {
  readonly id: string;
  readonly name: string;
  readonly size: number;
  readonly file: File;
}

export interface SessionResult {
  url: string;
  name: string;
  /** > 1 means several output files were bundled into the .zip at `url`. */
  fileCount: number;
}

interface SessionState {
  toolId: string | null;
  files: SessionFile[];
  status: RunStatus;
  progress: number; // [0, 1]
  error: string | null;
  result: SessionResult | null;

  openTool: (toolId: string) => void;
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  moveFile: (id: string, dir: -1 | 1) => void;
  setStatus: (status: RunStatus) => void;
  setProgress: (progress: number) => void;
  setError: (message: string) => void;
  setResult: (result: SessionResult) => void;
  reset: () => void;
}

function revoke(result: SessionResult | null): void {
  if (result) URL.revokeObjectURL(result.url);
}

const EMPTY = {
  files: [] as SessionFile[],
  status: 'idle' as RunStatus,
  progress: 0,
  error: null as string | null,
  result: null as SessionResult | null,
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

  moveFile: (id, dir) =>
    set((s) => {
      const i = s.files.findIndex((f) => f.id === id);
      const j = i + dir;
      if (i === -1 || j < 0 || j >= s.files.length) return s;
      const files = [...s.files];
      [files[i], files[j]] = [files[j]!, files[i]!];
      return { files };
    }),

  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  setError: (message) => set({ status: 'error', error: message }),

  setResult: (result) => {
    revoke(get().result);
    set({ status: 'done', progress: 1, error: null, result });
  },

  reset: () => {
    revoke(get().result);
    set({ ...EMPTY });
  },
}));
