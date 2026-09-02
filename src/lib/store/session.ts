import { create } from 'zustand';

export type RunStatus = 'idle' | 'preparing' | 'running' | 'done' | 'error';

export interface SessionFile {
  readonly id: string;
  readonly name: string;
  readonly size: number;
  readonly file: File;
}

interface SessionState {
  toolId: string | null;
  files: SessionFile[];
  status: RunStatus;
  progress: number; // [0, 1]
  error: string | null;
  resultUrl: string | null;
  resultName: string | null;

  openTool: (toolId: string) => void;
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  setStatus: (status: RunStatus) => void;
  setProgress: (progress: number) => void;
  setError: (message: string) => void;
  setResult: (url: string, name: string) => void;
  reset: () => void;
}

function revoke(url: string | null): void {
  if (url) URL.revokeObjectURL(url);
}

const EMPTY = {
  files: [] as SessionFile[],
  status: 'idle' as RunStatus,
  progress: 0,
  error: null as string | null,
  resultUrl: null as string | null,
  resultName: null as string | null,
};

export const useSession = create<SessionState>((set, get) => ({
  toolId: null,
  ...EMPTY,

  openTool: (toolId) => {
    if (get().toolId === toolId) return;
    revoke(get().resultUrl);
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

  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  setError: (message) => set({ status: 'error', error: message }),

  setResult: (url, name) => {
    revoke(get().resultUrl);
    set({ status: 'done', progress: 1, resultUrl: url, resultName: name });
  },

  reset: () => {
    revoke(get().resultUrl);
    set({ ...EMPTY });
  },
}));
