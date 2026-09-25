// Banco de enigmas do Cofre. Cada pista tem o texto que o jogador vê
// e um teste que diz se um número obedece a pista.
// Rode `node tests/validar-enigmas.js` depois de mexer aqui.

const par = (n) => n % 2 === 0;
const multiplo = (k) => (n) => n % k === 0;
const divisor = (k) => (n) => k % n === 0;
const somaAlgarismos = (n) => String(n).split('').reduce((s, d) => s + Number(d), 0);

const FASES = [
  {
    nome: 'Cofre de bronze',
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
    min: 1,
    max: 30,
    enigmas: [
      {
        resposta: 21,
        pistas: [
          {
            texto: 'Ele está no domínio de f(x) = √(x − 20).',
            dica: 'Não existe raiz quadrada de número negativo.',
            explica: 'x − 20 não pode ser negativo, então x ≥ 20.',
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
            texto: 'Ele NÃO está no domínio de f(x) = 1 / ((x − 9)·(x − 18)).',
            dica: 'Nenhum denominador pode ser zero.',
            explica: 'O denominador zera quando x = 9 ou x = 18. Só esses dois ficam de fora do domínio.',
            dominio: true,
            teste: (n) => (n - 9) * (n - 18) === 0,
          },
          { texto: 'É par.', teste: par },
          { texto: 'É maior que 10.', teste: (n) => n > 10 },
          { texto: 'É múltiplo de 3.', teste: multiplo(3) },
          { texto: 'É menor que 25.', teste: (n) => n < 25 },
          { texto: 'É divisor de 36.', teste: divisor(36) },
        ],
      },
      {
        resposta: 10,
        pistas: [
          {
            texto: 'Ele está no domínio de f(x) = √(12 − x).',
            dica: 'Não existe raiz quadrada de número negativo.',
            explica: '12 − x não pode ser negativo, então x ≤ 12.',
            dominio: true,
            teste: (n) => 12 - n >= 0,
          },
          { texto: 'É par.', teste: par },
          { texto: 'É maior que 7.', teste: (n) => n > 7 },
          { texto: 'Não é múltiplo de 4.', teste: (n) => n % 4 !== 0 },
          { texto: 'Tem dois algarismos.', teste: (n) => n >= 10 },
          { texto: 'É divisor de 30.', teste: divisor(30) },
        ],
      },
    ],
  },
];

if (typeof module !== 'undefined') module.exports = FASES;
