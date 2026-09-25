// Banco de enigmas do Cofre. Cada pista tem o texto que o jogador vê
// e um teste que diz se um número obedece a pista.
// Rode `node tests/validar-enigmas.js` depois de mexer aqui.

const par = (n) => n % 2 === 0;
const multiplo = (k) => (n) => n % k === 0;
const somaAlgarismos = (n) => String(n).split('').reduce((s, d) => s + Number(d), 0);

// Pistas de tabuada já vêm com a lista escrita, para ninguém precisar fazer conta de cabeça.
const listaTabuada = (k, max) => {
  const nums = [];
  for (let n = k; n <= max; n += k) nums.push(n);
  return `Tabuada do ${k}: ${nums.join(', ')}`;
};
const naTabuada = (k, max) => ({ texto: `Está na tabuada do ${k}.`, ajuda: listaTabuada(k, max), teste: multiplo(k) });
const foraDaTabuada = (k, max) => ({ texto: `NÃO está na tabuada do ${k}.`, ajuda: `${listaTabuada(k, max)}. Ele não é nenhum desses.`, teste: (n) => n % k !== 0 });

// Fórmulas desenhadas no cartão da pista (raiz com traço em cima, fração empilhada).
const raiz = (dentro) => `<i>f</i>(<i>x</i>) = <span class="raiz"><span class="raiz-sinal">√</span><span class="raiz-dentro">${dentro}</span></span>`;
const fracao = (cima, baixo) => `<i>f</i>(<i>x</i>) = <span class="frac"><span>${cima}</span><span>${baixo}</span></span>`;

const FASES = [
  {
    nome: 'Cofre de bronze',
    metal: 'bronze',
    tema: 'Pistas de par, ímpar, maior e menor.',
    min: 1,
    max: 20,
    enigmas: [
      {
        resposta: 12,
        pistas: [
          { texto: 'É par.', teste: par },
          { texto: 'É maior que 9.', teste: (n) => n > 9 },
          { texto: 'É menor que 16.', teste: (n) => n < 16 },
          { texto: 'Não termina em 4.', teste: (n) => n % 10 !== 4 },
          { texto: 'Não termina em 0.', teste: (n) => n % 10 !== 0 },
          { texto: 'Tem dois algarismos.', teste: (n) => n >= 10 },
        ],
      },
      {
        resposta: 7,
        pistas: [
          { texto: 'É ímpar.', teste: (n) => !par(n) },
          { texto: 'É maior que 5.', teste: (n) => n > 5 },
          { texto: 'Tem um algarismo só.', teste: (n) => n < 10 },
          { texto: 'O dobro dele é menor que 16.', ajuda: 'Dobro é vezes 2. Ex.: o dobro de 5 é 10.', teste: (n) => 2 * n < 16 },
          { texto: 'É menor que 15.', teste: (n) => n < 15 },
          { texto: 'Não é 9.', teste: (n) => n !== 9 },
        ],
      },
      {
        resposta: 15,
        pistas: [
          { texto: 'É ímpar.', teste: (n) => !par(n) },
          { texto: 'É maior que 12.', teste: (n) => n > 12 },
          { texto: 'É menor que 18.', teste: (n) => n < 18 },
          { texto: 'Termina em 5 ou em 7.', teste: (n) => n % 10 === 5 || n % 10 === 7 },
          { texto: 'A soma dos algarismos dele é 6.', ajuda: 'Some os números que formam ele. Ex.: 24 → 2 + 4 = 6.', teste: (n) => somaAlgarismos(n) === 6 },
          { texto: 'Tem dois algarismos.', teste: (n) => n >= 10 },
        ],
      },
    ],
  },
  {
    nome: 'Cofre de prata',
    metal: 'prata',
    tema: 'Pistas de tabuada. A lista vem junto com a pista.',
    min: 1,
    max: 30,
    enigmas: [
      {
        resposta: 18,
        pistas: [
          naTabuada(3, 30),
          { texto: 'É par.', teste: par },
          { texto: 'É maior que 10.', teste: (n) => n > 10 },
          { texto: 'É menor que 20.', teste: (n) => n < 20 },
          foraDaTabuada(4, 30),
          { texto: 'Tem dois algarismos.', teste: (n) => n >= 10 },
        ],
      },
      {
        resposta: 25,
        pistas: [
          naTabuada(5, 30),
          { texto: 'É ímpar.', teste: (n) => !par(n) },
          { texto: 'É maior que 20.', teste: (n) => n > 20 },
          foraDaTabuada(3, 30),
          { texto: 'É menor que 28.', teste: (n) => n < 28 },
          { texto: 'Tem dois algarismos.', teste: (n) => n >= 10 },
        ],
      },
      {
        resposta: 16,
        pistas: [
          naTabuada(4, 30),
          { texto: 'É maior que 12.', teste: (n) => n > 12 },
          { texto: 'É menor que 22.', teste: (n) => n < 22 },
          { texto: 'Não termina em 0.', teste: (n) => n % 10 !== 0 },
          { texto: 'É par.', teste: par },
          foraDaTabuada(3, 30),
        ],
      },
    ],
  },
  {
    nome: 'Cofre de ouro',
    metal: 'ouro',
    tema: 'Uma das pistas é de domínio de função.',
    min: 1,
    max: 30,
    enigmas: [
      {
        resposta: 21,
        pistas: [
          {
            texto: 'Pode entrar em f(x) = √(x − 20).',
            formula: raiz('<i>x</i> − 20'),
            dica: 'Não existe raiz de número negativo. Então x − 20 tem que dar 0 ou mais.',
            explica: 'x − 20 ≥ 0, então x ≥ 20.',
            dominio: true,
            teste: (n) => n - 20 >= 0,
          },
          { texto: 'É ímpar.', teste: (n) => !par(n) },
          naTabuada(3, 30),
          { texto: 'É menor que 25.', teste: (n) => n < 25 },
          { texto: 'Não termina em 5.', teste: (n) => n % 10 !== 5 },
          { texto: 'É maior que 5.', teste: (n) => n > 5 },
        ],
      },
      {
        resposta: 18,
        pistas: [
          {
            texto: 'Pode entrar em f(x) = 10 / (x − 12).',
            formula: fracao('10', '<i>x</i> − 12'),
            dica: 'Não dá para dividir por zero. Então x − 12 não pode dar 0.',
            explica: 'x − 12 = 0 quando x = 12, então o 12 fica de fora.',
            dominio: true,
            teste: (n) => n - 12 !== 0,
          },
          { texto: 'É par.', teste: par },
          naTabuada(3, 30),
          { texto: 'É maior que 10.', teste: (n) => n > 10 },
          { texto: 'É menor que 20.', teste: (n) => n < 20 },
          { texto: 'Não termina em 4.', teste: (n) => n % 10 !== 4 },
        ],
      },
      {
        resposta: 10,
        pistas: [
          {
            texto: 'Pode entrar em f(x) = √(x − 8).',
            formula: raiz('<i>x</i> − 8'),
            dica: 'Não existe raiz de número negativo. Então x − 8 tem que dar 0 ou mais.',
            explica: 'x − 8 ≥ 0, então x ≥ 8.',
            dominio: true,
            teste: (n) => n - 8 >= 0,
          },
          { texto: 'É par.', teste: par },
          { texto: 'É menor que 15.', teste: (n) => n < 15 },
          { texto: 'Termina em 0 ou em 2.', teste: (n) => n % 10 === 0 || n % 10 === 2 },
          foraDaTabuada(3, 30),
          { texto: 'É menor que 13.', teste: (n) => n < 13 },
        ],
      },
    ],
  },
];

if (typeof module !== 'undefined') module.exports = FASES;
