import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const routeHeadings: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/categories': 'Categories',
  '/products': 'Products',
  '/inventory': 'Inventory',
  '/customers': 'Customers',
  '/suppliers': 'Suppliers',
  '/orders': 'Orders',
  '/fulfillment': 'Fulfillment',
  '/delivery': 'Delivery',
  '/customers/new': 'New customer',
  '/products/new': 'New product',
  '/orders/new': 'New order',
  '/orders/1': 'ORD-000001',
  '/inventory/1': 'Everyday Notebook',
}

async function expectPageReady(page: Page, route: string) {
  await expect(page.getByRole('heading', { level: 1, name: routeHeadings[route], exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Request status', exact: true })).toHaveCount(0)
  await expect(page.getByText('Loading product information...', { exact: true })).toHaveCount(0)
  if (route === '/dashboard') {
    await expect(page.getByRole('button', { name: 'Refresh dashboard', exact: true })).toBeEnabled()
  }
  if (route === '/orders/new') {
    await expect(page.getByRole('button', { name: 'Create draft order', exact: true })).toBeEnabled()
    await expect(page.getByLabel('Customer').locator('option[value="1"]')).toBeAttached()
    await expect(page.getByLabel('Product 1').locator('option[value="1"]')).toBeAttached()
  }
  if (route === '/products/new') {
    await expect(page.getByLabel('Category').locator('option[value="1"]')).toBeAttached()
  }
}

async function login(page: Page, email = 'test@example.com') {
  await page.goto('/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill('password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()
}
async function confirmAction(page: Page, label: string) {
  await page.getByRole('button', { name: label, exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
}

test('real Laravel HTTP: catalog, contacts, stock, order, packing, and delivery', async ({ page }) => {
  test.setTimeout(180_000)
  const exceptions: string[] = []
  page.on('pageerror', (error) => exceptions.push(error.message))
  await login(page)
  await page.goto('/categories/new')
  await page.getByLabel('Category name').fill('Office essentials')
  await page.getByLabel('Description').fill('Everyday supplies for productive teams.')
  await page.getByRole('button', { name: 'Create category', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Office essentials', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Edit category' }).click()
  await page.getByLabel('Description').fill('Everyday supplies and workspace essentials.')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Everyday supplies and workspace essentials.', { exact: true })).toBeVisible()

  await page.goto('/customers/new')
  await page.getByLabel('Name').fill('Northstar Studio')
  await page.getByLabel('Phone').fill('+94 77 555 0100')
  await page.getByLabel('Email address').fill('orders@northstar.example')
  await page.getByLabel('Address', { exact: true }).fill('42 Lake Road, Colombo')
  await page.getByRole('button', { name: 'Create customer' }).click()
  await expect(page.getByRole('heading', { name: 'Northstar Studio' })).toBeVisible()
  await page.getByRole('link', { name: 'Edit customer' }).click()
  await page.getByLabel('Phone').fill('+94 77 555 0101')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('+94 77 555 0101', { exact: true })).toBeVisible()

  await page.goto('/suppliers/new')
  await page.getByLabel('Name').fill('Vertex Supply Co.')
  await page.getByLabel('Contact person').fill('Maya Perera')
  await page.getByLabel('Phone').fill('+94 11 555 0200')
  await page.getByRole('button', { name: 'Create supplier' }).click()
  await expect(page.getByRole('heading', { name: 'Vertex Supply Co.' })).toBeVisible()
  await page.getByRole('link', { name: 'Edit supplier' }).click()
  await page.getByLabel('Contact person').fill('Maya Fernando')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Maya Fernando', { exact: true })).toBeVisible()

  await page.goto('/products/new')
  await page.getByLabel('Product name').fill('Everyday Notebook')
  await page.getByLabel('SKU').fill('NB-001')
  await page.getByLabel('Category').selectOption({ label: 'Office essentials' })
  await page.getByLabel('Cost price').fill('300')
  await page.getByLabel('Selling price').fill('450')
  await page.getByLabel('Reorder level').fill('10')
  await page.getByRole('button', { name: 'Create product', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Everyday Notebook' })).toBeVisible()
  const productId = page.url().split('/').at(-1)!
  await page.goto(`/inventory/${productId}`)
  await page.getByRole('button', { name: 'Stock in', exact: true }).click()
  await page.getByLabel('Quantity').fill('100')
  await page.getByLabel('Notes').fill('Opening stock received')
  await page.getByRole('button', { name: 'Review movement' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('100 units')
  await expect(page.getByRole('table')).toContainText('+100')
  await page.getByRole('button', { name: 'Stock out', exact: true }).click()
  await page.getByLabel('Quantity').fill('200')
  await page.getByRole('button', { name: 'Review movement' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByLabel('Quantity').fill('2')
  await page.getByLabel('Movement type').selectOption('ADJUSTMENT_OUT')
  await page.getByRole('button', { name: 'Review movement' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('98 units')

  await page.goto('/orders/new')
  await page.getByLabel('Customer').selectOption({ label: 'Northstar Studio' })
  await page.getByLabel('Product 1').selectOption({ label: 'NB-001 · Everyday Notebook' })
  await page.getByLabel('Quantity 1').fill('3')
  await expect(page.getByText('1350.00', { exact: true })).toHaveCount(2)
  await page.getByLabel('Order notes').fill('Deliver to reception.')
  await page.getByRole('button', { name: 'Create draft order' }).click()
  await expect(page.getByText('Draft created. Review the items below before submitting.')).toBeVisible()
  const orderUrl = page.url()
  await confirmAction(page, 'Submit order')
  await confirmAction(page, 'Confirm stock')
  await confirmAction(page, 'Start fulfillment')
  await page.getByLabel('Completion notes').fill('All three notebooks packed.')
  await confirmAction(page, 'Complete fulfillment')
  await page.getByLabel('Delivery user ID').fill('4')
  await confirmAction(page, 'Assign delivery')
  await confirmAction(page, 'Start delivery')
  await page.getByLabel('Completion notes').fill('Received by customer reception.')
  await confirmAction(page, 'Complete delivery')
  await expect(page.getByRole('heading', { name: 'Order completed' })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Received by customer reception.', { exact: true })).toBeVisible()
  await page.screenshot({ path: 'test-results/order-desktop.png', fullPage: true })
  await page.goto(`/inventory/${productId}`)
  await expect(page.getByRole('table')).toContainText('-3')
  await expect(page.getByRole('table')).toContainText('Sale')
  await page.goto('/orders')
  await page.getByLabel('Search orders').fill('Northstar')
  await page.getByRole('button', { name: 'Apply filters' }).click()
  await expect(page.getByRole('table')).toContainText('Northstar Studio')
  await page.goto(orderUrl)
  await expect(page.getByRole('heading', { name: 'Order completed' })).toBeVisible()
  expect(exceptions).toEqual([])
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Sign in to your workspace' })).toBeVisible()
})

test('desktop and mobile layouts: real data, navigation, keyboard, and containment', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Sign in to your workspace' })).toBeVisible()
  await page.screenshot({ path: 'test-results/login-desktop.png', fullPage: true })
  await login(page)
  await expectPageReady(page, '/dashboard')
  await page.screenshot({ path: 'test-results/dashboard-desktop.png', fullPage: true })
  for (const route of [
    '/categories',
    '/products',
    '/inventory',
    '/customers',
    '/suppliers',
    '/orders',
    '/fulfillment',
    '/delivery',
  ]) {
    await page.goto(route)
    await expectPageReady(page, route)
    await expect(page.getByRole('alert')).toHaveCount(0)
  }
  await page.setViewportSize({ width: 375, height: 812 })
  for (const route of [
    '/dashboard',
    '/categories',
    '/products',
    '/inventory',
    '/customers',
    '/suppliers',
    '/orders',
    '/fulfillment',
    '/delivery',
    '/orders/1',
    '/inventory/1',
    '/customers/new',
    '/products/new',
    '/orders/new',
  ]) {
    await page.goto(route)
    await expectPageReady(page, route)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflow, `Page overflow at ${route}`).toBe(false)
  }
  await page.screenshot({ path: 'test-results/order-form-mobile.png', fullPage: true })
  await page.locator('header summary').click()
  await expect(page.locator('header details')).toHaveAttribute('open', '')
  await page.keyboard.press('Escape')
  await expect(page.locator('header summary')).toBeFocused()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Sign in to your workspace' })).toBeVisible()
  await page.screenshot({ path: 'test-results/login-mobile.png', fullPage: true })
})

test('directory deletion uses cancel and explicit confirmation against real API', async ({ page }) => {
  await login(page)
  for (const kind of ['category', 'customer', 'supplier']) {
    const collection = kind === 'category' ? 'categories' : `${kind}s`
    await page.goto(`/${collection}/new`)
    await page.getByLabel(kind === 'category' ? 'Category name' : 'Name').fill(`Disposable ${kind}`)
    if (kind !== 'category') await page.getByLabel('Phone').fill('5550100')
    await page.getByRole('button', { name: `Create ${kind}`, exact: true }).click()
    await expect(page.getByRole('heading', { name: `Disposable ${kind}` })).toBeVisible()
    await page.getByRole('button', { name: `Delete ${kind}`, exact: true }).click()
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(page.getByRole('heading', { name: `Disposable ${kind}` })).toBeVisible()
    await page.getByRole('button', { name: `Delete ${kind}`, exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Delete record', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/${collection}$`))
    await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeVisible()
    await expect(page.locator('main')).not.toContainText(`Disposable ${kind}`)
  }
})

for (const [role, email, allowed] of [
  ['SALES', 'sales@example.test', ['customers', 'orders']],
  ['WAREHOUSE', 'warehouse@example.test', ['products', 'suppliers']],
  ['DELIVERY', 'delivery@example.test', []],
] as const) {
  test(`${role}: real account sees permitted creation routes and protected actions`, async ({ page }) => {
    await login(page, email)
    await expect(page.locator('header')).toContainText(role)
    for (const module of ['categories', 'products', 'customers', 'suppliers', 'orders']) {
      await page.goto(`/${module}`)
      await expectPageReady(page, `/${module}`)
      const permit = (allowed as readonly string[]).includes(module)
      await expect(page.locator(`main a[href="/${module}/new"]`)).toHaveCount(permit ? 1 : 0)
      await page.goto(`/${module}/new`)
      if (permit) await expect(page.locator('main form')).toBeVisible()
      else await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible()
    }
    await page.goto('/inventory/1')
    await expect(page.getByRole('heading', { name: 'Everyday Notebook' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Stock in', exact: true })).toHaveCount(
      role === 'WAREHOUSE' ? 1 : 0,
    )
    await page.goto('/fulfillment')
    await expect(
      page.getByRole('heading', {
        name: role === 'WAREHOUSE' ? 'Fulfillment' : 'Access denied',
        exact: true,
      }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Sign in to your workspace' })).toBeVisible()
  })
}

test('critical form feedback: real uniqueness validation and duplicate order lines', async ({ page }) => {
  await login(page)
  await page.goto('/categories/new')
  await page.getByLabel('Category name').fill('Office essentials')
  await page.getByRole('button', { name: 'Create category', exact: true }).click()
  await expect(page.locator('main')).toContainText('already been taken')
  await expect(page.getByLabel('Category name')).toHaveValue('Office essentials')
  await expect(page.getByLabel('Category name')).toBeFocused()
  await page.goto('/orders/new')
  await expect(page.getByRole('button', { name: 'Create draft order' })).toBeEnabled()
  let requests = 0
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/orders')) requests++
  })
  await page.getByRole('button', { name: 'Create draft order' }).click()
  await expect(page.locator('main')).toContainText('Choose a customer.')
  await page.getByLabel('Customer').selectOption({ label: 'Northstar Studio' })
  await page.getByLabel('Product 1').selectOption('1')
  await page.getByRole('button', { name: 'Add item', exact: true }).click()
  await page.getByLabel('Product 2').selectOption('1')
  await page.getByRole('button', { name: 'Create draft order' }).click()
  await expect(page.locator('main')).toContainText('This product is already included.')
  expect(requests).toBe(0)
  await page.getByRole('button', { name: 'Remove item 2' }).click()
  await page.route('**/api/v1/orders', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    await route.fulfill({
      status: 422,
      contentType: 'application/json',
      body: JSON.stringify({ errors: { 'items.0.quantity': ['The quantity was rejected by the server.'] } }),
    })
  })
  await page.getByRole('button', { name: 'Create draft order' }).click()
  await expect(page.locator('main')).toContainText('The quantity was rejected by the server.')
  await expect(page.getByLabel('Quantity 1')).toBeFocused()
  await expect(page.getByLabel('Customer')).toHaveValue('1')
})

test('accessibility scans cover login, data views, forms, and a mobile confirmation', async ({ page }) => {
  test.setTimeout(120_000)
  async function scan() {
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(
      result.violations.map((violation) => ({
        rule: violation.id,
        nodes: violation.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })),
      })),
    ).toEqual([])
  }
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Sign in to your workspace' })).toBeVisible()
  await scan()
  await login(page)
  for (const route of [
    '/dashboard',
    '/categories',
    '/customers/new',
    '/products/new',
    '/orders/new',
    '/orders/1',
    '/inventory/1',
  ]) {
    await page.goto(route)
    await expectPageReady(page, route)
    await scan()
  }
  await page.setViewportSize({ width: 375, height: 812 })
  await page.getByRole('button', { name: 'Stock in', exact: true }).click()
  await page.getByLabel('Quantity').fill('1')
  await page.getByRole('button', { name: 'Review movement' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await scan()
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false)
  await page.screenshot({ path: 'test-results/stock-confirmation-mobile.png', fullPage: true })
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
})
