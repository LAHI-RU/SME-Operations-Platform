import { Link } from 'react-router'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { catalogErrorMessage, productLinkStyle } from './product-presentation'

export function ProductFeedback({ error, retry }: { error?: unknown; retry?: () => void }) {
  return <Card aria-label="Product request status">
    {error ? <><p role="alert" className="text-danger">{catalogErrorMessage(error)}</p><div className="mt-4 flex flex-wrap gap-4">{retry && <Button variant="secondary" onClick={retry}>Try again</Button>}<Link to="/products" className={productLinkStyle}>Back to products</Link></div></> : <p role="status" className="text-muted">Loading product information...</p>}
  </Card>
}
