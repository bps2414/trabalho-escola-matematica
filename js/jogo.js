(() => {
  const TEMPO_FASE = 120; // segundos
  const TENTATIVAS = 3;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const esc = (t) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

  const estado = {
    jogadores: 4,
    nomes: [],
    fase: 0,
    resultados: [],
    enigma: null,
    pistasDe: [],
    vez: 0,
    tentativas: TENTATIVAS,
    fimEm: 0,
    ultimoSegundo: null,
    relogio: null,
    emCena: false,
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
      if (tipo === 'cortina') tom(140, t, 0.18, 'sawtooth', 0.05);
      if (tipo === 'tique') tom(1100, t, 0.03, 'square', 0.06);
      if (tipo === 'bip') tom(1320, t, 0.09, 'square', 0.07);
      if (tipo === 'disco') for (let i = 0; i < 16; i++) tom(1600 - (i % 5) * 90, t + i * 0.09, 0.02, 'square', 0.05);
      if (tipo === 'coracao') {
        tom(62, t, 0.16, 'sine', 0.5);
        tom(55, t + 0.22, 0.2, 'sine', 0.4);
      }
      if (tipo === 'clac') {
        tom(160, t, 0.1, 'square', 0.14);
        tom(120, t + 0.12, 0.14, 'square', 0.14);
      }
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
        const osc = tom(90, t, 1.4, 'sawtooth', 0.05); // rangido da porta
        osc.frequency.linearRampToValueAtTime(60, t + 1.4);
        [523, 659, 784, 1047, 1319].forEach((f, i) => tom(f, t + 0.5 + i * 0.1, 1.1, 'sine', 0.07));
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
    $$('.tela').forEach((t) => {
      t.classList.remove('ativa');
      if (t.dataset.tela === nome) {
        void t.offsetWidth; // reinicia as animações de entrada mesmo na mesma tela
        t.classList.add('ativa');
      }
    });
    document.body.dataset.telaAtual = nome;
    window.scrollTo(0, 0);
  }
  document.body.dataset.telaAtual = 'inicio';

  // Fecha a cortina de aço, troca a tela por trás dela e abre de novo.
  async function trocarTela(nome, rotulo, preparar) {
    const cortina = $('#cortina');
    $('#cortina-rotulo').innerHTML = rotulo || '';
    cortina.classList.add('fechada');
    som('cortina');
    await esperar(rotulo ? 800 : 360);
    if (preparar) preparar();
    mostrar(nome);
    await esperar(rotulo ? 250 : 60);
    cortina.classList.remove('fechada');
  }

  $$('[data-ir]').forEach((b) => b.addEventListener('click', () => {
    trocarTela(b.dataset.ir, '', () => {
      if (b.dataset.ir === 'jogadores') delete document.body.dataset.metal;
    });
  }));

  // A porta do cofre é a mesma em todas as telas.
  $$('[data-cofre]').forEach((palco) => palco.appendChild($('#tpl-cofre').content.cloneNode(true)));

  // ---------- Folhas ----------
  function abrirFolha(id) { $(id).hidden = false; }
  function fecharFolha(id) { $(id).hidden = true; }
  function fecharFolhas() { $$('.folha').forEach((f) => { f.hidden = true; }); }

  $('#btn-regras').addEventListener('click', () => {
    abrirFolha('#folha-regras');
    $('#folha-regras .regras').scrollTop = 0;
  });
  $('#btn-regras-fechar').addEventListener('click', () => fecharFolha('#folha-regras'));

  $$('.folha').forEach((folha) => folha.addEventListener('click', (e) => {
    if (e.target === folha) folha.hidden = true; // toque fora fecha
  }));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharFolhas();
  });

  // ---------- Jogadores e nomes ----------
  let nomesDigitados = [];
  try { nomesDigitados = JSON.parse(localStorage.getItem('cofre-nomes') || '[]'); } catch (e) { nomesDigitados = []; }

  function desenharNomes() {
    const lista = $('#nomes');
    lista.innerHTML = '';
    for (let i = 0; i < estado.jogadores; i++) {
      const linha = document.createElement('label');
      linha.className = 'nome';
      linha.style.animationDelay = `${i * 40}ms`;
      linha.innerHTML = `<span aria-hidden="true">${i + 1}</span><input type="text" maxlength="14" autocomplete="off" enterkeyhint="next" placeholder="Jogador ${i + 1}" aria-label="Nome do jogador ${i + 1}">`;
      const campo = linha.querySelector('input');
      campo.value = nomesDigitados[i] || '';
      campo.addEventListener('input', () => {
        nomesDigitados[i] = campo.value;
        try { localStorage.setItem('cofre-nomes', JSON.stringify(nomesDigitados)); } catch (e) { /* sem armazenamento */ }
      });
      campo.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const proximo = lista.querySelectorAll('input')[i + 1];
        if (proximo) proximo.focus(); else campo.blur();
      });
      lista.appendChild(linha);
    }
  }
  desenharNomes();

  $$('[data-jogadores]').forEach((b) => b.addEventListener('click', () => {
    estado.jogadores = Number(b.dataset.jogadores);
    $$('[data-jogadores]').forEach((o) => o.setAttribute('aria-checked', String(o === b)));
    desenharNomes();
    som('tecla');
  }));

  const nomeDe = (i) => estado.nomes[i];

  $('#btn-iniciar').addEventListener('click', () => {
    estado.nomes = Array.from({ length: estado.jogadores }, (_, i) => (nomesDigitados[i] || '').trim() || `Jogador ${i + 1}`);
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

    trocarTela('fase', `<small>Fase ${estado.fase + 1} de ${FASES.length}</small>${fase.nome}`, () => {
      document.body.dataset.metal = fase.metal;
      $('#fase-numero').textContent = estado.fase + 1;
      $('#fase-num').textContent = `Fase ${estado.fase + 1} de ${FASES.length}`;
      $('#fase-nome').textContent = fase.nome;
      $('#fase-faixa').textContent = `A senha é um número de ${fase.min} a ${fase.max}.`;
      $('#fase-tema').textContent = fase.tema;
      $('#fase-dominio').hidden = !estado.enigma.pistas.some((p) => p.dominio);
    });
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
        ${p.ajuda ? `<p class="ficha-ajuda">${p.ajuda}</p>` : ''}
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
    const nome = nomeDe(i);
    trocarTela('passe', `<small>Passe o celular para</small>${esc(nome)}`, () => {
      estado.vez = i;
      const qtd = estado.pistasDe[i].length;
      $('#passe-fase').textContent = `Fase ${estado.fase + 1} · ${FASES[estado.fase].nome}`;
      $('#passe-jogador').textContent = nome;
      $('#passe-aviso').textContent = `Só ${nome} olha a tela. Você tem ${qtd} ${qtd === 1 ? 'pista' : 'pistas'}.`;
      esconderFichas($('#passe-fichas'), qtd, AVISO_PASSE);
      const passar = $('#btn-passar');
      passar.disabled = true;
      passar.textContent = i < estado.jogadores - 1 ? `Passar para ${nomeDe(i + 1)}` : 'Todos viram: começar';
    });
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
    else trocarTela('discussao', '<small>Todos viram as pistas</small>Discutam!', comecarDiscussao);
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
    estado.emCena = false;
    clearInterval(estado.relogio);
    estado.relogio = setInterval(atualizarRelogio, 200);
    atualizarRelogio();
    manterTelaLigada();
  }

  async function atualizarRelogio() {
    if (estado.emCena) return;
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
    if (restante === 0) {
      clearInterval(estado.relogio);
      await cena(null, 'alarme', 'O tempo acabou!');
      terminarFase(false, 'O tempo acabou.');
    }
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

  function abrirTeclado(mensagem) {
    estado.digitado = '';
    $('#senha-msg').textContent = mensagem || '';
    $('#visor').classList.remove('errado');
    atualizarVisor();
    abrirFolha('#folha-senha');
  }

  $('#btn-senha').addEventListener('click', () => abrirTeclado());

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

  $('#btn-abrir').addEventListener('click', async () => {
    const digitos = estado.digitado;
    if (Number(digitos) === estado.enigma.resposta) {
      clearInterval(estado.relogio);
      await cena(digitos, 'certo');
      terminarFase(true);
      return;
    }
    estado.tentativas -= 1;
    desenharLampadas(estado.tentativas);
    if (estado.tentativas === 0) {
      clearInterval(estado.relogio);
      await cena(digitos, 'alarme', 'As tentativas acabaram!');
      terminarFase(false, 'As 3 tentativas acabaram.');
      return;
    }
    const restam = estado.tentativas === 1 ? 'Resta 1 tentativa' : `Restam ${estado.tentativas} tentativas`;
    await cena(digitos, 'errado', restam);
    abrirTeclado(`ERRADO. ${restam}.`);
    $('#visor').classList.add('errado');
  });

  // ---------- Cena da senha ----------
  // O suspense: disco gira, os números acendem, o coração bate e o cofre responde.
  async function cena(digitos, final, mensagem) {
    estado.emCena = true;
    const inicio = Date.now();
    fecharFolhas();

    const palco = $('#cena');
    const cofre = $('#cena-palco .cofre');
    const status = $('#cena-status');
    const carimbo = $('#cena-carimbo');
    palco.className = 'cena';
    cofre.className = 'cofre instantaneo';
    cofre.querySelector('.particulas').innerHTML = '';
    carimbo.className = 'cena-carimbo';
    carimbo.textContent = '';
    $('#cena-visor').innerHTML = digitos ? [0, 1].slice(0, Math.max(digitos.length, 1)).map(() => '<span>?</span>').join('') : '';
    status.textContent = digitos ? 'Girando o disco…' : '';
    palco.hidden = false;
    void cofre.offsetWidth;
    cofre.classList.remove('instantaneo');

    if (digitos) {
      await esperar(350);
      cofre.classList.add('girando');
      som('disco');
      const casas = $$('#cena-visor span');
      for (let i = 0; i < casas.length; i++) {
        await esperar(i === 0 ? 450 : 550);
        casas[i].textContent = digitos[i];
        casas[i].classList.add('aceso');
        som('bip');
        vibrar(20);
      }
      await esperar(500);
      status.textContent = 'Conferindo…';
      palco.classList.add('suspense');
      som('coracao');
      setTimeout(() => som('coracao'), 700);
      await esperar(final === 'certo' ? 1400 : 1150);
      palco.classList.remove('suspense');
    }

    if (final === 'certo') {
      palco.classList.add('certo');
      cofre.classList.add('destravado');
      status.textContent = 'Destravado!';
      som('clac');
      vibrar([60, 40, 60]);
      await esperar(550);
      cofre.classList.add('aberto');
      soltarMoedas(cofre, 0.5);
      acender(['dourado', 'ligado']);
      som('abrir');
      vibrar([30, 50, 30, 50, 400]);
      await esperar(1500);
      carimbo.textContent = 'Aberto!';
      carimbo.classList.add('mostrar', 'dourado');
      await esperar(1400);
    } else if (final === 'errado') {
      palco.classList.add('negado');
      cofre.classList.add('negado');
      status.textContent = mensagem;
      carimbo.textContent = 'Errado';
      carimbo.classList.add('mostrar', 'vermelho');
      som('erro');
      vibrar([120, 60, 120]);
      await esperar(1600);
    } else {
      palco.classList.add('alarme');
      cofre.classList.add('trancado');
      status.textContent = mensagem;
      carimbo.textContent = 'Alarme!';
      carimbo.classList.add('mostrar', 'vermelho');
      acender(['ligado']);
      const sirene = $('#sirene');
      sirene.classList.add('ligada');
      som('alarme');
      vibrar([300, 150, 300, 150, 300]);
      await esperar(2700);
      sirene.classList.remove('ligada');
    }

    palco.classList.add('saindo');
    await esperar(320);
    palco.hidden = true;
    estado.emCena = false;
    if (final === 'errado') estado.fimEm += Date.now() - inicio; // o suspense não gasta o tempo do grupo
  }

  function soltarMoedas(cofre, atrasoBase) {
    const tipos = ['', '', 'lingote', 'faisca', 'faisca'];
    cofre.querySelector('.particulas').innerHTML = Array.from({ length: 40 }, (_, i) => {
      const angulo = Math.random() * Math.PI * 2;
      const dist = 110 + Math.random() * 160;
      const dx = Math.round(Math.cos(angulo) * dist);
      const dy = Math.round(Math.sin(angulo) * dist * 0.8 - 40);
      const giro = Math.round(Math.random() * 720 - 360);
      const atraso = (atrasoBase + Math.random() * 0.4).toFixed(2);
      return `<span class="particula ${tipos[i % tipos.length]}" style="--dx:${dx}px;--dy:${dy}px;--giro:${giro}deg;--atraso:${atraso}s"></span>`;
    }).join('');
  }

  function acender(classes) {
    const el = $('#flash');
    el.className = 'flash';
    void el.offsetWidth;
    el.classList.add(...classes);
  }

  // ---------- Rever pista ----------
  let revendo = null;
  const avisoRever = () => `Só ${nomeDe(revendo)} olha. Segure o botão.`;

  $('#btn-rever').addEventListener('click', () => {
    revendo = null;
    const chips = $('#rever-chips');
    chips.innerHTML = '';
    estado.pistasDe.forEach((_, i) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.dataset.rever = i;
      chip.setAttribute('aria-pressed', 'false');
      chip.textContent = nomeDe(i);
      chips.appendChild(chip);
    });
    $('#rever-fichas').innerHTML = '<p class="fichas-aviso">Escolha seu nome.</p>';
    $('#rever-segurar').disabled = true;
    abrirFolha('#folha-rever');
  });

  $('#rever-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-rever]');
    if (!chip) return;
    revendo = Number(chip.dataset.rever);
    $$('#rever-chips button').forEach((b) => b.setAttribute('aria-pressed', String(b === chip)));
    $('#rever-segurar').disabled = false;
    esconderFichas($('#rever-fichas'), estado.pistasDe[revendo].length, esc(avisoRever()));
  });

  ligarSegurar(
    $('#rever-segurar'),
    () => mostrarFichas($('#rever-fichas'), estado.pistasDe[revendo]),
    () => esconderFichas($('#rever-fichas'), estado.pistasDe[revendo].length, esc(avisoRever())),
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

  function terminarFase(abriu, motivo) {
    soltarTela();
    fecharFolhas();

    const fase = FASES[estado.fase];
    const resposta = estado.enigma.resposta;
    estado.resultados[estado.fase] = abriu;

    // No resultado o cofre já aparece como terminou a cena, sem repetir a animação.
    $('#resultado-cofre .cofre').className = `cofre instantaneo ${abriu ? 'destravado aberto' : 'alarme-fixo'}`;

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
    trocarTela('placar', '<small>Fim de jogo</small>Placar', () => {
      delete document.body.dataset.metal;
      $('#placar-numero').innerHTML = `${abertos} de ${FASES.length}<small>cofres abertos</small>`;
      $('#medalhas').innerHTML = FASES.map((f, i) => {
        const ok = estado.resultados[i];
        return `<span class="medalha medalha-${f.metal} ${ok ? 'aberta' : 'fechada'}" style="--i:${i}" title="${f.nome}: ${ok ? 'aberto' : 'alarme'}">${ok ? '✓' : '✕'}</span>`;
      }).join('');
      $('#placar-texto').textContent = FRASES_PLACAR[abertos];
    });
  });
})();
