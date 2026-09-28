# Trabalho de Escola - Matemática

## O Cofre

Jogo de competição para **um celular só**. Um **líder** fica com o celular, vê todas as pistas e lê em voz alta. A turma se divide em **Time A** e **Time B**. Quando um time acha a senha, fala para o líder, que digita. Quem abrir o cofre primeiro ganha a fase.

- 3 fases (bronze 1–20, prata 1–30, ouro 1–30), 6 pistas cada
- 3 minutos por fase e 3 tentativas por time
- No fim, ganha o time que abriu mais cofres

**Outro modo: passar o celular.** Para 3 a 6 pessoas, sem líder. O celular passa de mão em mão, cada um vê só as próprias pistas, e o grupo todo tenta abrir o cofre junto (3 tentativas para o grupo).

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

O `npm test` confere que todo enigma tem exatamente uma resposta. Depois ele joga uma partida inteira em cada modo num celular simulado e salva prints e um vídeo em `evidencias/`.
