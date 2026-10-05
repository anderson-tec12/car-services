import { chromium } from 'playwright';
import path from 'node:path';

const outDir = '/Users/bbox/Projects/DevTech/car-services/docs/images';
const baseURL = 'http://localhost:8081';

async function waitForText(page, text, timeout = 60000) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout });
}

async function screenshot(page, name) {
  const file = path.join(outDir, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log('saved', file);
}

async function fillByPlaceholder(page, placeholder, value) {
  const field = page.getByPlaceholder(placeholder).first();
  await field.waitFor({ state: 'visible', timeout: 30000 });
  await field.click();
  await field.fill(value);
}

async function tapText(page, text, options = {}) {
  const locator = page.getByText(text, options).first();
  await locator.waitFor({ state: 'visible', timeout: 30000 });
  await locator.click({ force: true });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  page.on('dialog', async (dialog) => {
    console.log('dialog', dialog.message());
    await dialog.accept();
  });

  await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await waitForText(page, 'Cadastre seu veículo');
  await page.waitForTimeout(800);
  await screenshot(page, 'cadastro.png');

  await fillByPlaceholder(page, 'Ex.: Volkswagen', 'Volkswagen');
  await fillByPlaceholder(page, 'Ex.: Gol', 'Gol');
  await fillByPlaceholder(page, 'Ex.: ABC1D23', 'ABC1D23');
  await tapText(page, 'Salvar veículo');
  await waitForText(page, 'Módulos');
  await page.waitForTimeout(800);
  await screenshot(page, 'modulos.png');

  await tapText(page, 'ABC1D23');
  await waitForText(page, 'Veículos');
  await page.waitForTimeout(800);
  await screenshot(page, 'veiculos.png');

  await page.goto(`${baseURL}/home`, { waitUntil: 'domcontentloaded' });
  await waitForText(page, 'Módulos');

  await page.goto(`${baseURL}/oleo-motor`, { waitUntil: 'domcontentloaded' });
  await waitForText(page, 'Registrar troca');
  await fillByPlaceholder(page, 'Ex.: 45000', '42000');
  await tapText(page, 'Filtro trocado');
  await fillByPlaceholder(page, 'Ex.: Mobil', 'Mobil');
  await fillByPlaceholder(page, 'Ex.: 5W30', '5W30');
  await tapText(page, 'Sintético', { exact: true });
  await tapText(page, 'Salvar troca');
  await page.waitForTimeout(1500);
  // History shows formatted km; accept either form
  await page.getByText(/42.?000/).first().waitFor({ state: 'visible', timeout: 30000 });
  await screenshot(page, 'oleo-motor.png');

  await page.goto(`${baseURL}/arrefecimento`, { waitUntil: 'domcontentloaded' });
  await waitForText(page, 'Registrar troca');
  await fillByPlaceholder(page, 'Ex.: 45000', '40000');
  await tapText(page, 'Flush realizado');
  await tapText(page, 'Salvar troca');
  await page.waitForTimeout(1500);
  await page.getByText(/40.?000/).first().waitFor({ state: 'visible', timeout: 30000 });
  await screenshot(page, 'arrefecimento.png');

  await page.goto(`${baseURL}/avisos`, { waitUntil: 'domcontentloaded' });
  await waitForText(page, 'Óleo do motor');
  await page.waitForTimeout(800);
  await screenshot(page, 'avisos.png');

  await browser.close();
  console.log('done');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
