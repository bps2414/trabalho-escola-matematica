(() => {
  const TEMPO_FASE = 120; // segundos
  const TENTATIVAS = 3;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const estado = {
    jogadores: 4,
    fase: 0,
    resultados: [],
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
      if (tipo === 'papel') tom(900, t, 0.05, 'triangle', 0.05);
      if (tipo === 'tique') tom(1100, t, 0.03, 'square', 0.06);
      if (tipo === 'erro') {
        tom(330, t, 0.18, 'sawtooth', 0.09);
        tom(240, t + 0.2, 0.3, 'sawtooth', 0.09);
      }
      if (tipo === 'alarme') {
        for (let i = 0; i < 5; i++) {
          const osc = tom(500, t + i * 0.5, 0.48, 'sawtooth', 0.08);
          osc.frequency.linearRampToValueAtTime(950, t + i * 0.5 + 0.45);
        }
      }
      if (tipo === 'abrir') {
        for (let i = 0; i < 8; i++) tom(1500 - i * 60, t + i * 0.08, 0.025, 'square', 0.06); // disco girando
        [0.8, 0.9].forEach((d) => tom(180, t + d, 0.12, 'square', 0.12)); // trincos
        [523, 659, 784, 1047, 1319].forEach((f, i) => tom(f, t + 1.2 + i * 0.1, 1.1, 'sine', 0.07));
      }
    } catch (e) { /* navegador sem áudio */ }
  }

  function vibrar(padrao) {
    if (!mudo && navigator.vibrate) navigator.vibrate(padrao);
  }

  function atualizarMudo() {
    const botao = $('#mudo');
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
    document.body.dataset.telaAtual = nome;
    window.scrollTo(0, 0);
  }
  document.body.dataset.telaAtual = 'inicio';

  $$('[data-ir]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.ir === 'jogadores') delete document.body.dataset.metal;
    mostrar(b.dataset.ir);
  }));

  // A porta do cofre é a mesma em todas as telas.
  $$('[data-cofre]').forEach((palco) => palco.appendChild($('#tpl-cofre').content.cloneNode(true)));

  // ---------- Folhas ----------
  function abrirFolha(id) { $(id).hidden = false; }
  function fecharFolha(id) { $(id).hidden = true; }

  $('#btn-regras').addEventListener('click', () => {
    abrirFolha('#folha-regras');
    $('#folha-regras .regras').scrollTop = 0;
  });
  $('#btn-regras-fechar').addEventListener('click', () => fecharFolha('#folha-regras'));

  $$('.folha').forEach((folha) => folha.addEventListener('click', (e) => {
    if (e.target === folha) folha.hidden = true; // toque fora fecha
  }));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $$('.folha').forEach((f) => { f.hidden = true; });
  });

  // ---------- Jogadores ----------
  $$('[data-jogadores]').forEach((b) => b.addEventListener('click', () => {
    estado.jogadores = Number(b.dataset.jogadores);
    $$('[data-jogadores]').forEach((o) => o.setAttribute('aria-checked', String(o === b)));
    som('tecla');
  }));

  $('#btn-iniciar').addEventListener('click', () => {
    estado.fase = 0;
    estado.resultados = [];
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

    document.body.dataset.metal = fase.metal;
    $('#fase-numero').textContent = estado.fase + 1;
    $('#fase-num').textContent = `Fase ${estado.fase + 1} de ${FASES.length}`;
    $('#fase-nome').textContent = fase.nome;
    $('#fase-faixa').textContent = `A senha é um número de ${fase.min} a ${fase.max}.`;
    $('#fase-tema').textContent = fase.tema;
    $('#fase-dominio').hidden = !estado.enigma.pistas.some((p) => p.dominio);
    mostrar('fase');
  }

  $('#btn-distribuir').addEventListener('click', () => mostrarVez(0));

  // ---------- Pistas ----------
  function fichaHTML(p) {
    if (p.dominio) {
      return `
        <div class="ficha ficha-dominio" data-pista="${p.texto}">
          <span class="rotulo">Pista de domínio</span>
          <p class="ficha-texto">O número secreto pode entrar nesta função sem dar erro:</p>
          <div class="formula">${p.formula}</div>
          <p class="ficha-dica"><strong>Dica:</strong> ${p.dica}</p>
        </div>`;
    }
    return `
      <div class="ficha" data-pista="${p.texto}">
        <span class="rotulo">Pista</span>
        <p class="ficha-texto">${p.texto}</p>
      </div>`;
  }

  function mostrarFichas(alvo, pistas) {
    alvo.innerHTML = pistas.map(fichaHTML).join('');
    som('papel');
  }

  function esconderFichas(alvo, qtd, aviso) {
    const ocultas = Array.from({ length: qtd }, () => '<div class="ficha-oculta"><span></span><span></span></div>').join('');
    alvo.innerHTML = `${ocultas}<p class="fichas-aviso">${aviso}</p>`;
  }

  function ligarSegurar(botao, aoMostrar, aoEsconder) {
    let segurando = false;
    const mostrarPistas = (e) => {
      if (botao.disabled) return;
      if (e.type === 'pointerdown') botao.setPointerCapture(e.pointerId);
      segurando = true;
      botao.classList.add('pressionado');
      vibrar(15);
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
  const AVISO_PASSE = 'Segure o botão para ler. Soltou, elas somem.';

  function mostrarVez(i) {
    estado.vez = i;
    const n = i + 1;
    const qtd = estado.pistasDe[i].length;
    $('#passe-fase').textContent = `Fase ${estado.fase + 1} · ${FASES[estado.fase].nome}`;
    $('#passe-jogador').textContent = `Jogador ${n}`;
    $('#passe-aviso').textContent = `Só o jogador ${n} olha a tela. Você tem ${qtd} ${qtd === 1 ? 'pista' : 'pistas'}.`;
    esconderFichas($('#passe-fichas'), qtd, AVISO_PASSE);
    const passar = $('#btn-passar');
    passar.disabled = true;
    passar.textContent = i < estado.jogadores - 1 ? `Passar para o jogador ${n + 1}` : 'Todos viram: começar';
    mostrar('passe');
  }

  ligarSegurar(
    $('#passe-segurar'),
    () => mostrarFichas($('#passe-fichas'), estado.pistasDe[estado.vez]),
    () => {
      esconderFichas($('#passe-fichas'), estado.pistasDe[estado.vez].length, AVISO_PASSE);
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

  function desenharLampadas(queimou) {
    const el = $('#lampadas');
    el.innerHTML = Array.from({ length: TENTATIVAS }, (_, i) => {
      const gasta = i >= estado.tentativas;
      return `<span class="lampada${gasta ? ' gasta' : ''}${gasta && i === queimou ? ' queimou' : ''}"></span>`;
    }).join('');
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
      b.style.setProperty('--i', n - fase.min);
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
    const urgente = restante <= 10;
    rel.textContent = formatarTempo(restante);
    rel.classList.toggle('urgente', urgente);
    $('.painel').classList.toggle('urgente', urgente);
    $('#barra-tempo').style.transform = `scaleX(${restante / TEMPO_FASE})`;
    if (urgente && restante > 0) {
      som('tique');
      vibrar(30);
    }
    if (restante === 0) terminarFase(false, 'O tempo acabou.');
  }

  // ---------- Teclado da senha ----------
  function atualizarVisor(novo) {
    const casas = [0, 1].map((i) => {
      const d = estado.digitado[i];
      const classe = d === undefined ? 'digito vazio' : `digito${novo && i === estado.digitado.length - 1 ? ' novo' : ''}`;
      return `<span class="${classe}">${d === undefined ? '0' : d}</span>`;
    });
    $('#visor').innerHTML = casas.join('');
    $('#btn-abrir').disabled = estado.digitado === '';
  }

  $('#btn-senha').addEventListener('click', () => {
    estado.digitado = '';
    $('#senha-msg').textContent = '';
    $('#visor').classList.remove('errado');
    atualizarVisor();
    abrirFolha('#folha-senha');
  });

  $('#teclado').addEventListener('click', (e) => {
    const tecla = e.target.closest('[data-tecla]');
    if (!tecla) return;
    const v = tecla.dataset.tecla;
    som('tecla');
    $('#senha-msg').textContent = '';
    $('#visor').classList.remove('errado');
    if (v === 'voltar') { fecharFolha('#folha-senha'); return; }
    if (v === 'apagar') estado.digitado = estado.digitado.slice(0, -1);
    else if (estado.digitado.length < 2) estado.digitado = (estado.digitado + v).replace(/^0+(?=\d)/, '');
    atualizarVisor(v !== 'apagar');
  });

  $('#btn-abrir').addEventListener('click', () => {
    if (Number(estado.digitado) === estado.enigma.resposta) {
      terminarFase(true);
      return;
    }
    estado.tentativas -= 1;
    desenharLampadas(estado.tentativas);
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
  let revendo = null;
  const avisoRever = () => `Só o jogador ${revendo + 1} olha. Segure o botão.`;

  $('#btn-rever').addEventListener('click', () => {
    revendo = null;
    $('#rever-chips').innerHTML = estado.pistasDe.map((_, i) =>
      `<button type="button" aria-pressed="false" data-rever="${i}">Jogador ${i + 1}</button>`).join('');
    $('#rever-fichas').innerHTML = '<p class="fichas-aviso">Escolha seu número de jogador.</p>';
    $('#rever-segurar').disabled = true;
    abrirFolha('#folha-rever');
  });

  $('#rever-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-rever]');
    if (!chip) return;
    revendo = Number(chip.dataset.rever);
    $$('#rever-chips button').forEach((b) => b.setAttribute('aria-pressed', String(b === chip)));
    $('#rever-segurar').disabled = false;
    esconderFichas($('#rever-fichas'), estado.pistasDe[revendo].length, avisoRever());
  });

  ligarSegurar(
    $('#rever-segurar'),
    () => mostrarFichas($('#rever-fichas'), estado.pistasDe[revendo]),
    () => esconderFichas($('#rever-fichas'), estado.pistasDe[revendo].length, avisoRever()),
  );

  $('#btn-rever-fechar').addEventListener('click', () => fecharFolha('#folha-rever'));

  // ---------- Fim da fase ----------
  function explicarPistas(fase, enigma) {
    const total = fase.max - fase.min + 1;
    let restantes = [];
    for (let n = fase.min; n <= fase.max; n++) restantes.push(n);
    return enigma.pistas.map((p, i) => {
      const antes = restantes.length;
      restantes = restantes.filter((n) => p.teste(n));
      let sobra = restantes.length === 1 ? `sobra o ${restantes[0]}` : `sobram ${restantes.length}`;
      if (restantes.length === antes) sobra = 'confirma';
      const de = `${(antes / total) * 100}%`;
      const ate = `${(restantes.length / total) * 100}%`;
      return `
        <li style="--i:${i}">
          <div class="linha-pista"><span>${p.texto}</span><span class="sobra${sobra === 'confirma' ? ' confirma' : ''}">${sobra}</span></div>
          <div class="funil"><span style="--de:${de};--ate:${ate}"></span></div>
          ${p.explica ? `<p class="porque">${p.explica}</p>` : ''}
        </li>`;
    }).join('');
  }

  function soltarMoedas(cofre) {
    const tipos = ['', '', 'lingote', 'faisca', 'faisca'];
    cofre.querySelector('.particulas').innerHTML = Array.from({ length: 34 }, (_, i) => {
      const angulo = Math.random() * Math.PI * 2;
      const dist = 90 + Math.random() * 130;
      const dx = Math.round(Math.cos(angulo) * dist);
      const dy = Math.round(Math.sin(angulo) * dist * 0.8 - 40);
      const giro = Math.round(Math.random() * 720 - 360);
      const atraso = (1.55 + Math.random() * 0.35).toFixed(2);
      return `<span class="particula ${tipos[i % tipos.length]}" style="--dx:${dx}px;--dy:${dy}px;--giro:${giro}deg;--atraso:${atraso}s"></span>`;
    }).join('');
  }

  function acender(el, classes) {
    el.className = 'flash';
    void el.offsetWidth;
    el.classList.add(...classes);
  }

  let sireneTimer = null;

  function terminarFase(abriu, motivo) {
    clearInterval(estado.relogio);
    soltarTela();
    $$('.folha').forEach((f) => { f.hidden = true; });

    const fase = FASES[estado.fase];
    const resposta = estado.enigma.resposta;
    estado.resultados[estado.fase] = abriu;

    // Volta a porta para fechada sem animar, depois dispara a animação nova.
    const cofre = $('#resultado-cofre .cofre');
    cofre.classList.remove('aberto', 'trancado');
    cofre.querySelector('.particulas').innerHTML = '';
    cofre.querySelectorAll('.porta, .trinco, .brilho, .raios').forEach((el) => { el.style.transition = 'none'; });
    void cofre.offsetWidth;
    cofre.querySelectorAll('.porta, .trinco, .brilho, .raios').forEach((el) => { el.style.transition = ''; });

    const titulo = $('#resultado-titulo');
    titulo.textContent = abriu ? 'Cofre aberto!' : 'Alarme disparado';
    titulo.className = `titulo-resultado ${abriu ? 'resultado-ok' : 'resultado-falhou'}`;
    $('#resultado-motivo').innerHTML = abriu
      ? `A senha era <span class="senha-era">${resposta}</span>.`
      : `${motivo} A senha era <span class="senha-era">${resposta}</span>.`;
    $('#resultado-pistas').innerHTML = explicarPistas(fase, estado.enigma);

    const ultima = estado.fase === FASES.length - 1;
    $('#btn-proxima').textContent = ultima ? 'Ver placar' : `Ir para a fase ${estado.fase + 2}`;

    mostrar('resultado');
    cofre.classList.add(abriu ? 'aberto' : 'trancado');

    clearTimeout(sireneTimer);
    const sirene = $('#sirene');
    sirene.classList.remove('ligada');
    if (abriu) {
      soltarMoedas(cofre);
      acender($('#flash'), ['dourado', 'ligado']);
      som('abrir');
      vibrar([30, 50, 30, 50, 30, 400, 200]);
    } else {
      acender($('#flash'), ['ligado']);
      sirene.classList.add('ligada');
      sireneTimer = setTimeout(() => sirene.classList.remove('ligada'), 2800);
      som('alarme');
      vibrar([300, 150, 300, 150, 300]);
    }
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
    const abertos = estado.resultados.filter(Boolean).length;
    delete document.body.dataset.metal;
    $('#placar-numero').innerHTML = `${abertos} de ${FASES.length}<small>cofres abertos</small>`;
    $('#medalhas').innerHTML = FASES.map((f, i) => {
      const ok = estado.resultados[i];
      return `<span class="medalha medalha-${f.metal} ${ok ? 'aberta' : 'fechada'}" style="--i:${i}" title="${f.nome}: ${ok ? 'aberto' : 'alarme'}">${ok ? '✓' : '✕'}</span>`;
    }).join('');
    $('#placar-texto').textContent = FRASES_PLACAR[abertos];
    mostrar('placar');
  });
})();
