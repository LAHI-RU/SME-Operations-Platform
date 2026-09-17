import { Component, type ReactNode } from 'react'
export class ApplicationBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed)
      return (
        <main className="grid min-h-dvh place-items-center p-6">
          <div className="max-w-md rounded-2xl border border-line bg-surface p-8">
            <p className="text-xs font-bold tracking-widest text-brand uppercase">SME Operations</p>
            <h1 className="mt-4 text-2xl font-bold">Let’s reopen your workspace</h1>
            <p className="mt-4 text-sm text-muted">
              This page could not be displayed. Reload to recover your session. If you just submitted a
              change, check the record before repeating it.
            </p>
            <button type="button" className="button-link mt-6" onClick={() => window.location.reload()}>
              Reload workspace
            </button>
          </div>
        </main>
      )
    return this.props.children
  }
}
