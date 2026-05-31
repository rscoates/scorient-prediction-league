/**
 * E2E test with Puppeteer — requires the app to be running on localhost:5173
 * and the backend on localhost:8000 with DEV_AUTH_ENABLED=true.
 *
 * Run with: npx jest --config jest.e2e.config.js
 */
import puppeteer, { type Browser, type Page } from 'puppeteer'

const BASE = 'http://localhost:5173'
const API = 'http://localhost:8000'
const DEV_EMAIL = 'e2e@test.com'

let browser: Browser
let page: Page

beforeAll(async () => {
  browser = await puppeteer.launch({ headless: true })
  page = await browser.newPage()

  // Dev login via API, store token in localStorage
  const resp = await fetch(`${API}/auth/dev-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: DEV_EMAIL, display_name: 'E2E User' }),
  })
  const { access_token } = await resp.json() as { access_token: string }

  await page.goto(BASE)
  await page.evaluate((token: string) => {
    localStorage.setItem('scorient_token', token)
  }, access_token)
})

afterAll(async () => {
  await browser.close()
})

describe('Login flow', () => {
  test('shows login page when no token', async () => {
    const p = await browser.newPage()
    await p.goto(BASE)
    await p.waitForSelector('text/Sign in to predict', { timeout: 5000 })
    await p.close()
  })
})

describe('Dashboard', () => {
  test('shows dashboard after login', async () => {
    await page.goto(BASE)
    await page.waitForSelector('text/My Predictions', { timeout: 5000 })
    const content = await page.content()
    expect(content).toContain('My Predictions')
  })

  test('navigates to predictions page', async () => {
    await page.goto(BASE)
    await page.waitForSelector('a[href="/predictions"]')
    await page.click('a[href="/predictions"]')
    await page.waitForURL(`${BASE}/predictions`)
    const content = await page.content()
    expect(content).toContain('Group Stage')
  })
})

describe('Predictions page', () => {
  test('shows group stage tab by default', async () => {
    await page.goto(`${BASE}/predictions`)
    await page.waitForSelector('text/Group Stage', { timeout: 5000 })
    const content = await page.content()
    expect(content).toContain('Group Stage')
  })

  test('can switch to bonus predictions tab', async () => {
    await page.goto(`${BASE}/predictions`)
    await page.waitForSelector('button', { timeout: 5000 })
    const bonusTab = await page.$('button ::-p-text(Bonus Predictions)')
    if (bonusTab) {
      await bonusTab.click()
      await page.waitForSelector('text/Top Goalscorer', { timeout: 3000 })
    }
  })
})
