(() => {
  const TEMPO_FASE = 120; // segundos
  const TENTATIVAS = 3;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const estado = {
    jogadores: 4,
    fase: 0,
    abertos: 0,
    enigma: null,
    pistasDe: [],
    vez: 0,
    tentativas: TENTATIVAS,
    fimEm: 0,
    ultimoSegundo: null,
    relogio: null,
    digitado: '',
  };

  // ---------- Som e vibração ----------
  let mudo = false;
  try { mudo = localStorage.getItem('cofre-mudo') === '1'; } catch (e) { /* sem armazenamento */ }
  let audio = null;

  function tom(freq, inicio, duracao, tipo = 'square', volume = 0.08) {
    const osc = audio.createOscillator();
    const ganho = audio.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(freq, inicio);
    ganho.gain.setValueAtTime(volume, inicio);
    ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);
    osc.connect(ganho).connect(audio.destination);
    osc.start(inicio);
    osc.stop(inicio + duracao + 0.02);
    return osc;
  }

  function som(tipo) {
    if (mudo) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const t = audio.currentTime;
      if (tipo === 'tecla') tom(620, t, 0.04, 'triangle', 0.1);
      if (tipo === 'tique') tom(1100, t, 0.03, 'square', 0.06);
      if (tipo === 'erro') {
        tom(330, t, 0.18, 'sawtooth', 0.09);
        tom(240, t + 0.2, 0.3, 'sawtooth', 0.09);
      }
      if (tipo === 'alarme') {
        for (let i = 0; i < 4; i++) {
          const osc = tom(500, t + i * 0.5, 0.48, 'sawtooth', 0.08);
          osc.frequency.linearRampToValueAtTime(950, t + i * 0.5 + 0.45);
        }
      }
      if (tipo === 'abrir') {
        [0, 0.12, 0.24].forEach((d) => tom(1400, t + d, 0.03, 'square', 0.08));
        [523, 659, 784, 1047].forEach((f, i) => tom(f, t + 0.45 + i * 0.09, 0.9, 'sine', 0.07));
      }
    } catch (e) { /* navegador sem áudio */ }
  }

  function vibrar(padrao) {
    if (!mudo && navigator.vibrate) navigator.vibrate(padrao);
  }

  function atualizarMudo() {
    const botao = $('#mudo');
    botao.textContent = mudo ? '🔇' : '🔊';
    botao.setAttribute('aria-pressed', String(mudo));
    botao.setAttribute('aria-label', mudo ? 'Ligar som' : 'Desligar som');
  }

  $('#mudo').addEventListener('click', () => {
    mudo = !mudo;
    try { localStorage.setItem('cofre-mudo', mudo ? '1' : '0'); } catch (e) { /* sem armazenamento */ }
    atualizarMudo();
  });
  atualizarMudo();

  // ---------- Tela ligada durante a discussão ----------
  let travaTela = null;
  async function manterTelaLigada() {
    try { travaTela = await navigator.wakeLock.request('screen'); } catch (e) { travaTela = null; }
  }
  function soltarTela() {
    if (travaTela) travaTela.release().catch(() => {});
    travaTela = null;
  }

  // ---------- Navegação ----------
  function mostrar(nome) {
    $$('.tela').forEach((t) => t.classList.toggle('ativa', t.dataset.tela === nome));
    window.scrollTo(0, 0);
  }

  $$('[data-ir]').forEach((b) => b.addEventListener('click', () => mostrar(b.dataset.ir)));

  // A porta do cofre é a mesma em todas as telas.
  $$('[data-cofre]').forEach((palco) => palco.appendChild($('#tpl-cofre').content.cloneNode(true)));

  // ---------- Jogadores ----------
  $$('[data-jogadores]').forEach((b) => b.addEventListener('click', () => {
    estado.jogadores = Number(b.dataset.jogadores);
    $$('[data-jogadores]').forEach((o) => o.setAttribute('aria-checked', String(o === b)));
  }));

  $('#btn-iniciar').addEventListener('click', () => {
    estado.fase = 0;
    estado.abertos = 0;
    abrirFase();
  });

  // ---------- Fase ----------
  function embaralhar(lista) {
    const copia = lista.slice();
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }

  function abrirFase() {
    const fase = FASES[estado.fase];
    estado.enigma = fase.enigmas[Math.floor(Math.random() * fase.enigmas.length)];
    const pistas = embaralhar(estado.enigma.pistas);
    estado.pistasDe = Array.from({ length: estado.jogadores }, (_, j) => pistas.filter((_, i) => i % estado.jogadores === j));

    $('#fase-num').textContent = `Fase ${estado.fase + 1} de ${FASES.length}`;
    $('#fase-nome').textContent = fase.nome;
    $('#fase-faixa').textContent = `A senha é um número de ${fase.min} a ${fase.max}.`;
    $('#fase-extra').textContent = estado.enigma.pistas.some((p) => p.dominio)
      ? 'Uma das pistas fala de domínio de função.'
      : '';
    mostrar('fase');
  }

  $('#btn-distribuir').addEventListener('click', () => mostrarVez(0));

  // ---------- Ver pistas segurando o botão ----------
  function fichasHTML(pistas) {
    return pistas.map((p) => `
      <div class="ficha">
        <span class="rotulo">Pista</span>
        <p class="ficha-texto">${p.texto}</p>
        ${p.dica ? `<p class="ficha-dica"><strong>Dica:</strong> ${p.dica}</p>` : ''}
      </div>`).join('');
  }

  function fichasVazias(alvo, texto) {
    alvo.innerHTML = `<div class="fichas-vazio">${texto}</div>`;
  }

  function ligarSegurar(botao, aoMostrar, aoEsconder) {
    let segurando = false;
    const mostrarPistas = (e) => {
      if (botao.disabled) return;
      if (e.type === 'pointerdown') botao.setPointerCapture(e.pointerId);
      segurando = true;
      botao.classList.add('pressionado');
      aoMostrar();
    };
    const esconder = () => {
      if (!segurando) return;
      segurando = false;
      botao.classList.remove('pressionado');
      aoEsconder();
    };
    botao.addEventListener('pointerdown', mostrarPistas);
    botao.addEventListener('pointerup', esconder);
    botao.addEventListener('pointercancel', esconder);
    botao.addEventListener('lostpointercapture', esconder);
    botao.addEventListener('keydown', (e) => {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); mostrarPistas(e); }
    });
    botao.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') esconder(); });
    botao.addEventListener('blur', esconder);
    botao.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // ---------- Passe o celular ----------
  const AVISO_PASSE = 'Suas pistas aparecem aqui enquanto você segura o botão.';

  function mostrarVez(i) {
    estado.vez = i;
    const n = i + 1;
    const qtd = estado.pistasDe[i].length;
    $('#passe-fase').textContent = `Fase ${estado.fase + 1} · ${FASES[estado.fase].nome}`;
    $('#passe-jogador').textContent = `Jogador ${n}`;
    $('#passe-aviso').textContent = `Só o jogador ${n} olha a tela. Você tem ${qtd} ${qtd === 1 ? 'pista' : 'pistas'}.`;
    fichasVazias($('#passe-fichas'), AVISO_PASSE);
    const passar = $('#btn-passar');
    passar.disabled = true;
    passar.textContent = i < estado.jogadores - 1 ? `Passar para o jogador ${n + 1}` : 'Todos viram: começar';
    mostrar('passe');
  }

  ligarSegurar(
    $('#passe-segurar'),
    () => { $('#passe-fichas').innerHTML = fichasHTML(estado.pistasDe[estado.vez]); },
    () => {
      fichasVazias($('#passe-fichas'), AVISO_PASSE);
      $('#btn-passar').disabled = false;
    },
  );

  $('#btn-passar').addEventListener('click', () => {
    if (estado.vez < estado.jogadores - 1) mostrarVez(estado.vez + 1);
    else comecarDiscussao();
  });

  // ---------- Discussão ----------
  function formatarTempo(s) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function desenharLampadas() {
    const el = $('#lampadas');
    el.innerHTML = Array.from({ length: TENTATIVAS }, (_, i) =>
      `<span class="lampada${i >= estado.tentativas ? ' gasta' : ''}"></span>`).join('');
    el.setAttribute('aria-label', `${estado.tentativas} ${estado.tentativas === 1 ? 'tentativa' : 'tentativas'}`);
  }

  function comecarDiscussao() {
    const fase = FASES[estado.fase];
    estado.tentativas = TENTATIVAS;
    desenharLampadas();
    $('#discussao-faixa').textContent = `Senha de ${fase.min} a ${fase.max}. Toque para riscar os números que não servem.`;

    const quadro = $('#quadro');
    const total = fase.max - fase.min + 1;
    quadro.style.setProperty('--colunas', total > 30 ? 7 : 5);
    quadro.innerHTML = '';
    for (let n = fase.min; n <= fase.max; n++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = n;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => {
        b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
        som('tecla');
      });
      quadro.appendChild(b);
    }

    estado.fimEm = Date.now() + TEMPO_FASE * 1000;
    estado.ultimoSegundo = null;
    clearInterval(estado.relogio);
    estado.relogio = setInterval(atualizarRelogio, 200);
    atualizarRelogio();
    manterTelaLigada();
    mostrar('discussao');
  }

  function atualizarRelogio() {
    const restante = Math.max(0, Math.ceil((estado.fimEm - Date.now()) / 1000));
    if (restante === estado.ultimoSegundo) return;
    estado.ultimoSegundo = restante;
    const rel = $('#relogio');
    rel.textContent = formatarTempo(restante);
    rel.classList.toggle('urgente', restante <= 10);
    if (restante <= 10 && restante > 0) {
      som('tique');
      vibrar(30);
    }
    if (restante === 0) terminarFase(false, 'O tempo acabou.');
  }

  // ---------- Teclado da senha ----------
  function atualizarVisor() {
    $('#visor').textContent = estado.digitado ? estado.digitado.padEnd(2, '–') : '– –';
    $('#btn-abrir').disabled = estado.digitado === '';
  }

  $('#btn-senha').addEventListener('click', () => {
    estado.digitado = '';
    $('#senha-msg').textContent = '';
    $('#visor').classList.remove('errado');
    atualizarVisor();
    $('#folha-senha').hidden = false;
  });

  $('#teclado').addEventListener('click', (e) => {
    const tecla = e.target.closest('[data-tecla]');
    if (!tecla) return;
    const v = tecla.dataset.tecla;
    som('tecla');
    $('#senha-msg').textContent = '';
    $('#visor').classList.remove('errado');
    if (v === 'voltar') { $('#folha-senha').hidden = true; return; }
    if (v === 'apagar') estado.digitado = estado.digitado.slice(0, -1);
    else if (estado.digitado.length < 2) estado.digitado = (estado.digitado + v).replace(/^0+(?=\d)/, '');
    atualizarVisor();
  });

  $('#btn-abrir').addEventListener('click', () => {
    if (Number(estado.digitado) === estado.enigma.resposta) {
      terminarFase(true);
      return;
    }
    estado.tentativas -= 1;
    desenharLampadas();
    if (estado.tentativas === 0) {
      terminarFase(false, 'As 3 tentativas acabaram.');
      return;
    }
    som('erro');
    vibrar([120, 60, 120]);
    const visor = $('#visor');
    visor.classList.remove('errado');
    void visor.offsetWidth; // reinicia a animação de tremer
    visor.classList.add('errado');
    $('#senha-msg').textContent = `ERRADO. ${estado.tentativas === 1 ? 'Resta 1 tentativa' : `Restam ${estado.tentativas} tentativas`}.`;
    estado.digitado = '';
    $('#btn-abrir').disabled = true;
  });

  // ---------- Rever pista ----------
  const AVISO_REVER = 'Escolha seu número e segure o botão.';
  let revendo = null;

  $('#btn-rever').addEventListener('click', () => {
    revendo = null;
    $('#rever-chips').innerHTML = estado.pistasDe.map((_, i) =>
      `<button type="button" aria-pressed="false" data-rever="${i}">Jogador ${i + 1}</button>`).join('');
    fichasVazias($('#rever-fichas'), AVISO_REVER);
    $('#rever-segurar').disabled = true;
    $('#folha-rever').hidden = false;
  });

  $('#rever-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-rever]');
    if (!chip) return;
    revendo = Number(chip.dataset.rever);
    $$('#rever-chips button').forEach((b) => b.setAttribute('aria-pressed', String(b === chip)));
    $('#rever-segurar').disabled = false;
    fichasVazias($('#rever-fichas'), `Só o jogador ${revendo + 1} olha. Segure o botão.`);
  });

  ligarSegurar(
    $('#rever-segurar'),
    () => { $('#rever-fichas').innerHTML = fichasHTML(estado.pistasDe[revendo]); },
    () => fichasVazias($('#rever-fichas'), `Só o jogador ${revendo + 1} olha. Segure o botão.`),
  );

  $('#btn-rever-fechar').addEventListener('click', () => { $('#folha-rever').hidden = true; });

  // ---------- Fim da fase ----------
  function explicarPistas(fase, enigma) {
    let restantes = [];
    for (let n = fase.min; n <= fase.max; n++) restantes.push(n);
    return enigma.pistas.map((p) => {
      const antes = restantes.length;
      restantes = restantes.filter((n) => p.teste(n));
      let sobra = restantes.length === 1 ? `sobra o ${restantes[0]}` : `sobram ${restantes.length}`;
      if (restantes.length === antes) sobra = 'confirma';
      return `<li><span>${p.texto}</span><span class="sobra">${sobra}</span>${p.explica ? `<p class="porque">${p.explica}</p>` : ''}</li>`;
    }).join('');
  }

  function terminarFase(abriu, motivo) {
    clearInterval(estado.relogio);
    soltarTela();
    $('#folha-senha').hidden = true;
    $('#folha-rever').hidden = true;

    const fase = FASES[estado.fase];
    const resposta = estado.enigma.resposta;
    if (abriu) estado.abertos += 1;

    const cofre = $('#resultado-cofre .cofre');
    cofre.classList.remove('aberto', 'trancado');
    void cofre.offsetWidth;
    cofre.classList.add(abriu ? 'aberto' : 'trancado');

    $('#resultado-titulo').textContent = abriu ? 'Cofre aberto!' : 'Alarme disparado';
    $('#resultado-motivo').innerHTML = abriu
      ? `A senha era <span class="senha-era">${resposta}</span>.`
      : `${motivo} A senha era <span class="senha-era">${resposta}</span>.`;
    $('#resultado-pistas').innerHTML = explicarPistas(fase, estado.enigma);

    const ultima = estado.fase === FASES.length - 1;
    $('#btn-proxima').textContent = ultima ? 'Ver placar' : `Ir para a fase ${estado.fase + 2}`;

    if (abriu) {
      som('abrir');
      vibrar([40, 60, 40, 60, 200]);
    } else {
      som('alarme');
      vibrar([300, 150, 300, 150, 300]);
      const flash = $('#flash');
      flash.classList.remove('ligado');
      void flash.offsetWidth;
      flash.classList.add('ligado');
    }
    mostrar('resultado');
  }

  const FRASES_PLACAR = [
    'Os alarmes venceram desta vez. Tentem de novo.',
    'Um cofre aberto. Dá para melhorar na próxima.',
    'Quase perfeito. Só um alarme disparou.',
    'Equipe perfeita: nenhum alarme disparou.',
  ];

  $('#btn-proxima').addEventListener('click', () => {
    if (estado.fase < FASES.length - 1) {
      estado.fase += 1;
      abrirFase();
      return;
    }
    $('#placar-numero').innerHTML = `${estado.abertos} de ${FASES.length}<small>cofres abertos</small>`;
    $('#placar-texto').textContent = FRASES_PLACAR[estado.abertos];
    mostrar('placar');
  });
})();
