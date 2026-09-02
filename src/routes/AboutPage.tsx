const VERIFY_STEPS: readonly string[] = [
  'Open DevTools → Network and clear it.',
  'Use any tool — merge, compress, unlock, Word → PDF, anything.',
  'You’ll see the app and its engines download once (and the high-fidelity Office converter only if you ask for it).',
  'When you run a tool and save the result: no request uploads your file. The result is built in your browser.',
  'There is no “convert” server request to find, for any tool. The source is public — read it.',
];

export function AboutPage() {
  return (
    <article className="flex max-w-[68ch] flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-[24px] font-bold tracking-tight text-balance">About &amp; privacy</h1>
        <p className="text-[14.5px] text-muted">
          Secure Doc Converter is a set of PDF tools that run entirely in your browser. Your files
          are never uploaded and never stored — there is no server that accepts a document.
        </p>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-[15px] font-semibold text-ink">The promise</h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[13.5px] text-muted">
          <li>Every tool runs on your device. No upload, for any tool.</li>
          <li>Nothing is stored — no accounts, no history, no file names, no contents.</li>
          <li>No third-party scripts, fonts, CDNs, analytics, or trackers.</li>
          <li>The code is public and each deploy is pinned to a git commit you can check.</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-[15px] font-semibold text-ink">Verify it yourself</h2>
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-[13.5px] text-muted">
          {VERIFY_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-[15px] font-semibold text-ink">Where a little trust is still needed</h2>
        <p className="text-[13.5px] text-muted">
          You trust the host to serve the exact published code (true of any website), and no web app
          can protect a device that is already compromised by malware or a bad browser extension.
          The host sees ordinary request logs — your IP and which file — but never a document.
        </p>
      </section>
    </article>
  );
}
