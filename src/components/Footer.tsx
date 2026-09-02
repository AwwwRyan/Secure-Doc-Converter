export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-2 px-7 py-[18px] text-xs text-faint">
        <span>Nothing you open here is uploaded or stored.</span>
        <span className="flex items-center gap-3.5">
          <a
            href="https://github.com"
            className="text-faint hover:text-ink"
            rel="noreferrer noopener"
          >
            Source code
          </a>
          <span>v0.1 · scaffold</span>
        </span>
      </div>
    </footer>
  );
}
