import { chromium } from 'playwright';

let browser = null;
let authCredentials = null;

export function setAuth(username, password) {
  authCredentials = { username, password };
}

export function getAuth() {
  return authCredentials;
}

export async function launchBrowser() {
  if (!browser) {
    browser = await chromium.launch({ headless: true });
  }
  return browser;
}

export async function createPage() {
  const b = await launchBrowser();
  const contextOptions = {};
  if (authCredentials) {
    contextOptions.httpCredentials = authCredentials;
  }
  const context = await b.newContext(contextOptions);
  const page = await context.newPage();
  return { page, context };
}

export async function wpLogin(page, url, password) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  // Password Protectedプラグイン or WordPress標準のパスワード保護
  const selectors = [
    'input[name="password_protected_pwd"]',
    'input[name="post_password"]',
  ];
  for (const selector of selectors) {
    const field = await page.$(selector);
    if (field) {
      await field.fill(password);
      await page.click('input[type="submit"]');
      await page.waitForLoadState('networkidle');
      console.log('  WPパスワード保護: 突破OK');
      return;
    }
  }
  console.log('  WPパスワード保護: フォームが見つかりませんでした');
}

export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
