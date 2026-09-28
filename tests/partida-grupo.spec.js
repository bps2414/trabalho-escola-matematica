// Joga uma partida no modo "passar o celular" com 3 jogadores (Ana, Beto e Caio):
//  Fase 1: erra uma vez e depois abre o cofre.
//  Fase 2: revê uma pista e deixa o tempo acabar.
//  Fase 3: erra as 3 tentativas.
//  Placar: 1 de 3 cofres abertos.
// Evidências (prints + vídeo) ficam em evidencias/, com o prefixo "grupo-".
const { test, expect } = require('@playwright/test');
const path = require('path');

const PASTA = path.join(__dirname, '..', 'evidencias');
const URL_JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const NOMES = ['Ana', 'Beto', 'Caio'];

let print = 0;
async function registrar(page, nome, espera = 700) {
  const semRolagemLateral = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(semRolagemLateral, `rolagem lateral em "${nome}"`).toBe(true);
  await page.waitForTimeout(espera); // espera as animações chegarem no ponto da foto
  print += 1;
  await page.screenshot({ path: path.join(PASTA, `grupo-${String(print).padStart(2, '0')}-${nome}.png`) });
}

const cortinaAberta = (page) => expect(page.locator('#cortina')).not.toHaveClass(/fechada/);

async function segurar(page, botao) {
  await cortinaAberta(page);
  const caixa = await botao.boundingBox();
  await page.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2);
  await page.mouse.down();
}

const pistasVisiveis = (page, alvo) =>
  page.locator(`${alvo} .ficha[data-pista]`).evaluateAll((els) => els.map((e) => e.dataset.pista));

// Passa o celular por todos os jogadores e devolve as pistas que cada um viu.
async function distribuirPistas(page, printDoPrimeiro) {
  await page.getByRole('button', { name: 'Distribuir pistas' }).click();
  const pistasDe = [];
  for (let j = 0; j < NOMES.length; j++) {
    await expect(page.locator('#passe-jogador')).toHaveText(NOMES[j]);
    await cortinaAberta(page);
    await expect(page.locator('#passe-fichas .ficha[data-pista]')).toHaveCount(0);
    await expect(page.locator('#passe-fichas .ficha-oculta')).toHaveCount(2);
    await expect(page.locator('#btn-passar')).toBeDisabled();
    if (j === 0 && printDoPrimeiro) await registrar(page, `${printDoPrimeiro}-escondida`);

    await segurar(page, page.locator('#passe-segurar'));
    await expect(page.locator('#passe-fichas .ficha[data-pista]').first()).toBeVisible();
    if (j === 0 && printDoPrimeiro) await registrar(page, `${printDoPrimeiro}-visivel`, 400);
    pistasDe.push(await pistasVisiveis(page, '#passe-fichas'));
    await page.mouse.up();

    await expect(page.locator('#passe-fichas .ficha[data-pista]')).toHaveCount(0);
    const proximo = NOMES[j + 1];
    await expect(page.locator('#btn-passar')).toHaveText(proximo ? `Passar para ${proximo}` : 'Todos viram: começar');
    await page.locator('#btn-passar').click();
  }
  await expect(page.locator('[data-tela="discussao"]')).toBeVisible();
  await cortinaAberta(page);
  // Só as partes do modo grupo aparecem.
  await expect(page.locator('#quadro')).toBeVisible();
  await expect(page.locator('#pistas-lider')).toBeHidden();
  await expect(page.locator('.times')).toBeHidden();

  const todas = pistasDe.flat();
  expect(todas).toHaveLength(6);
  expect(new Set(todas).size).toBe(6);
  return pistasDe;
}

function senhaDas(page, pistasDe) {
  return page.evaluate((textos) => {
    const enigmas = FASES.flatMap((f) => f.enigmas.map((e) => ({ ...e, fase: f })));
    const e = enigmas.find((en) => en.pistas.every((p) => textos.includes(p.texto)));
    return { resposta: e.resposta, min: e.fase.min };
  }, pistasDe.flat());
}

async function teclar(page, numero) {
  await expect(page.locator('#folha-senha')).toBeVisible();
  await expect(page.locator('#senha-titulo')).toHaveText('Digite a senha');
  for (const d of String(numero)) await page.locator(`[data-tecla="${d}"]`).click();
  await page.getByRole('button', { name: 'Abrir o cofre' }).click();
}

test('partida completa no modo passar o celular', async ({ page }) => {
  const errosConsole = [];
  page.on('pageerror', (e) => errosConsole.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errosConsole.push(m.text()); });

  await page.route(/fonts\.(googleapis|gstatic)\.com/, async (r) => r.fulfill({ response: await r.fetch() }));
  await page.clock.install();
  await page.goto(URL_JOGO);

  await page.getByRole('button', { name: 'Passar o celular: todos juntos' }).click();
  await cortinaAberta(page);
  await registrar(page, 'como-jogar', 500);
  await page.getByRole('button', { name: 'Entendi' }).click();
  await cortinaAberta(page);

  // ---------- Nomes ----------
  await page.getByRole('radio', { name: String(NOMES.length) }).click();
  await expect(page.locator('#nomes input')).toHaveCount(NOMES.length);
  for (let i = 0; i < NOMES.length; i++) await page.getByLabel(`Nome do jogador ${i + 1}`).fill(NOMES[i]);
  await registrar(page, 'nomes', 500);
  await page.getByRole('button', { name: 'Começar fase 1' }).click();

  // ---------- Fase 1: erra uma vez, depois acerta ----------
  await expect(page.locator('#fase-nome')).toHaveText('Cofre de bronze');
  await cortinaAberta(page);
  let pistas = await distribuirPistas(page, 'pista');
  let { resposta, min } = await senhaDas(page, pistas);

  await expect(page.locator('#quadro button')).toHaveCount(20);
  await page.locator('#quadro button').nth(0).click();
  await expect(page.locator('#quadro button[aria-pressed="true"]')).toHaveCount(1);
  await registrar(page, 'discussao', 500);

  await page.getByRole('button', { name: 'Digitar senha' }).click();
  await teclar(page, resposta === min ? min + 1 : min);
  await expect(page.locator('#cena-carimbo')).toHaveText('Errado');
  await expect(page.locator('#cena')).toBeHidden();
  await expect(page.locator('#senha-msg')).toContainText('ERRADO');
  await expect(page.locator('#lampadas-grupo .lampada.gasta')).toHaveCount(1);

  await teclar(page, resposta);
  await expect(page.locator('#cena-carimbo')).toHaveText('Aberto!');
  await expect(page.locator('#resultado-titulo')).toHaveText('Cofre aberto!');
  await registrar(page, 'resultado-aberto', 1600);
  await page.getByRole('button', { name: 'Ir para a fase 2' }).click();

  // ---------- Fase 2: revê pista e deixa o tempo acabar ----------
  await expect(page.locator('#fase-nome')).toHaveText('Cofre de prata');
  await cortinaAberta(page);
  pistas = await distribuirPistas(page);

  const donoTabuada = pistas.findIndex((lista) => lista.some((t) => t.includes('tabuada')));
  await page.getByRole('button', { name: 'Rever pista' }).click();
  await page.getByRole('button', { name: NOMES[donoTabuada], exact: true }).click();
  await segurar(page, page.locator('#rever-segurar'));
  expect(await pistasVisiveis(page, '#rever-fichas')).toEqual(pistas[donoTabuada]);
  await registrar(page, 'rever-pista', 400);
  await page.mouse.up();
  await page.getByRole('button', { name: 'Voltar para a discussão' }).click();

  await page.clock.runFor(181000);
  await expect(page.locator('#resultado-titulo')).toHaveText('Alarme disparado');
  await expect(page.locator('#resultado-motivo')).toContainText('O tempo acabou.');
  await page.getByRole('button', { name: 'Ir para a fase 3' }).click();

  // ---------- Fase 3: erra as 3 ----------
  await expect(page.locator('#fase-nome')).toHaveText('Cofre de ouro');
  pistas = await distribuirPistas(page);
  ({ resposta, min } = await senhaDas(page, pistas));
  const errados = [min, min + 1, min + 2, min + 3].filter((n) => n !== resposta).slice(0, 3);
  await page.getByRole('button', { name: 'Digitar senha' }).click();
  for (const n of errados) await teclar(page, n);
  await expect(page.locator('#resultado-titulo')).toHaveText('Alarme disparado');
  await expect(page.locator('#resultado-motivo')).toContainText('As 3 tentativas acabaram.');

  // ---------- Placar ----------
  await page.getByRole('button', { name: 'Ver placar' }).click();
  await expect(page.locator('#placar-numero')).toContainText('1 de 3');
  await expect(page.locator('.medalha.aberta')).toHaveText(['✓']);
  await cortinaAberta(page);
  await registrar(page, 'placar', 1500);

  // Jogar de novo volta para a tela dos nomes.
  await page.getByRole('button', { name: 'Jogar de novo' }).click();
  await expect(page.locator('[data-tela="jogadores"]')).toBeVisible();

  expect(errosConsole).toEqual([]);

  await page.close();
  await page.video().saveAs(path.join(PASTA, 'partida-grupo.webm'));
});
