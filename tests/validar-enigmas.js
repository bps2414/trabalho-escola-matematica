// Confere o banco de enigmas antes da apresentação.
// Formas de um enigma estar quebrado (cada uma vira uma checagem abaixo):
//  1. A fase não tem exatamente 3 enigmas.
//  2. O enigma não tem exatamente 6 pistas.
//  3. A resposta está fora da faixa de números da fase.
//  4. A resposta não obedece alguma pista (pista escrita errada).
//  5. Mais de um número obedece todas as pistas (duas respostas possíveis).
//  6. Nenhum número obedece todas as pistas.
//  7. Uma pista sozinha já entrega a resposta (fica sem graça).
//  8. Na fase 3, a pista de domínio não é necessária (sem ela ainda dá para achar).
//  9. Pista de domínio sem dica, sem explicação ou sem a fórmula desenhada.
// 10. A fase 3 não tem nenhuma pista de domínio.
// 11. Dois enigmas com o mesmo texto de pista repetido dentro dele.

const FASES = require('../js/enigmas.js');

const erros = [];
const falha = (onde, msg) => erros.push(`${onde}: ${msg}`);

function candidatos(fase, pistas) {
  const lista = [];
  for (let n = fase.min; n <= fase.max; n++) {
    if (pistas.every((p) => p.teste(n))) lista.push(n);
  }
  return lista;
}

FASES.forEach((fase, i) => {
  const nomeFase = `Fase ${i + 1}`;
  if (fase.enigmas.length !== 3) falha(nomeFase, `tem ${fase.enigmas.length} enigmas, esperado 3`);

  fase.enigmas.forEach((enigma, j) => {
    const onde = `${nomeFase}, enigma ${j + 1} (resposta ${enigma.resposta})`;
    const pistas = enigma.pistas;

    if (pistas.length !== 6) falha(onde, `tem ${pistas.length} pistas, esperado 6`);
    if (enigma.resposta < fase.min || enigma.resposta > fase.max) falha(onde, 'resposta fora da faixa');

    pistas.forEach((p) => {
      if (!p.teste(enigma.resposta)) falha(onde, `a resposta não obedece "${p.texto}"`);
      if (candidatos(fase, [p]).length === 1) falha(onde, `a pista "${p.texto}" sozinha já entrega a resposta`);
      if (p.dominio && (!p.dica || !p.explica || !p.formula)) falha(onde, `pista de domínio "${p.texto}" sem dica, explicação ou fórmula`);
    });
    if (new Set(pistas.map((p) => p.texto)).size !== pistas.length) falha(onde, 'pista repetida');

    const sobra = candidatos(fase, pistas);
    if (sobra.length === 0) falha(onde, 'nenhum número obedece todas as pistas');
    if (sobra.length > 1) falha(onde, `mais de uma resposta possível: ${sobra.join(', ')}`);

    if (i === 2) {
      const dominio = pistas.filter((p) => p.dominio);
      if (dominio.length === 0) falha(onde, 'fase 3 sem pista de domínio');
      const semDominio = candidatos(fase, pistas.filter((p) => !p.dominio));
      if (semDominio.length === 1) falha(onde, 'a pista de domínio não é necessária');
    }
  });
});

if (erros.length) {
  console.error(`✗ ${erros.length} problema(s):\n- ${erros.join('\n- ')}`);
  process.exit(1);
}
const total = FASES.reduce((s, f) => s + f.enigmas.length, 0);
console.log(`✓ ${total} enigmas conferidos: todos têm exatamente uma resposta.`);
