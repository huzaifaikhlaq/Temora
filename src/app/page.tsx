import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:px-10">
        <Link
          aria-label="Temora home"
          className="flex items-center gap-3 text-foreground"
          href="/"
        >
          <span
            aria-hidden="true"
            className="grid size-8 grid-cols-2 gap-1 rounded-lg bg-accent p-1.5"
          >
            <span className="rounded-sm bg-white/95" />
            <span className="rounded-sm bg-white/65" />
            <span className="rounded-sm bg-white/65" />
            <span className="rounded-sm bg-white/95" />
          </span>
          <span className="text-base font-semibold tracking-tight">Temora</span>
        </Link>
        <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted">
          Product foundation
        </span>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-20 sm:px-10">
        <div className="max-w-3xl">
          <p className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-accent">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" />
            A focused space for ambitious teams
          </p>
          <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-0.055em] sm:text-7xl">
            Make room for
            <br />
            meaningful work.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-muted">
            Temora is being built as a calmer, clearer way to plan and deliver
            work. This is the foundation for what comes next.
          </p>
          <div className="mt-12 flex items-center gap-4 border-t border-border pt-5 text-sm">
            <span className="font-medium">Frontend foundation</span>
            <span aria-hidden="true" className="size-1 rounded-full bg-border" />
            <span className="text-muted">Ready to grow</span>
          </div>
        </div>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-6 py-6 text-xs text-muted sm:px-10">
        Thoughtful tools for meaningful progress.
      </footer>
    </main>
  );
}
