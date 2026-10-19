/* Build first, then: node tests/mobile-portal.browser.cjs. No real API is contacted. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createRequire } = require('node:module');
const root = process.env.CLIENT_PLATFORM_ROOT || path.resolve(__dirname, '..');
const { chromium } = createRequire(path.join(root, 'package.json'))('playwright');
const out = process.env.MOBILE_QA_OUTPUT || path.join(require('node:os').tmpdir(), 'idromardi-mobile-portal-qa');
const fixture = {
  customer: { name: 'Panos Plaggetis', firstName: 'Panos', lastName: 'Plaggetis', email: 'demo@example.test', phone: '', mobile: '', fiscalCode: '', accountNo: 'IDR-99-4/5', meterNo: '4A, 4B', address: 'Via delle Acque 12, Napoli', tariff: 'Utenza domestica con ripartizione consumi', status: 'Attivo' },
  latestInvoice: { id: 'demo', period: 'maggio 2026', issued: '01/06/2026', amount: 926.3, consumption: 194, status: 'Disponibile' },
  invoices: [{ id: 'demo', period: 'maggio 2026', issued: '01/06/2026', amount: 926.3, consumption: 194, status: 'Disponibile' }],
  billDocumentRows: ['4A', '4B'].map((interno, i) => ({ id: `doc-${i}`, period: 'maggio 2026', interno, filename: `Bolletta_maggio_2026_interno_${interno}.pdf`, createdAt: '01/06/2026', fileUrl: '/sample.pdf', status: 'available' })),
  readings: [], serviceNotes: [],
};
async function main() {
  fs.mkdirSync(out, { recursive: true });
  const dist = path.join(root, 'frontend/dist');
  const server = http.createServer((req, res) => {
    const requested = path.resolve(dist, `.${new URL(req.url, 'http://localhost').pathname}`);
    const file = requested.startsWith(dist + path.sep) && fs.existsSync(requested) && fs.statSync(requested).isFile() ? requested : path.join(dist, 'index.html');
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.png') ? 'image/png' : 'text/html');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const errors = [], unexpected = [], chatCalls = [], registrations = [];
  let manyBills = false, noBills = false, failChat = false;
  async function newPage(auth = true) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    if (auth) await context.addInitScript(() => { localStorage.setItem('portalToken', 'mobile-ui-test'); localStorage.setItem('portalMustChangePassword', 'false'); });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (['fetch', 'xhr'].includes(request.resourceType())) {
        let json, status = 200;
        if (url.pathname.endsWith('/portal/me')) json = noBills ? { ...fixture, latestInvoice: null, invoices: [], billDocumentRows: [] } : manyBills ? { ...fixture, billDocumentRows: ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto'].map((month, i) => ({ ...fixture.billDocumentRows[0], id: `period-${i}`, period: `${month} 2026`, interno: i === 0 ? 'UNICO-TEST' : '4A' })) } : fixture;
        else if (url.pathname.endsWith('/support/summary')) json = { unreadRequests: 2 };
        else if (url.pathname.endsWith('/support/identity')) json = { links: [] };
        else if (url.pathname.endsWith('/support/requests')) json = { items: [], total: 0 };
        else if (url.pathname.endsWith('/portal/chat')) {
          assert.equal(request.headers().authorization, 'Bearer mobile-ui-test');
          chatCalls.push(request.postDataJSON());
          await new Promise(resolve => setTimeout(resolve, 100));
          if (failChat) { failChat = false; status = 503; json = { message: 'Servizio temporaneamente non disponibile.' }; }
          else json = { answer: 'La tua ultima bolletta è di 926,30 €. Il PDF si trova nella sezione Bollette.' };
        } else if (url.pathname.endsWith('/registration/request')) { registrations.push(request.postDataJSON()); json = { message: 'Account creato correttamente.', accessIdentifier: '40010001' }; }
        else { unexpected.push(url.pathname); json = {}; }
        return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(json) });
      }
      if (url.origin !== origin) return route.abort(); // No external assets or real services during QA.
      return route.continue();
    });
    return page;
  }
  async function noOverflow(page, label) {
    const sizes = await page.evaluate(() => ({ w: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
    assert(sizes.document <= sizes.w + 1 && sizes.body <= sizes.w + 1, `${label}: horizontal overflow ${JSON.stringify(sizes)}`);
  }
  async function screenshot(page, name, fullPage = false) { await page.screenshot({ path: path.join(out, `${name}.png`), fullPage }); }
  try {
    const page = await newPage();
    for (const [width, height] of [[320, 740], [390, 844], [430, 932], [768, 1024], [1440, 1000], [844, 390]]) {
      await page.setViewportSize({ width, height }); await page.goto(origin + '/portal');
      await page.getByRole('heading', { name: 'Ciao, Panos' }).waitFor();
      await noOverflow(page, `Dashboard ${width}`);
      const nav = await page.locator('.sidebar').boundingBox(), launcher = await page.locator('.chat-launcher').boundingBox();
      assert(launcher.x >= 12 && launcher.x + launcher.width <= width - 12);
      if (width <= 1080) {
        const heading = await page.locator('h1').boundingBox();
        assert(heading.y < 140, 'Greeting must be visible near top');
        assert(launcher.y + launcher.height <= nav.y - 12, 'Assistant must clear bottom navigation');
        assert(nav.height <= 80, 'Mobile navigation must be compact');
        assert.equal(await page.locator('.sidebar nav a').count(), 4);
        for (const link of await page.locator('.sidebar nav a').all()) assert((await link.boundingBox()).height >= 44);
      }
      await screenshot(page, `dashboard-${width}`);
      await page.getByRole('button', { name: 'Apri assistente Idromardi' }).click();
      const dialog = page.getByRole('dialog', { name: 'Assistente Idromardi' }); await dialog.waitFor();
      assert.equal(new URL(page.url()).pathname, '/portal', 'Chat must not navigate to requests');
      const box = await dialog.boundingBox();
      assert(box.x >= 10 && box.y >= 5 && box.x + box.width <= width - 10 && box.y + box.height <= height - 10, `Chat outside viewport: ${width}: ${JSON.stringify(box)}`);
      await noOverflow(page, `Chat ${width}`);
      if (width === 390) await screenshot(page, 'chat-390');
      await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' });
      assert(await page.locator('.chat-launcher').evaluate(el => document.activeElement === el), 'Restore keyboard focus after Escape');
    }
    await page.setViewportSize({ width: 390, height: 844 }); await page.goto(origin + '/portal'); await page.locator('.invoice-panel').waitFor();
    assert.equal(await page.locator('.invoice-pagination').count(), 0, 'No redundant one-page controls');
    assert.equal(await page.getByRole('link', { name: /Scarica PDF/ }).first().getAttribute('href'), '/sample.pdf');
    await page.locator('.sidebar nav a').filter({ hasText: 'Bollette' }).click();
    assert.equal(new URL(page.url()).hash, '#invoices');
    assert((await page.locator('#invoices').boundingBox()).y >= 65, 'Invoice anchor must clear fixed header');
    await page.locator('.chat-launcher').click();
    await page.getByRole('button', { name: 'Qual è la mia ultima bolletta?' }).click();
    await page.locator('.chat-message.assistant').waitFor(); assert.equal(chatCalls.length, 1);
    await page.getByRole('button', { name: 'Chiudi assistente' }).click(); await page.locator('.chat-launcher').click();
    assert.equal(await page.locator('.chat-message.assistant').count(), 1, 'Keep conversation while navigating/reopening');
    failChat = true; await page.getByLabel("Messaggio all'assistente").fill('Il PDF?'); await page.getByRole('button', { name: 'Invia messaggio' }).click();
    await page.locator('.chat-error').waitFor(); await page.getByRole('button', { name: 'Riprova', exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll('.chat-message.assistant').length === 2);
    assert.equal(await page.locator('.chat-message.user').count(), 2, 'Retry must not duplicate the question');
    assert.equal(chatCalls.length, 3); await screenshot(page, 'chat-replies-390');
    // Simulate visual viewport reduction from a phone keyboard.
    await page.evaluate(() => { Object.defineProperty(visualViewport, 'height', { configurable: true, value: 470 }); visualViewport.dispatchEvent(new Event('resize')); });
    assert((await page.locator('.chat-input-row').boundingBox()).y + (await page.locator('.chat-input-row').boundingBox()).height < 470, 'Composer must stay above keyboard');
    await screenshot(page, 'chat-keyboard-390');
    await page.getByRole('button', { name: 'Chiudi assistente' }).click();
    await page.locator('.sidebar nav a').filter({ hasText: 'Profilo' }).click(); await page.getByRole('heading', { name: 'Dati personali' }).waitFor(); await noOverflow(page, 'Profile'); await screenshot(page, 'profile-390');
    await page.locator('.chat-launcher').click(); assert.equal(await page.locator('.chat-message.assistant').count(), 2);
    await page.locator('.chat-footer a').click(); await page.getByRole('heading', { name: 'Le tue richieste' }).waitFor();
    await noOverflow(page, 'Requests'); await screenshot(page, 'requests-390');
    await page.locator('.chat-launcher').click(); await page.getByRole('dialog', { name: 'Assistente Idromardi' }).waitFor(); assert(new URL(page.url()).pathname.endsWith('/richieste'));
    await page.getByRole('button', { name: 'Chiudi assistente' }).click();
    manyBills = true; await page.goto(origin + '/portal'); await page.locator('.invoice-period-group').first().waitFor();
    assert.equal(await page.locator('.invoice-period-group').count(), 6); await page.getByRole('button', { name: 'Successiva' }).click(); assert.equal(await page.locator('.invoice-period-group').count(), 2);
    await page.getByLabel('Cerca una bolletta').fill('UNICO-TEST'); assert.equal(await page.locator('.invoice-card-row').count(), 1); assert.equal(await page.locator('.invoice-pagination').count(), 0);
    await page.getByLabel('Cerca una bolletta').fill('inesistente'); await page.getByText('Nessuna bolletta corrisponde alla ricerca.').waitFor();
    noBills = true; await page.goto(origin + '/portal'); await page.getByText('Le tue bollette saranno disponibili qui.').waitFor(); await noOverflow(page, 'Empty account');
    await page.getByRole('button', { name: 'Esci dal portale' }).click(); await page.getByRole('heading', { name: 'Accedi al portale' }).waitFor(); assert.equal(await page.locator('.chat-launcher, .chat-widget').count(), 0); assert.equal(await page.evaluate(() => localStorage.getItem('portalToken')), null);
    const publicPage = await newPage(false); await publicPage.goto(origin); await publicPage.getByRole('heading', { name: 'Accedi al portale' }).waitFor();
    await noOverflow(publicPage, 'Login'); await screenshot(publicPage, 'login-390', true);
    await publicPage.getByRole('link', { name: /Registrati/ }).click(); await publicPage.getByRole('heading', { name: 'Crea il tuo account' }).waitFor(); await noOverflow(publicPage, 'Registration'); await screenshot(publicPage, 'registration-390', true);
    await publicPage.getByLabel('Numero utenza', { exact: true }).fill('40010001'); await publicPage.getByLabel('Nome', { exact: true }).fill('Mario'); await publicPage.getByLabel('Cognome', { exact: true }).fill('Rossi'); await publicPage.getByLabel('Codice fiscale', { exact: true }).fill('RSSMRA80A01H501U');
    await publicPage.getByLabel('Password', { exact: true }).fill('Prova123!'); await publicPage.getByRole('button', { name: 'Mostra password' }).click(); assert.equal(await publicPage.getByLabel('Password', { exact: true }).getAttribute('type'), 'text');
    await publicPage.getByLabel('Conferma password', { exact: true }).fill('Diversa123!'); await publicPage.getByRole('button', { name: 'Crea il tuo account', exact: true }).click(); await publicPage.getByRole('alert').filter({ hasText: 'Le password non coincidono.' }).waitFor(); assert.equal(registrations.length, 0);
    await publicPage.getByLabel('Conferma password', { exact: true }).fill('Prova123!'); await publicPage.getByRole('button', { name: 'Crea il tuo account', exact: true }).click(); await publicPage.getByRole('button', { name: 'Account creato' }).waitFor(); assert.equal(registrations.length, 1); assert(await publicPage.getByRole('button', { name: 'Account creato' }).isDisabled());
    assert.deepEqual(errors, [], 'Browser exceptions'); assert.deepEqual(unexpected, [], 'Unexpected API requests');
    console.log('PASS: 6 responsive viewports; chat open/reply/retry/focus/navigation/keyboard; invoice anchors/downloads/pagination/search; profile/requests; registration validation/success. All APIs simulated.');
    console.log(`Screenshots: ${out}`);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
