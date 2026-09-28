(() => {
  const TEMPO_FASE = 180; // segundos
  const TENTATIVAS = 3; // por time
  const TIMES = ['A', 'B'];

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const esc = (t) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

  const estado = {
    fase: 0,
    resultados: [], // índice do time que abriu cada cofre, ou null
    enigma: null,
    pistas: [],
    tentativas: [TENTATIVAS, TENTATIVAS],
    digitando: 0,
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

  $$('[data-ir]').forEach((b) => b.addEventListener('click', () => trocarTela(b.dataset.ir)));

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

  // ---------- Começo do jogo ----------
  const timeDe = (t) => `Time ${TIMES[t]}`;

  $$('[data-iniciar]').forEach((b) => b.addEventListener('click', () => {
    estado.fase = 0;
    estado.resultados = [];
    abrirFase();
  }));

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
    estado.pistas = embaralhar(estado.enigma.pistas);

    trocarTela('fase', `<small>Fase ${estado.fase + 1} de ${FASES.length}</small>${fase.nome}`, () => {
      document.body.dataset.metal = fase.metal;
      $('#fase-numero').textContent = estado.fase + 1;
      $('#fase-num').textContent = `Fase ${estado.fase + 1} de ${FASES.length}`;
      $('#fase-nome').textContent = fase.nome;
      $('#fase-faixa').textContent = `A senha é um número de ${fase.min} a ${fase.max}.`;
      $('#fase-tema').textContent = fase.tema;
    });
  }

  $('#btn-distribuir').addEventListener('click', () => {
    trocarTela('discussao', `<small>Líder, leia em voz alta</small>Valendo!`, comecarDiscussao);
  });

  // ---------- Pistas (só o líder vê) ----------
  function fichaHTML(p, i) {
    return `
      <div class="ficha" data-pista="${p.texto}" style="--i:${i}">
        <span class="rotulo">Pista ${i + 1}</span>
        <p class="ficha-texto">${p.texto}</p>
        ${p.ajuda ? `<p class="ficha-ajuda">${p.ajuda}</p>` : ''}
      </div>`;
  }

  // ---------- Discussão ----------
  function formatarTempo(s) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function desenharLampadas(t, queimou) {
    const resta = estado.tentativas[t];
    const el = $(`#lampadas-${t}`);
    el.innerHTML = Array.from({ length: TENTATIVAS }, (_, i) => {
      const gasta = i >= resta;
      return `<span class="lampada${gasta ? ' gasta' : ''}${gasta && i === queimou ? ' queimou' : ''}"></span>`;
    }).join('');
    el.setAttribute('aria-label', `${timeDe(t)}: ${resta} ${resta === 1 ? 'tentativa' : 'tentativas'}`);
    const botao = $(`[data-digitar="${t}"]`);
    botao.disabled = resta === 0;
    botao.textContent = resta === 0 ? `${timeDe(t)} está fora` : `Resposta do ${timeDe(t)}`;
  }

  function comecarDiscussao() {
    const fase = FASES[estado.fase];
    estado.tentativas = [TENTATIVAS, TENTATIVAS];
    TIMES.forEach((_, t) => desenharLampadas(t));
    $('#discussao-faixa').textContent = `Senha de ${fase.min} a ${fase.max}. Leia as pistas para os dois times. Quando um time disser a resposta, toque no botão dele.`;
    $('#pistas-lider').innerHTML = estado.pistas.map(fichaHTML).join('');
    som('papel');

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
      terminarFase(null, 'O tempo acabou.');
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

  function abrirTeclado(t) {
    estado.digitando = t;
    estado.digitado = '';
    document.body.dataset.time = TIMES[t];
    $('#senha-titulo').textContent = `Resposta do ${timeDe(t)}`;
    $('#senha-msg').textContent = '';
    $('#visor').classList.remove('errado');
    atualizarVisor();
    abrirFolha('#folha-senha');
  }

  $$('[data-digitar]').forEach((b) => b.addEventListener('click', () => abrirTeclado(Number(b.dataset.digitar))));

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
    const t = estado.digitando;
    if (Number(digitos) === estado.enigma.resposta) {
      clearInterval(estado.relogio);
      await cena(digitos, 'certo', `${timeDe(t)} abriu!`);
      terminarFase(t);
      return;
    }
    estado.tentativas[t] -= 1;
    desenharLampadas(t, estado.tentativas[t]);
    if (estado.tentativas.every((n) => n === 0)) {
      clearInterval(estado.relogio);
      await cena(digitos, 'alarme', 'Os dois times erraram 3 vezes!');
      terminarFase(null, 'Os dois times gastaram as 3 tentativas.');
      return;
    }
    const resta = estado.tentativas[t];
    const aviso = resta === 0 ? `${timeDe(t)} está fora!` : `${timeDe(t)} errou. ${resta === 1 ? 'Resta 1 tentativa' : `Restam ${resta} tentativas`}`;
    await cena(digitos, 'errado', aviso);
    delete document.body.dataset.time;
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
      status.textContent = mensagem || 'Destravado!';
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
        </li>`;
    }).join('');
  }

  function terminarFase(vencedor, motivo) {
    soltarTela();
    fecharFolhas();
    delete document.body.dataset.time;

    const fase = FASES[estado.fase];
    const resposta = estado.enigma.resposta;
    const abriu = vencedor !== null;
    estado.resultados[estado.fase] = vencedor;

    // No resultado o cofre já aparece como terminou a cena, sem repetir a animação.
    $('#resultado-cofre .cofre').className = `cofre instantaneo ${abriu ? 'destravado aberto' : 'alarme-fixo'}`;

    const titulo = $('#resultado-titulo');
    titulo.textContent = abriu ? `${timeDe(vencedor)} venceu!` : 'Ninguém abriu';
    titulo.className = `titulo-resultado ${abriu ? 'resultado-ok' : 'resultado-falhou'}`;
    $('#resultado-motivo').innerHTML = abriu
      ? `O ${timeDe(vencedor)} abriu o cofre primeiro. A senha era <span class="senha-era">${resposta}</span>.`
      : `${motivo} A senha era <span class="senha-era">${resposta}</span>.`;
    $('#resultado-pistas').innerHTML = explicarPistas(fase, estado.enigma);

    const ultima = estado.fase === FASES.length - 1;
    $('#btn-proxima').textContent = ultima ? 'Ver placar' : `Ir para a fase ${estado.fase + 2}`;
    mostrar('resultado');
  }

  $('#btn-proxima').addEventListener('click', () => {
    if (estado.fase < FASES.length - 1) {
      estado.fase += 1;
      abrirFase();
      return;
    }
    const [a, b] = TIMES.map((_, t) => estado.resultados.filter((v) => v === t).length);
    trocarTela('placar', '<small>Fim de jogo</small>Placar', () => {
      delete document.body.dataset.metal;
      $('#placar-numero').innerHTML = `${a} × ${b}<small>Time A × Time B</small>`;
      $('#medalhas').innerHTML = FASES.map((f, i) => {
        const v = estado.resultados[i];
        const ok = v !== null;
        return `<span class="medalha medalha-${f.metal} ${ok ? 'aberta' : 'fechada'}" style="--i:${i}" title="${f.nome}: ${ok ? timeDe(v) : 'ninguém'}">${ok ? TIMES[v] : '✕'}</span>`;
      }).join('');
      $('#placar-texto').textContent = a === b ? 'Empate! Joguem de novo para desempatar.' : `${timeDe(a > b ? 0 : 1)} venceu o jogo!`;
    });
  });
})();
