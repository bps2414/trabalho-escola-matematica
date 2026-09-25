// Joga uma partida completa com 3 jogadores (Ana, Beto e Caio) num celular simulado:
//  Início: abre e fecha as regras, escreve os nomes.
//  Fase 1: erra uma vez (cena "Errado") e depois abre o cofre (cena de suspense até abrir).
//  Fase 2: revê uma pista e deixa o tempo acabar (cena do alarme).
//  Fase 3: confere a explicação de domínio, a fórmula e a dica, e erra as 3 tentativas.
// Evidências (prints + vídeo) ficam em evidencias/.
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
  await page.screenshot({ path: path.join(PASTA, `${String(print).padStart(2, '0')}-${nome}.png`) });
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
    if (j === 0 && printDoPrimeiro) {
      await expect(page.locator('#cortina')).toHaveClass(/fechada/);
      await registrar(page, 'cortina-passe', 450);
    }
  }
  await expect(page.locator('[data-tela="discussao"]')).toBeVisible();
  await cortinaAberta(page);

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

async function teclar(page, numero) {
  await expect(page.locator('#folha-senha')).toBeVisible();
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
  await registrar(page, 'inicio', 1200);

  // ---------- Regras ----------
  await page.getByRole('button', { name: 'Regras' }).click();
  const regras = page.getByRole('dialog', { name: 'Regras do Cofre' });
  await expect(regras).toBeVisible();
  await expect(regras).toContainText('Domínio de função');
  await expect(regras).toContainText('3 tentativas');
  await page.getByRole('button', { name: 'Fechar regras' }).click();
  await expect(regras).toBeHidden();

  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  await cortinaAberta(page);
  await page.getByRole('button', { name: 'Entendi' }).click();
  await cortinaAberta(page);

  // ---------- Nomes ----------
  await page.getByRole('radio', { name: String(NOMES.length) }).click();
  await expect(page.locator('#nomes input')).toHaveCount(NOMES.length);
  for (let i = 0; i < NOMES.length; i++) {
    await page.getByLabel(`Nome do jogador ${i + 1}`).fill(NOMES[i]);
  }
  await registrar(page, 'nomes', 500);
  await page.getByRole('button', { name: 'Começar fase 1' }).click();

  // ---------- Fase 1: erra uma vez, depois acerta ----------
  await expect(page.locator('#fase-nome')).toHaveText('Cofre de bronze');
  await cortinaAberta(page);
  let pistas = await distribuirPistas(page, 'pista');
  let { resposta, min } = await senhaDas(page, pistas);

  await expect(page.locator('#quadro button')).toHaveCount(20);
  await page.locator('#quadro button').nth(0).click();
  await page.locator('#quadro button').nth(2).click();
  await expect(page.locator('#quadro button[aria-pressed="true"]')).toHaveCount(2);

  await page.getByRole('button', { name: 'Digitar senha' }).click();
  await teclar(page, resposta === min ? min + 1 : min);
  await expect(page.locator('#cena')).toBeVisible();
  await expect(page.locator('#cena-carimbo')).toHaveText('Errado');
  await registrar(page, 'cena-errado', 300);
  await expect(page.locator('#cena')).toBeHidden();
  await expect(page.locator('#senha-msg')).toContainText('ERRADO');
  await expect(page.locator('.lampada.gasta')).toHaveCount(1);

  await teclar(page, resposta);
  await expect(page.locator('#cena')).toBeVisible();
  await expect(page.locator('#cena')).toHaveClass(/suspense/);
  await registrar(page, 'cena-suspense', 300);
  await expect(page.locator('#cena-palco .cofre')).toHaveClass(/aberto/);
  await registrar(page, 'cena-abrindo', 900);
  await expect(page.locator('#cena-carimbo')).toHaveText('Aberto!');
  await registrar(page, 'cena-aberto', 500);

  await expect(page.locator('#cena')).toBeHidden();
  await expect(page.locator('#resultado-titulo')).toBeVisible();
  await expect(page.locator('#resultado-titulo')).toHaveText('Cofre aberto!');
  await expect(page.locator('#resultado-cofre .cofre')).toHaveClass(/aberto/);
  await expect(page.locator('#resultado-pistas li')).toHaveCount(6);
  await expect(page.locator('#resultado-pistas li', { hasText: `sobra o ${resposta}` })).toHaveCount(1);
  await registrar(page, 'resultado-aberto', 1600);
  await page.getByRole('button', { name: 'Ir para a fase 2' }).click();

  // ---------- Fase 2: revê pista e deixa o tempo acabar ----------
  await expect(page.locator('#fase-nome')).toHaveText('Cofre de prata');
  await cortinaAberta(page);
  pistas = await distribuirPistas(page);
  await expect(page.locator('#quadro button')).toHaveCount(50);

  await page.getByRole('button', { name: 'Rever pista' }).click();
  await page.getByRole('button', { name: NOMES[1], exact: true }).click();
  await expect(page.locator('#rever-fichas .ficha-oculta')).toHaveCount(2);
  await segurar(page, page.locator('#rever-segurar'));
  expect(await pistasVisiveis(page, '#rever-fichas')).toEqual(pistas[1]);
  await page.mouse.up();
  await expect(page.locator('#rever-fichas .ficha[data-pista]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Voltar para a discussão' }).click();

  await page.clock.runFor(112000);
  await expect(page.locator('#relogio')).toHaveClass(/urgente/);
  await page.clock.runFor(9000);
  await expect(page.locator('#cena-carimbo')).toHaveText('Alarme!');
  await registrar(page, 'cena-alarme', 500);
  await expect(page.locator('#resultado-titulo')).toHaveText('Alarme disparado');
  await expect(page.locator('#resultado-motivo')).toContainText('O tempo acabou.');
  await page.getByRole('button', { name: 'Ir para a fase 3' }).click();

  // ---------- Fase 3: domínio e 3 erros ----------
  await expect(page.locator('#fase-nome')).toHaveText('Cofre de ouro');
  await expect(page.locator('#fase-dominio')).toBeVisible();
  await expect(page.locator('#fase-dominio')).toContainText('podem entrar na função');
  pistas = await distribuirPistas(page);
  expect(pistas.flat().some((t) => t.startsWith('Pode entrar em'))).toBe(true);

  // Acha quem tem a pista de domínio e confere fórmula e dica.
  const dono = pistas.findIndex((lista) => lista.some((t) => t.startsWith('Pode entrar em')));
  await page.getByRole('button', { name: 'Rever pista' }).click();
  await page.getByRole('button', { name: NOMES[dono], exact: true }).click();
  await segurar(page, page.locator('#rever-segurar'));
  await expect(page.locator('#rever-fichas .ficha-dominio .formula')).toBeVisible();
  await expect(page.locator('#rever-fichas .ficha-dica')).toContainText('Dica:');
  await page.mouse.up();
  await page.getByRole('button', { name: 'Voltar para a discussão' }).click();

  ({ resposta, min } = await senhaDas(page, pistas));
  const errados = [min, min + 1, min + 2, min + 3].filter((n) => n !== resposta).slice(0, 3);
  await page.getByRole('button', { name: 'Digitar senha' }).click();
  for (const n of errados) await teclar(page, n);
  await expect(page.locator('#cena')).toBeHidden();
  await expect(page.locator('#resultado-titulo')).toBeVisible();
  await expect(page.locator('#resultado-titulo')).toHaveText('Alarme disparado');
  await expect(page.locator('#resultado-motivo')).toContainText('As 3 tentativas acabaram.');
  await expect(page.locator('#resultado-pistas .porque')).toHaveCount(1);
  await registrar(page, 'resultado-alarme', 1200);

  // ---------- Placar ----------
  await page.getByRole('button', { name: 'Ver placar' }).click();
  await expect(page.locator('#placar-numero')).toContainText('1 de 3');
  await expect(page.locator('.medalha.aberta')).toHaveCount(1);
  await expect(page.locator('.medalha.fechada')).toHaveCount(2);
  await cortinaAberta(page);
  await registrar(page, 'placar', 1500);

  expect(errosConsole).toEqual([]);

  await page.close();
  await page.video().saveAs(path.join(PASTA, 'partida.webm'));
});
