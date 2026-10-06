import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'docs', 'images');
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

async function captureSimpleChange(page, route, title, km, fileName) {
  await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' });
  await waitForText(page, title);
  await waitForText(page, 'Registrar troca');
  await fillByPlaceholder(page, 'Ex.: 45000', String(km));
  await tapText(page, 'Salvar troca');
  await page.waitForTimeout(1500);
  const kmPattern = new RegExp(String(km).replace(/(\d)(?=(\d{3})+$)/g, '$1.?'));
  await page.getByText(kmPattern).first().waitFor({ state: 'visible', timeout: 30000 });
  await screenshot(page, fileName);
}

async function captureTabbedChange(page, route, tabLabel, km, fileName) {
  await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' });
  await waitForText(page, tabLabel);
  await tapText(page, tabLabel, { exact: true });
  await waitForText(page, 'Registrar troca');
  await fillByPlaceholder(page, 'Ex.: 45000', String(km));
  await tapText(page, 'Salvar troca');
  await page.waitForTimeout(1500);
  const kmPattern = new RegExp(String(km).replace(/(\d)(?=(\d{3})+$)/g, '$1.?'));
  await page.getByText(kmPattern).first().waitFor({ state: 'visible', timeout: 30000 });
  await screenshot(page, fileName);
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
  await page.getByText(/42.?000/).first().waitFor({ state: 'visible', timeout: 30000 });
  await screenshot(page, 'oleo-motor.png');

  await page.goto(`${baseURL}/oleo-cambio`, { waitUntil: 'domcontentloaded' });
  await waitForText(page, 'Registrar troca');
  await fillByPlaceholder(page, 'Ex.: 45000', '41000');
  await fillByPlaceholder(page, 'Ex.: Castrol', 'Castrol');
  await tapText(page, 'Salvar troca');
  await page.waitForTimeout(1500);
  await page.getByText(/41.?000/).first().waitFor({ state: 'visible', timeout: 30000 });
  await screenshot(page, 'oleo-cambio.png');

  await page.goto(`${baseURL}/arrefecimento`, { waitUntil: 'domcontentloaded' });
  await waitForText(page, 'Registrar troca');
  await fillByPlaceholder(page, 'Ex.: 45000', '40000');
  await tapText(page, 'Flush realizado');
  await tapText(page, 'Salvar troca');
  await page.waitForTimeout(1500);
  await page.getByText(/40.?000/).first().waitFor({ state: 'visible', timeout: 30000 });
  await screenshot(page, 'arrefecimento.png');

  await captureSimpleChange(page, '/velas', 'Velas', 38000, 'velas.png');
  await captureSimpleChange(page, '/bobinas', 'Bobinas', 37000, 'bobinas.png');
  await captureTabbedChange(page, '/correias', 'Correia dentada', 36000, 'correias.png');
  await captureSimpleChange(page, '/filtro-combustivel', 'Filtro de combustível', 35000, 'filtro-combustivel.png');
  await captureTabbedChange(page, '/filtro-ar', 'Filtro do motor', 34000, 'filtro-ar.png');
  await captureTabbedChange(page, '/suspensao-dianteira', 'Amortecedor', 33000, 'suspensao-dianteira.png');
  await captureTabbedChange(page, '/suspensao-traseira', 'Amortecedor', 32000, 'suspensao-traseira.png');
  await captureTabbedChange(page, '/freios', 'Pastilha dianteira', 31000, 'freios.png');

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
