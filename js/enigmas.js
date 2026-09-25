// Banco de enigmas do Cofre. Cada pista tem o texto que o jogador vê
// e um teste que diz se um número obedece a pista.
// Rode `node tests/validar-enigmas.js` depois de mexer aqui.

const par = (n) => n % 2 === 0;
const multiplo = (k) => (n) => n % k === 0;
const divisor = (k) => (n) => k % n === 0;
const somaAlgarismos = (n) => String(n).split('').reduce((s, d) => s + Number(d), 0);

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
          { texto: 'O dobro dele é menor que 16.', teste: (n) => 2 * n < 16 },
          { texto: 'É menor que 15.', teste: (n) => n < 15 },
          { texto: 'Não é múltiplo de 3.', teste: (n) => n % 3 !== 0 },
        ],
      },
      {
        resposta: 15,
        pistas: [
          { texto: 'É ímpar.', teste: (n) => !par(n) },
          { texto: 'É maior que 12.', teste: (n) => n > 12 },
          { texto: 'É menor que 18.', teste: (n) => n < 18 },
          { texto: 'Termina em 5 ou em 7.', teste: (n) => n % 10 === 5 || n % 10 === 7 },
          { texto: 'A soma dos algarismos dele é 6.', teste: (n) => somaAlgarismos(n) === 6 },
          { texto: 'Tem dois algarismos.', teste: (n) => n >= 10 },
        ],
      },
    ],
  },
  {
    nome: 'Cofre de prata',
    metal: 'prata',
    tema: 'Pistas de múltiplos e divisores.',
    min: 1,
    max: 50,
    enigmas: [
      {
        resposta: 36,
        pistas: [
          { texto: 'É múltiplo de 4.', teste: multiplo(4) },
          { texto: 'É múltiplo de 3.', teste: multiplo(3) },
          { texto: 'É maior que 30.', teste: (n) => n > 30 },
          { texto: 'É divisor de 72.', teste: divisor(72) },
          { texto: 'É par.', teste: par },
          { texto: 'É um número vezes ele mesmo (quadrado perfeito).', teste: (n) => Number.isInteger(Math.sqrt(n)) },
        ],
      },
      {
        resposta: 35,
        pistas: [
          { texto: 'É ímpar.', teste: (n) => !par(n) },
          { texto: 'É múltiplo de 5.', teste: multiplo(5) },
          { texto: 'É maior que 20.', teste: (n) => n > 20 },
          { texto: 'Não é múltiplo de 3.', teste: (n) => n % 3 !== 0 },
          { texto: 'É divisor de 70.', teste: divisor(70) },
          { texto: 'Tem dois algarismos.', teste: (n) => n >= 10 },
        ],
      },
      {
        resposta: 24,
        pistas: [
          { texto: 'É par.', teste: par },
          { texto: 'É múltiplo de 6.', teste: multiplo(6) },
          { texto: 'É divisor de 48.', teste: divisor(48) },
          { texto: 'É maior que 15.', teste: (n) => n > 15 },
          { texto: 'É menor que 40.', teste: (n) => n < 40 },
          { texto: 'A soma dos algarismos dele é 6.', teste: (n) => somaAlgarismos(n) === 6 },
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
          { texto: 'É múltiplo de 3.', teste: multiplo(3) },
          { texto: 'É menor que 25.', teste: (n) => n < 25 },
          { texto: 'Tem dois algarismos.', teste: (n) => n >= 10 },
          { texto: 'Não é múltiplo de 9.', teste: (n) => n % 9 !== 0 },
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
          { texto: 'É múltiplo de 3.', teste: multiplo(3) },
          { texto: 'É maior que 10.', teste: (n) => n > 10 },
          { texto: 'É menor que 20.', teste: (n) => n < 20 },
          { texto: 'É divisor de 36.', teste: divisor(36) },
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
          { texto: 'É divisor de 30.', teste: divisor(30) },
          { texto: 'Não é múltiplo de 4.', teste: (n) => n % 4 !== 0 },
          { texto: 'É menor que 15.', teste: (n) => n < 15 },
          { texto: 'Não é múltiplo de 3.', teste: (n) => n % 3 !== 0 },
        ],
      },
    ],
  },
];

if (typeof module !== 'undefined') module.exports = FASES;
