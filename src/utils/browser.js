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

export async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
  }
}
