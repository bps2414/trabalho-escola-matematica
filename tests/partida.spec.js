// Joga uma partida completa no modo líder num celular simulado:
//  Início: abre e fecha as regras.
//  Fase 1: o líder vê as 6 pistas; Time A erra uma vez, Time B acerta e ganha.
//  Fase 2: o tempo acaba e ninguém abre.
//  Fase 3: Time B erra as 3 e fica fora, Time A acerta e ganha.
//  Placar: 1 × 1, empate.
// Evidências (prints + vídeo) ficam em evidencias/.
const { test, expect } = require('@playwright/test');
const path = require('path');

const PASTA = path.join(__dirname, '..', 'evidencias');
const URL_JOGO = 'file://' + path.join(__dirname, '..', 'index.html');

let print = 0;
async function registrar(page, nome, espera = 700) {
  const semRolagemLateral = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(semRolagemLateral, `rolagem lateral em "${nome}"`).toBe(true);
  await page.waitForTimeout(espera); // espera as animações chegarem no ponto da foto
  print += 1;
  await page.screenshot({ path: path.join(PASTA, `${String(print).padStart(2, '0')}-${nome}.png`) });
}

const cortinaAberta = (page) => expect(page.locator('#cortina')).not.toHaveClass(/fechada/);

// Abre a fase, mostra as pistas ao líder e descobre a senha pelas pistas da tela.
async function mostrarPistas(page) {
  await cortinaAberta(page);
  await page.getByRole('button', { name: 'Mostrar pistas' }).click();
  await expect(page.locator('[data-tela="discussao"]')).toBeVisible();
  await cortinaAberta(page);
  const textos = await page.locator('#pistas-lider .ficha[data-pista]').evaluateAll((els) => els.map((e) => e.dataset.pista));
  expect(textos).toHaveLength(6);
  await expect(page.locator('#pistas-lider .rotulo').first()).toHaveText('Pista 1');
  return page.evaluate((lista) => {
    const enigmas = FASES.flatMap((f) => f.enigmas.map((e) => ({ ...e, fase: f })));
    const e = enigmas.find((en) => en.pistas.every((p) => lista.includes(p.texto)));
    return { resposta: e.resposta, min: e.fase.min };
  }, textos);
}

async function responder(page, time, numero) {
  await page.getByRole('button', { name: `Resposta do Time ${time}` }).click();
  await expect(page.locator('#folha-senha')).toBeVisible();
  await expect(page.locator('#senha-titulo')).toHaveText(`Resposta do Time ${time}`);
  for (const d of String(numero)) await page.locator(`[data-tecla="${d}"]`).click();
  await page.getByRole('button', { name: 'Abrir o cofre' }).click();
}

test('partida completa do Cofre no modo líder', async ({ page }) => {
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
  await expect(regras).toContainText('líder');
  await expect(regras).toContainText('3 tentativas');
  await expect(regras).not.toContainText('omínio');
  await page.getByRole('button', { name: 'Fechar regras' }).click();
  await expect(regras).toBeHidden();

  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  await cortinaAberta(page);
  await registrar(page, 'como-jogar', 500);
  await page.getByRole('button', { name: 'Começar fase 1' }).click();

  // ---------- Fase 1: A erra, B acerta ----------
  await expect(page.locator('#fase-nome')).toHaveText('Cofre de bronze');
  let { resposta, min } = await mostrarPistas(page);
  await expect(page.locator('#relogio')).toHaveText(/^[23]:\d\d$/);
  await registrar(page, 'pistas-do-lider', 600);

  await responder(page, 'A', resposta === min ? min + 1 : min);
  await expect(page.locator('#cena-carimbo')).toHaveText('Errado');
  await expect(page.locator('#cena-status')).toHaveText('Time A errou. Restam 2 tentativas');
  await registrar(page, 'cena-errado', 300);
  await expect(page.locator('#cena')).toBeHidden();
  await expect(page.locator('#folha-senha')).toBeHidden();
  await expect(page.locator('#lampadas-0 .lampada.gasta')).toHaveCount(1);
  await expect(page.locator('#lampadas-1 .lampada.gasta')).toHaveCount(0);

  await responder(page, 'B', resposta);
  await expect(page.locator('#cena')).toHaveClass(/suspense/);
  await registrar(page, 'cena-suspense', 300);
  await expect(page.locator('#cena-status')).toHaveText('Time B abriu!');
  await expect(page.locator('#cena-carimbo')).toHaveText('Aberto!');
  await registrar(page, 'cena-aberto', 500);

  await expect(page.locator('#cena')).toBeHidden();
  await expect(page.locator('#resultado-titulo')).toHaveText('Time B venceu!');
  await expect(page.locator('#resultado-cofre .cofre')).toHaveClass(/aberto/);
  await expect(page.locator('#resultado-pistas li')).toHaveCount(6);
  await expect(page.locator('#resultado-pistas li', { hasText: `sobra o ${resposta}` })).toHaveCount(1);
  await registrar(page, 'resultado-b', 1600);
  await page.getByRole('button', { name: 'Ir para a fase 2' }).click();

  // ---------- Fase 2: o tempo acaba ----------
  await expect(page.locator('#fase-nome')).toHaveText('Cofre de prata');
  await mostrarPistas(page);
  await expect(page.locator('#pistas-lider .ficha-ajuda').first()).toContainText('Tabuada do');
  await page.clock.runFor(172000);
  await expect(page.locator('#relogio')).toHaveClass(/urgente/);
  await page.clock.runFor(9000);
  await expect(page.locator('#cena-carimbo')).toHaveText('Alarme!');
  await registrar(page, 'cena-alarme', 500);
  await expect(page.locator('#resultado-titulo')).toHaveText('Ninguém abriu');
  await expect(page.locator('#resultado-motivo')).toContainText('O tempo acabou.');
  await page.getByRole('button', { name: 'Ir para a fase 3' }).click();

  // ---------- Fase 3: B erra 3 e fica fora, A acerta ----------
  await expect(page.locator('#fase-nome')).toHaveText('Cofre de ouro');
  ({ resposta, min } = await mostrarPistas(page));
  const errados = [min, min + 1, min + 2, min + 3].filter((n) => n !== resposta).slice(0, 3);
  for (const n of errados) {
    await responder(page, 'B', n);
    await expect(page.locator('#cena')).toBeVisible();
    await expect(page.locator('#cena')).toBeHidden();
  }
  await expect(page.locator('[data-digitar="1"]')).toBeDisabled();
  await expect(page.locator('[data-digitar="1"]')).toHaveText('Time B está fora');
  await registrar(page, 'time-b-fora', 400);

  await responder(page, 'A', resposta);
  await expect(page.locator('#resultado-titulo')).toHaveText('Time A venceu!');
  await registrar(page, 'resultado-a', 1200);

  // ---------- Placar ----------
  await page.getByRole('button', { name: 'Ver placar' }).click();
  await expect(page.locator('#placar-numero')).toContainText('1 × 1');
  await expect(page.locator('#placar-texto')).toContainText('Empate');
  await expect(page.locator('.medalha.aberta')).toHaveText(['B', 'A']);
  await expect(page.locator('.medalha.fechada')).toHaveCount(1);
  await cortinaAberta(page);
  await registrar(page, 'placar', 1500);

  // Jogar de novo volta direto para a fase 1.
  await page.getByRole('button', { name: 'Jogar de novo' }).click();
  await expect(page.locator('#fase-nome')).toHaveText('Cofre de bronze');

  expect(errosConsole).toEqual([]);

  await page.close();
  await page.video().saveAs(path.join(PASTA, 'partida.webm'));
});
