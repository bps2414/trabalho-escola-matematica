# Trabalho de Escola - Matemática

## O Cofre

Jogo cooperativo para **um celular só**. Cada jogador vê pistas secretas sobre um número. O grupo junta as pistas falando, sem mostrar a tela, e tenta abrir o cofre antes do alarme.

- 3 a 6 jogadores, 3 fases (bronze 1–20, prata 1–50, ouro 1–30)
- 2 minutos e 3 tentativas por fase
- A fase 3 tem uma pista de **domínio de função**

### Publicar no GitHub Pages

1. No GitHub, abra **Settings → General → Danger Zone → Change visibility** e deixe o repositório **público**.
2. Em **Settings → Pages**, escolha *Deploy from a branch*, a branch com o jogo e a pasta `/ (root)`. Salve.
3. Em 1 ou 2 minutos o jogo abre em `https://bps2414.github.io/trabalho-escola-matematica/`.

### Mexer nos enigmas

Os enigmas ficam em `js/enigmas.js`. Depois de editar, rode:

```
npm install
npm test
```

O `npm test` confere que todo enigma tem exatamente uma resposta. Depois ele joga uma partida inteira num celular simulado e salva prints e um vídeo em `evidencias/`.
