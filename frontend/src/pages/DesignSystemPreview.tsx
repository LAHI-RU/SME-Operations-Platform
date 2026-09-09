import { useRef, useState, type FormEvent } from 'react'
import { ArrowRight, MousePointer2, Palette, Type } from 'lucide-react'
import { StatusBadge } from '../components/status/StatusBadge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { ORDER_STATUSES } from '../types/order'

const palette = [
  { name: 'Primary', color: 'bg-brand', purpose: 'Main actions' },
  { name: 'Success', color: 'bg-success', purpose: 'Completed work' },
  { name: 'Warning', color: 'bg-warning', purpose: 'Needs attention' },
  { name: 'Danger', color: 'bg-danger', purpose: 'Errors & cancellation' },
  { name: 'Info', color: 'bg-info', purpose: 'Work in progress' },
  { name: 'Neutral', color: 'bg-neutral', purpose: 'Drafts & supporting UI' },
]

export function DesignSystemPreview() {
  const [announcement, setAnnouncement] = useState('Choose an action to preview its feedback.')
  const [name, setName] = useState('')
  const [error, setError] = useState<string>()
  const [formMessage, setFormMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function checkField(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Enter a display name to continue.')
      setFormMessage('')
      inputRef.current?.focus()
      return
    }
    setError(undefined)
    setFormMessage('The example field is valid. Nothing has been saved.')
  }

  return (
    <>
        <div className="mb-8 max-w-2xl">
          <p className="mb-3 text-xs font-bold tracking-widest text-brand uppercase">Foundation / Design system</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">A consistent operations workspace.</h1>
          <p className="mt-4 text-base text-muted">The shared visual language for sales, warehouse, and delivery. These examples let us review the interface before connecting business features.</p>
        </div>

        <Card aria-labelledby="palette-heading">
          <div className="mb-5 flex items-center gap-2"><Palette aria-hidden="true" className="size-4 text-brand" /><h2 id="palette-heading" className="font-semibold">Purposeful color</h2></div>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
            {palette.map(({ name: colorName, color, purpose }) => (
              <div key={colorName}>
                <div aria-hidden="true" className={`mb-3 h-12 rounded-lg ${color}`} />
                <p className="text-sm font-semibold">{colorName}</p><p className="mt-1 text-xs text-muted">{purpose}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid items-start gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card aria-labelledby="actions-heading">
              <div className="mb-2 flex items-center gap-2"><MousePointer2 aria-hidden="true" className="size-4 text-brand" /><h2 id="actions-heading" className="font-semibold">Clear actions</h2></div>
              <p className="mb-5 text-sm text-muted">Try the buttons with a mouse or keyboard.</p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setAnnouncement('Primary action activated. This is a UI demonstration.')}>Primary action <ArrowRight aria-hidden="true" className="size-4" /></Button>
                <Button variant="secondary" onClick={() => setAnnouncement('Secondary action activated. This is a UI demonstration.')}>Secondary</Button>
                <Button variant="danger" onClick={() => setAnnouncement('Danger style activated. Nothing has been deleted.')}>Danger style</Button>
              </div>
              <p role="status" className="mt-4 min-h-10 text-sm text-muted">{announcement}</p>
              <div className="mt-4 flex flex-wrap gap-3 border-t border-line pt-5"><Button disabled>Unavailable</Button><Button loading>Loading example</Button></div>
              <p className="mt-3 text-xs text-muted">Disabled and loading examples do not perform actions.</p>
            </Card>

            <Card aria-labelledby="type-heading">
              <div className="mb-5 flex items-center gap-2"><Type aria-hidden="true" className="size-4 text-brand" /><h2 id="type-heading" className="font-semibold">Readable hierarchy</h2></div>
              <p className="text-2xl font-bold tracking-tight">Page heading</p><p className="mt-3 font-semibold">Section heading</p>
              <p className="mt-2 text-sm text-muted">Supporting text keeps dense operational screens easy to scan.</p>
              <p className="mt-4 text-xs font-semibold tracking-wider text-muted uppercase">Small supporting label</p>
            </Card>
          </div>

          <Card aria-labelledby="fields-heading">
            <h2 id="fields-heading" className="font-semibold">Helpful form fields</h2>
            <p className="mt-2 mb-6 text-sm text-muted">Submit an empty field to preview an accessible validation error.</p>
            <form noValidate onSubmit={checkField} className="space-y-5">
              <Input
                ref={inputRef}
                label="Display name"
                name="display_name"
                value={name}
                required
                maxLength={100}
                placeholder="Enter an example name"
                hint="Preview only. This value is not sent to the API."
                error={error}
                onChange={(event) => {
                  setName(event.target.value)
                  setError(undefined)
                  setFormMessage('')
                }}
              />
              <Input label="Read-only example" value="SME Operations" readOnly />
              <Input label="Disabled example" placeholder="Currently unavailable" disabled />
              <Button type="submit">Check field</Button>
              <p role="status" className="min-h-5 text-sm text-success">{formMessage}</p>
            </form>
          </Card>
        </div>

        <Card aria-labelledby="statuses-heading">
          <h2 id="statuses-heading" className="font-semibold">Order status language</h2>
          <p className="mt-2 mb-5 max-w-2xl text-sm text-muted">One label and color per backend status. This is a badge catalog, not an order timeline or a set of available transitions.</p>
          <div className="flex flex-wrap gap-3">{ORDER_STATUSES.map((status) => <StatusBadge key={status} status={status} />)}</div>
        </Card>

        <footer className="flex flex-wrap justify-between gap-2 pb-4 text-xs text-muted"><p>UI foundation · Tailwind CSS + reusable React components</p><p>Local component preview · No business data</p></footer>
    </>
  )
}
