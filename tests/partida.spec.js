// Joga uma partida completa com 3 jogadores num celular simulado:
//  Fase 1: erra uma vez e depois abre o cofre.
//  Fase 2: revê uma pista e deixa o tempo acabar.
//  Fase 3: confere a pista de domínio com dica e erra as 3 tentativas.
// Evidências (prints + vídeo) ficam em evidencias/.
const { test, expect } = require('@playwright/test');
const path = require('path');

const PASTA = path.join(__dirname, '..', 'evidencias');
const URL_JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const JOGADORES = 3;

let print = 0;
async function registrar(page, nome) {
  const semRolagemLateral = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(semRolagemLateral, `rolagem lateral em "${nome}"`).toBe(true);
  await page.waitForTimeout(350); // espera as animações de entrada terminarem
  print += 1;
  await page.screenshot({ path: path.join(PASTA, `${String(print).padStart(2, '0')}-${nome}.png`) });
}

async function segurar(page, botao) {
  const caixa = await botao.boundingBox();
  await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
  await page.mouse.down();
}

// Passa o celular por todos os jogadores e devolve as pistas que cada um viu.
async function distribuirPistas(page, printDoPrimeiro) {
  await page.getByRole('button', { name: 'Distribuir pistas' }).click();
  const pistasDe = [];
  for (let j = 1; j <= JOGADORES; j++) {
    await expect(page.locator('#passe-jogador')).toHaveText(`Jogador ${j}`);
    await expect(page.locator('#passe-fichas .ficha')).toHaveCount(0);
    await expect(page.locator('#btn-passar')).toBeDisabled();

    await segurar(page, page.locator('#passe-segurar'));
    await expect(page.locator('#passe-fichas .ficha').first()).toBeVisible();
    if (j === 1 && printDoPrimeiro) await registrar(page, printDoPrimeiro);
    pistasDe.push(await page.locator('#passe-fichas .ficha-texto').allTextContents());
    await page.mouse.up();

    await expect(page.locator('#passe-fichas .ficha')).toHaveCount(0);
    await page.locator('#btn-passar').click();
  }
  await expect(page.locator('[data-tela="discussao"]')).toBeVisible();

  const todas = pistasDe.flat();
  expect(todas).toHaveLength(6);
  expect(new Set(todas).size).toBe(6);
  return pistasDe;
}

// Descobre a senha a partir das pistas que apareceram na tela.
function senhaDas(page, pistasDe) {
  return page.evaluate((textos) => {
    const enigmas = FASES.flatMap((f) => f.enigmas.map((e) => ({ ...e, fase: f })));
    const e = enigmas.find((en) => en.pistas.every((p) => textos.includes(p.texto)));
    return { resposta: e.resposta, min: e.fase.min };
  }, pistasDe.flat());
}

async function digitar(page, numero) {
  await page.getByRole('button', { name: 'Digitar senha' }).click();
  for (const d of String(numero)) await page.locator(`[data-tecla="${d}"]`).click();
  await page.getByRole('button', { name: 'Abrir o cofre' }).click();
}

test('partida completa do Cofre', async ({ page }) => {
  const errosConsole = [];
  page.on('pageerror', (e) => errosConsole.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errosConsole.push(m.text()); });

  // As fontes do Google passam pelo Node, que confia no certificado de proxies corporativos.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, async (r) => r.fulfill({ response: await r.fetch() }));
  await page.clock.install();
  await page.goto(URL_JOGO);
  await page.waitForTimeout(600);
  await registrar(page, 'inicio');

  await page.getByRole('button', { name: 'Começar' }).click();
  await registrar(page, 'como-jogar');
  await page.getByRole('button', { name: 'Entendi' }).click();
  await page.getByRole('radio', { name: String(JOGADORES) }).click();
  await registrar(page, 'jogadores');
  await page.getByRole('button', { name: 'Começar fase 1' }).click();

  // ---------- Fase 1: erra uma vez, depois acerta ----------
  await expect(page.locator('#fase-nome')).toHaveText('Cofre de bronze');
  await registrar(page, 'fase-1');
  let pistas = await distribuirPistas(page, 'pista-escondida-visivel');
  let { resposta, min } = await senhaDas(page, pistas);

  await expect(page.locator('#quadro button')).toHaveCount(20);
  await page.locator('#quadro button').nth(0).click();
  await page.locator('#quadro button').nth(2).click();
  await expect(page.locator('#quadro button[aria-pressed="true"]')).toHaveCount(2);
  await registrar(page, 'discussao');

  await digitar(page, resposta === min ? min + 1 : min);
  await expect(page.locator('#senha-msg')).toContainText('ERRADO');
  await expect(page.locator('.lampada.gasta')).toHaveCount(1);
  await registrar(page, 'senha-errada');

  for (const d of String(resposta)) await page.locator(`[data-tecla="${d}"]`).click();
  await page.getByRole('button', { name: 'Abrir o cofre' }).click();
  await expect(page.locator('#resultado-titulo')).toHaveText('Cofre aberto!');
  await expect(page.locator('#resultado-pistas li')).toHaveCount(6);
  await expect(page.locator('#resultado-pistas li', { hasText: `sobra o ${resposta}` })).toHaveCount(1);
  await page.waitForTimeout(1800);
  await registrar(page, 'cofre-aberto');
  await page.getByRole('button', { name: 'Ir para a fase 2' }).click();

  // ---------- Fase 2: revê pista e deixa o tempo acabar ----------
  await expect(page.locator('#fase-nome')).toHaveText('Cofre de prata');
  pistas = await distribuirPistas(page);
  await expect(page.locator('#quadro button')).toHaveCount(50);

  await page.getByRole('button', { name: 'Rever pista' }).click();
  await page.getByRole('button', { name: 'Jogador 2' }).click();
  await segurar(page, page.locator('#rever-segurar'));
  await expect(page.locator('#rever-fichas .ficha-texto')).toHaveText(pistas[1]);
  await registrar(page, 'rever-pista');
  await page.mouse.up();
  await expect(page.locator('#rever-fichas .ficha')).toHaveCount(0);
  await page.getByRole('button', { name: 'Voltar para a discussão' }).click();

  await page.clock.runFor(112000);
  await expect(page.locator('#relogio')).toHaveClass(/urgente/);
  await registrar(page, 'ultimos-segundos');
  await page.clock.runFor(9000);
  await expect(page.locator('#resultado-titulo')).toHaveText('Alarme disparado');
  await expect(page.locator('#resultado-motivo')).toContainText('O tempo acabou.');
  await page.waitForTimeout(700);
  await registrar(page, 'tempo-acabou');
  await page.getByRole('button', { name: 'Ir para a fase 3' }).click();

  // ---------- Fase 3: pista de domínio e 3 erros ----------
  await expect(page.locator('#fase-nome')).toHaveText('Cofre de ouro');
  await expect(page.locator('#fase-extra')).toHaveText('Uma das pistas fala de domínio de função.');
  pistas = await distribuirPistas(page);
  expect(pistas.flat().some((t) => t.includes('domínio'))).toBe(true);

  // Acha quem tem a pista de domínio e confere que a dica aparece junto.
  const dono = pistas.findIndex((lista) => lista.some((t) => t.includes('domínio')));
  await page.getByRole('button', { name: 'Rever pista' }).click();
  await page.getByRole('button', { name: `Jogador ${dono + 1}` }).click();
  await segurar(page, page.locator('#rever-segurar'));
  await expect(page.locator('#rever-fichas .ficha-dica')).toContainText('Dica:');
  await registrar(page, 'pista-dominio');
  await page.mouse.up();
  await page.getByRole('button', { name: 'Voltar para a discussão' }).click();

  ({ resposta, min } = await senhaDas(page, pistas));
  const errados = [min, min + 1, min + 2, min + 3].filter((n) => n !== resposta).slice(0, 3);
  await digitar(page, errados[0]);
  for (const n of errados.slice(1)) {
    for (const d of String(n)) await page.locator(`[data-tecla="${d}"]`).click();
    await page.getByRole('button', { name: 'Abrir o cofre' }).click();
  }
  await expect(page.locator('#resultado-titulo')).toHaveText('Alarme disparado');
  await expect(page.locator('#resultado-motivo')).toContainText('As 3 tentativas acabaram.');
  await expect(page.locator('#resultado-pistas .porque')).toHaveCount(1);
  await page.waitForTimeout(700);
  await registrar(page, 'tentativas-acabaram');

  // ---------- Placar ----------
  await page.getByRole('button', { name: 'Ver placar' }).click();
  await expect(page.locator('#placar-numero')).toContainText('1 de 3');
  await registrar(page, 'placar');

  expect(errosConsole).toEqual([]);

  await page.close();
  await page.video().saveAs(path.join(PASTA, 'partida.webm'));
});
