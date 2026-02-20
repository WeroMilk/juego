/**
 * Dioses en Guerra - Interfaz de usuario
 * Renderizado del tablero, setup, acciones y modales.
 */

/** Ruta base para ilustraciones de cartas (opcional). Si no hay imagen, se usa emoji. */
const CARD_ART_BASE = 'assets/cartas/';

/** Ruta base para iconos pixel-art estilo Pokémon/Tibia (GIF o PNG). */
const CARD_ICON_BASE = 'assets/icons/';

/**
 * Devuelve la URL de la ilustración de una carta, o null si no tiene.
 */
function getCardArtUrl(carta) {
  if (!carta || !carta.ilustracion) return null;
  return CARD_ART_BASE + carta.ilustracion;
}

/**
 * Devuelve la URL del icono pixel-art de una carta (GIF/PNG). Si no hay icono, null.
 * Nombres por id base: medusa, thor, energia, curacion, etc.
 * Busca .gif; puedes usar .png cambiando la extensión aquí.
 */
function getCardIconUrl(carta) {
  if (!carta) return null;
  const baseId = carta.tipo === 'energia' ? 'energia' : (carta.id || '').split('_')[0];
  if (!baseId) return null;
  return CARD_ICON_BASE + baseId + '.gif';
}

/**
 * Devuelve el emoji de una carta (fallback cuando no hay icono).
 */
function getEmojiCarta(carta) {
  if (!carta) return '';
  if (carta.emoji) return carta.emoji;
  if (carta.tipo === 'energia') return '⚡';
  if (carta.tipo === 'trampa') return '🃏';
  return '⚔️';
}

/**
 * HTML para mostrar icono de carta: imagen pixel-art con fallback a emoji si la imagen falla.
 */
function getCardIconHtml(carta) {
  const emoji = getEmojiCarta(carta);
  const url = getCardIconUrl(carta);
  if (!url) return `<span class="card-emoji">${emoji}</span>`;
  return `<span class="card-icon-wrap"><img src="${url}" class="card-icon pixel-art" alt="" onerror="this.onerror=null;this.style.display='none';var n=this.nextElementSibling;if(n)n.style.display='inline';" onload="var n=this.nextElementSibling;if(n)n.style.display='none';"><span class="card-emoji card-emoji-fallback" style="display:none">${emoji}</span></span>`;
}

/**
 * Log de partida tipo chat: daños, curaciones y (en el futuro) mensajes de jugadores online.
 */
const GameLog = {
  mensajes: [],
  maxMensajes: 100,

  _nombreJugador(jugador) {
    if (!Game.estado) return jugador === 'player' ? 'Jugador 1' : 'Jugador 2';
    const s = Game.estado;
    if (s.modo === 'local') return jugador === 'player' ? 'Jugador 1' : 'Jugador 2';
    return jugador === 'player' ? 'Tú' : 'Rival';
  },

  /** Devuelve nombre del héroe con etiqueta (Tú) o (Enemigo) para el log */
  _hero(nombre, jugador) {
    if (!nombre) return '?';
    const etiqueta = jugador === 'player' ? ' (Tú)' : ' (Enemigo)';
    return nombre + etiqueta;
  },

  addDamage(atacanteJugador, atacanteNombre, defensorNombre, dano) {
    const defensorJugador = atacanteJugador === 'player' ? 'rival' : 'player';
    const quien = this._nombreJugador(atacanteJugador);
    const esTu = Game.estado && Game.estado.modo !== 'local' && atacanteJugador === 'player';
    const verboAtacar = esTu ? 'has atacado' : 'ha atacado';
    const verboHacer = esTu ? 'has hecho' : 'ha hecho';
    this.mensajes.push({
      type: 'damage',
      html: `${quien} ${verboAtacar} con <strong>${this._hero(atacanteNombre, atacanteJugador)}</strong> a <strong>${this._hero(defensorNombre, defensorJugador)}</strong> y le ${verboHacer} <span class="log-value">-${dano}</span> de daño 🩸`
    });
    this._trim();
    this._render();
  },

  addBlockedDamage(atacanteJugador, atacanteNombre, defensorNombre, danoBloqueado) {
    const defensorJugador = atacanteJugador === 'player' ? 'rival' : 'player';
    const quien = this._nombreJugador(atacanteJugador);
    const esTu = Game.estado && Game.estado.modo !== 'local' && atacanteJugador === 'player';
    const verboAtacar = esTu ? 'has atacado' : 'ha atacado';
    this.mensajes.push({
      type: 'block',
      html: `${quien} ${verboAtacar} con <strong>${this._hero(atacanteNombre, atacanteJugador)}</strong> a <strong>${this._hero(defensorNombre, defensorJugador)}</strong> y se han bloqueado <span class="log-value">${danoBloqueado}</span> de daño 🛡️`
    });
    this._trim();
    this._render();
  },

  addHeal(jugador, heroeNombre, cantidad) {
    const quien = this._nombreJugador(jugador);
    const esTu = Game.estado && Game.estado.modo !== 'local' && jugador === 'player';
    const verbo = esTu ? 'has curado' : 'ha curado';
    this.mensajes.push({
      type: 'heal',
      html: `${quien} ${verbo} a <strong>${this._hero(heroeNombre, jugador)}</strong>: <span class="log-value">+${cantidad}</span> 💚`
    });
    this._trim();
    this._render();
  },

  addSystem(texto) {
    this.mensajes.push({ type: 'system', html: texto });
    this._trim();
    this._render();
  },

  addSpecialEffect(jugador, efectoNombre, descripcion) {
    const quien = this._nombreJugador(jugador);
    const esTu = Game.estado && Game.estado.modo !== 'local' && jugador === 'player';
    const verbo = esTu ? 'has activado' : 'ha activado';
    this.mensajes.push({
      type: 'effect',
      html: `${quien} ${verbo} <strong>${this._hero(efectoNombre, jugador)}</strong>: ${descripcion} ✨`
    });
    this._trim();
    this._render();
  },

  addHeroKilled(jugador, heroeNombre, esEnemigo) {
    const quien = this._nombreJugador(jugador);
    const esTu = Game.estado && Game.estado.modo !== 'local' && jugador === 'player';
    const icono = esEnemigo ? '⚔️' : '💀';
    const verbo = esTu ? 'has eliminado' : 'ha eliminado';
    const jugadorHeroe = esEnemigo ? 'rival' : 'player';
    this.mensajes.push({
      type: 'kill',
      html: `${quien} ${verbo} a <strong>${this._hero(heroeNombre, jugadorHeroe)}</strong> ${icono}`
    });
    this._trim();
    this._render();
  },

  _trim() {
    if (this.mensajes.length > this.maxMensajes) this.mensajes = this.mensajes.slice(-this.maxMensajes);
  },

  _render() {
    const el = document.getElementById('game-log-messages');
    if (!el) return;
    el.innerHTML = this.mensajes.map(m => `<div class="log-msg log-${m.type}">${m.html}</div>`).join('');
    el.scrollTop = el.scrollHeight;
  },

  clear() {
    this.mensajes = [];
    this._render();
  }
};

const UI = {
  callbackLuciferQuemar: null,
  callbackSeleccionHeroe: null,
  getEmojiCarta,
  /** Modo interactivo: null | { tipo: 'energia' } | { tipo: 'energia', indiceMano } | { tipo: 'atacar' } | { tipo: 'atacar', atacanteSlot } | { tipo: 'soporte' } | { tipo: 'soporte', indiceMano } */
  estadoModoInteractivo: null,
  establecerModoInteractivo(modo) {
    this.estadoModoInteractivo = modo;
  },

  mostrarPantalla(id) {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    const screen = document.getElementById(id);
    if (screen) screen.classList.add('active');
  },

  mostrarMenu() {
    this.mostrarPantalla('menu-screen');
    const dc = document.getElementById('dificultad-container');
    if (dc) dc.classList.add('hidden');
  },

  asignacionSetup: { heroes: [], bocaAbajo: [], mano: [] },
  _manoInicialSetup: null,
  _setupEsRival: false,

  mostrarSetup(manoInicial, esRival = false) {
    // Mostrar el tablero primero (vacío) y luego el overlay de setup
    this.mostrarPantalla('game-screen');
    const overlay = document.getElementById('setup-overlay');
    if (overlay) overlay.classList.remove('hidden');
    
    // Inicializar arrays con la longitud correcta (nulls para mantener índices)
    // Las cartas empiezan todas en la mano
    this.asignacionSetup = { 
      heroes: [null, null], 
      bocaAbajo: [null, null, null], 
      mano: [...manoInicial] // Todas las cartas empiezan en la mano
    };
    this._manoInicialSetup = manoInicial;
    this._setupEsRival = esRival;
    
    const titulo = document.getElementById('setup-titulo');
    const inst = document.getElementById('setup-instructions');
    if (esRival) {
      titulo.textContent = 'Configura el campo del Jugador 2';
      inst.textContent = 'Arrastra las cartas desde tu mano a las zonas del tablero: 2 héroes, 3 de soporte y 3 en mano.';
    } else {
      titulo.textContent = 'Configura tu campo';
      inst.textContent = 'Arrastra las cartas desde tu mano a las zonas del tablero: 2 héroes, 3 de soporte y 3 en mano.';
    }
    
    // Renderizar tablero con las cartas en la mano
    this.renderizarTableroSetup();
    this.actualizarVistaSetup();
    this.actualizarContadoresSetup();
    const btnConfirmar = document.getElementById('btn-confirmar-setup');
    if (btnConfirmar) btnConfirmar.disabled = true;
    this.setupBindDragDrop();
  },
  
  renderizarTableroSetup() {
    // Renderizar un tablero con las cartas inicialmente en la mano
    const s = Game.estado;
    if (!s) return;
    
    const playerZone = document.getElementById('player-zone');
    const rivalZone = document.getElementById('rival-zone');
    
    if (!playerZone) return;
    
    // Configurar slots de héroes como targets
    playerZone.querySelectorAll('.hero-slot').forEach((slot, i) => {
      slot.classList.add('setup-target');
      slot.dataset.setupZone = 'heroes';
      slot.dataset.setupIndex = i;
    });
    
    // Configurar slots de soporte como targets
    playerZone.querySelectorAll('.hidden-slot').forEach((slot, i) => {
      slot.classList.add('setup-target');
      slot.dataset.setupZone = 'bocaAbajo';
      slot.dataset.setupIndex = i;
    });
    
    // Configurar slots de mano como targets y también como origen
    playerZone.querySelectorAll('.hand-slot').forEach((slot, i) => {
      slot.classList.add('setup-target', 'setup-hand-slot');
      slot.dataset.setupZone = 'mano';
      slot.dataset.setupIndex = i;
    });
    
    // Ocultar zona del rival durante setup
    if (rivalZone) rivalZone.style.opacity = '0.3';
    
    // Ocultar centro y chat durante setup
    const centerZone = document.querySelector('.center-zone');
    const chatPanel = document.querySelector('.game-chat-panel');
    if (centerZone) centerZone.style.opacity = '0.3';
    if (chatPanel) chatPanel.style.opacity = '0.3';
    
    // Ocultar mazo y descarte durante setup (están en center-zone, no en player-zone)
    const deckPile = document.getElementById('deck-pile');
    const discardPile = document.getElementById('discard-pile');
    if (deckPile) deckPile.style.opacity = '0.3';
    if (discardPile) discardPile.style.opacity = '0.3';
  },

  obtenerCartasEnPool() {
    // Ya no usamos pool, todas las cartas están en la mano inicialmente
    return [];
  },

  actualizarVistaSetup() {
    // Ocultar el pool ya que las cartas están en la mano
    const pool = document.getElementById('setup-pool');
    if (pool) {
      pool.style.display = 'none';
    }
    
    // Las cartas en el tablero se actualizan mediante renderizarCartasEnTableroSetup()
    this.renderizarCartasEnTableroSetup();
    this.setupBindDragDrop();
  },

  crearSetupCardEl(carta, sourceZone) {
    const self = this;
    const card = document.createElement('div');
    
    // Si es para la mano, usar estilo de carta mini del tablero
    if (sourceZone === 'mano') {
      card.className = 'card-mini setup-card-draggable';
      if (getCardArtUrl(carta)) card.classList.add('has-art');
      const iconHtml = getCardIconHtml(carta);
      const artUrl = getCardArtUrl(carta);
      const artImg = artUrl ? `<img class="card-art" src="${artUrl}" alt="" onerror="this.classList.add('card-art-failed')">` : '';
      const tipoLabel = carta.tipo === 'heroe' ? 'Héroe' : carta.tipo === 'trampa' ? 'Trampa' : 'Energía';
      const tooltipMano = carta.tipo === 'heroe' ? (carta.nombre + ' | Ataque ' + (carta.ataque || 0) + ' Vida ' + (carta.vidaMax || carta.vida) + ' | Costo ' + (carta.costoEnergia ?? 0) + (carta.habilidad ? ' | ' + carta.habilidad : '')) : carta.tipo === 'trampa' ? ((carta.nombre || carta.id) + (carta.efecto || carta.efectoId ? ' | ' + (carta.efecto || carta.efectoId) : '')) : (carta.nombre || 'Energía');
      card.title = tooltipMano;
      card.innerHTML = `
        ${artImg}
        <div class="card-text">
          ${iconHtml}
          <span class="card-nombre">${carta.nombre || 'Energía'}</span>
          <span class="card-tipo">${tipoLabel}</span>
          ${carta.tipo === 'heroe' ? `<span class="card-stats">⚔${carta.ataque} ❤${carta.vidaMax || carta.vida}</span><span class="card-costo">⚡${carta.costoEnergia ?? 0}</span>` : ''}
        </div>
      `;
    } else {
      // Para otras zonas, usar estilo de setup-card-item
      card.className = 'setup-card-item setup-card-draggable';
      if (getCardArtUrl(carta)) card.classList.add('has-art');
      const iconHtml = getCardIconHtml(carta);
      const artUrl = getCardArtUrl(carta);
      const artImg = artUrl ? `<img class="card-art" src="${artUrl}" alt="" onerror="this.classList.add('card-art-failed')">` : '';
      card.innerHTML = `
        ${artImg}
        <div class="card-text">
          ${iconHtml}
          <span class="nombre">${carta.nombre || 'Energía'}</span>
          <span class="tipo">${carta.tipo === 'heroe' ? 'Héroe' : carta.tipo === 'trampa' ? 'Trampa' : 'Energía'}</span>
          ${carta.tipo === 'heroe' ? `<span class="stats">⚔${carta.ataque} ❤${carta.vidaMax || carta.vida}</span><span class="costo-energia">⚡${carta.costoEnergia ?? 0}</span>` : ''}
        </div>
      `;
    }
    
    card.draggable = true;
    card._setupCarta = carta;
    card._setupSource = sourceZone;
    
    card.addEventListener('dragstart', (e) => {
      e.stopPropagation();
      e.dataTransfer.setData('text/plain', sourceZone);
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('setup-dragging');
      self._setupDragCard = carta;
      self._setupDragSource = sourceZone;
      if (card._setupIndex != null) {
        self._setupDragIndex = card._setupIndex;
      }
    });
    
    card.addEventListener('dragend', () => {
      card.classList.remove('setup-dragging');
      document.querySelectorAll('.setup-target').forEach(z => z.classList.remove('setup-drop-active'));
      self._setupDragCard = null;
      self._setupDragSource = null;
      self._setupDragIndex = null;
    });
    
    return card;
  },

  setupBindDragDrop() {
    const self = this;
    
    // Configurar drop zones en el tablero
    const playerZone = document.getElementById('player-zone');
    if (playerZone) {
      playerZone.querySelectorAll('.setup-target').forEach(slot => {
        const zoneType = slot.dataset.setupZone;
        const slotIndex = parseInt(slot.dataset.setupIndex);
        
        slot.ondragover = (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = 'move';
          if (!self._setupDragCard) return;
          const arr = self.asignacionSetup[zoneType];
          const max = zoneType === 'heroes' ? 2 : 3;
          const arrFiltered = arr.filter(c => c !== null);
          const slotHasCard = arr[slotIndex] !== null && arr[slotIndex] !== undefined;
          const canAdd = zoneType === 'heroes' 
            ? (self._setupDragCard.tipo === 'heroe' && (arrFiltered.length < max || slotHasCard))
            : (arrFiltered.length < max || slotHasCard);
          if (canAdd) {
            slot.classList.add('setup-drop-active');
          }
        };
        
        slot.ondragleave = (e) => {
          if (!slot.contains(e.relatedTarget)) {
            slot.classList.remove('setup-drop-active');
          }
        };
        
        slot.ondrop = (e) => {
          e.preventDefault();
          e.stopPropagation();
          slot.classList.remove('setup-drop-active');
          const carta = self._setupDragCard;
          if (!carta) return;
          
          const arr = self.asignacionSetup[zoneType];
          
          // Validaciones
          if (zoneType === 'heroes' && carta.tipo !== 'heroe') return;
          
          // Guardar la carta que estaba en este slot (si existe)
          const cartaAnterior = arr[slotIndex];
          
          // Remover de la zona anterior
          if (self._setupDragSource && self._setupDragSource !== 'pool') {
            const prev = self.asignacionSetup[self._setupDragSource];
            // Usar el índice guardado si viene de la mano, sino buscar
            const i = (self._setupDragSource === 'mano' && self._setupDragIndex != null) 
              ? self._setupDragIndex 
              : prev.indexOf(carta);
            if (i !== -1 && i < prev.length) {
              // Si es la misma zona y hay una carta anterior, intercambiar
              if (self._setupDragSource === zoneType && cartaAnterior) {
                prev[i] = cartaAnterior;
              } else {
                // Remover de la zona anterior
                prev[i] = null;
                // Si viene de la mano y había una carta anterior, ponerla en la posición de origen
                if (self._setupDragSource === 'mano' && cartaAnterior) {
                  prev[i] = cartaAnterior;
                }
              }
            }
          }
          
          // Asignar la nueva carta a este slot
          arr[slotIndex] = carta;
          
          // Limpiar arrays de nulls al final pero mantener estructura
          if (zoneType === 'heroes') {
            // Mantener siempre 2 slots
            while (arr.length < 2) arr.push(null);
          } else if (zoneType === 'bocaAbajo') {
            // Mantener siempre 3 slots
            while (arr.length < 3) arr.push(null);
          } else if (zoneType === 'mano') {
            // La mano puede tener más de 3 cartas durante el setup
            // Pero al final debe tener exactamente 3
          }
          
          self.actualizarVistaSetup();
          self.actualizarContadoresSetup();
        };
      });
    }
    
    // Configurar pool para recibir cartas de vuelta
    const pool = document.getElementById('setup-pool');
    if (pool) {
      pool.ondragover = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        if (self._setupDragSource && self._setupDragSource !== 'pool') {
          pool.classList.add('setup-drop-active');
        }
      };
      pool.ondragleave = (e) => {
        if (!pool.contains(e.relatedTarget)) {
          pool.classList.remove('setup-drop-active');
        }
      };
      // El pool ya no se usa, pero mantenemos el código por si acaso
      pool.ondrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        pool.classList.remove('setup-drop-active');
        // Ya no usamos pool, las cartas vuelven a la mano
        const carta = self._setupDragCard;
        if (!carta || self._setupDragSource === 'mano') return;
        
        // Remover de la zona anterior y poner en la mano
        const prev = self.asignacionSetup[self._setupDragSource];
        const i = prev.indexOf(carta);
        if (i !== -1) {
          prev[i] = null;
          // Agregar a la mano
          const manoArr = self.asignacionSetup.mano;
          const manoIndex = manoArr.findIndex(c => c === null);
          if (manoIndex !== -1) {
            manoArr[manoIndex] = carta;
          } else {
            manoArr.push(carta);
          }
        }
        
        self.actualizarVistaSetup();
        self.actualizarContadoresSetup();
      };
    }
  },

  actualizarContadoresSetup() {
    const a = this.asignacionSetup;
    const heroesCount = a.heroes.filter(c => c !== null).length;
    const soporteCount = a.bocaAbajo.filter(c => c !== null).length;
    const manoCount = a.mano.filter(c => c !== null).length;
    
    const heroesEl = document.getElementById('setup-counter-heroes');
    const soporteEl = document.getElementById('setup-counter-soporte');
    const manoEl = document.getElementById('setup-counter-mano');
    if (heroesEl) heroesEl.textContent = `Héroes: ${heroesCount}/2`;
    if (soporteEl) soporteEl.textContent = `Soporte: ${soporteCount}/3`;
    if (manoEl) manoEl.textContent = `Mano: ${manoCount}/3`;
    
    const ok = heroesCount === 2 && soporteCount === 3 && manoCount === 3;
    const btnConfirmar = document.getElementById('btn-confirmar-setup');
    if (btnConfirmar) btnConfirmar.disabled = !ok;
    
    // Actualizar visualización en el tablero
    this.renderizarCartasEnTableroSetup();
  },
  
  renderizarCartasEnTableroSetup() {
    const a = this.asignacionSetup;
    const playerZone = document.getElementById('player-zone');
    if (!playerZone) return;
    
    // Renderizar héroes asignados (filtrar nulls)
    const heroes = a.heroes.filter(c => c !== null);
    playerZone.querySelectorAll('.hero-slot').forEach((slot, i) => {
      const heroe = heroes[i];
      if (heroe) {
        this.rellenarHeroSlot(slot, heroe, 'player', i);
        slot.classList.add('setup-filled');
      } else {
        slot.innerHTML = '';
        slot.classList.remove('setup-filled');
      }
    });
    
    // Renderizar soporte asignado (filtrar nulls)
    const bocaAbajo = a.bocaAbajo.filter(c => c !== null);
    playerZone.querySelectorAll('.hidden-slot').forEach((slot, i) => {
      const carta = bocaAbajo[i];
      if (carta) {
        this.rellenarHiddenSlot(slot, carta, false);
        slot.classList.add('setup-filled');
      } else {
        slot.innerHTML = '';
        slot.classList.remove('setup-filled');
      }
    });
    
    // Renderizar mano - mostrar todas las cartas que están en la mano
    const mano = a.mano.filter(c => c !== null);
    const handRow = playerZone.querySelector('#player-hand-row');
    const handSlots = playerZone.querySelectorAll('.hand-slot');
    const self = this;
    
    // Limpiar todos los slots primero
    handSlots.forEach(slot => {
      slot.innerHTML = '';
      slot.classList.remove('setup-filled', 'setup-hand-slot');
    });
    
    // Renderizar todas las cartas disponibles (pueden ser más de 7)
    mano.forEach((carta, i) => {
      if (i < handSlots.length) {
        // Usar slot existente
        const slot = handSlots[i];
        const cardEl = this.crearSetupCardEl(carta, 'mano');
        cardEl._setupIndex = i;
        slot.appendChild(cardEl);
        slot.classList.add('setup-filled', 'setup-hand-slot');
      } else {
        // Crear slot adicional si hay más de 7 cartas (para las 8 cartas iniciales)
        const slot = document.createElement('div');
        slot.className = 'hand-slot setup-target setup-filled setup-hand-slot';
        slot.dataset.setupZone = 'mano';
        slot.dataset.setupIndex = i.toString();
        slot.dataset.slot = i.toString();
        const cardEl = this.crearSetupCardEl(carta, 'mano');
        cardEl._setupIndex = i;
        slot.appendChild(cardEl);
        if (handRow) handRow.appendChild(slot);
      }
    });
  },
  
  limpiarSetupTargets() {
    const playerZone = document.getElementById('player-zone');
    if (playerZone) {
      playerZone.querySelectorAll('.setup-target').forEach(slot => {
        slot.classList.remove('setup-target', 'setup-filled', 'setup-drop-active');
        delete slot.dataset.setupZone;
        delete slot.dataset.setupIndex;
      });
    }
  },

  obtenerSetupSeleccionado() {
    const a = this.asignacionSetup;
    return {
      heroes: a.heroes.filter(c => c !== null),
      bocaAbajo: a.bocaAbajo.filter(c => c !== null),
      mano: a.mano.filter(c => c !== null)
    };
  },

  renderizarTablero() {
    const s = Game.estado;
    if (!s) return;
    document.querySelectorAll('.sugerida').forEach(el => el.classList.remove('sugerida'));

    const gameScreen = document.getElementById('game-screen');
    if (gameScreen) {
      gameScreen.classList.remove('turno-player', 'turno-rival');
      gameScreen.classList.add(s.turnoActual === 'player' ? 'turno-player' : 'turno-rival');
    }

    const numTurno = s.numeroTurno != null ? s.numeroTurno : 1;
    const quien = s.modo === 'local'
      ? (s.turnoActual === 'player' ? 'Jugador 1' : 'Jugador 2')
      : (s.turnoActual === 'player' ? 'Tú' : 'Rival');
    document.getElementById('turn-number-label').textContent = `Turno ${numTurno}`;
    document.getElementById('turn-label').textContent = ` Atacando: ${quien}`;
    document.getElementById('phase-label').textContent = '';
    document.getElementById('actions-left').textContent = `Movimientos: ${s.accionesRestantes}`;
    document.getElementById('deck-count').textContent = s.mazo.length;
    document.getElementById('discard-count').textContent = s.descarte.length;

    const playerZone = document.getElementById('player-zone');
    const rivalZone = document.getElementById('rival-zone');
    playerZone.querySelectorAll('.hero-slot').forEach((slot, i) => {
      this.rellenarHeroSlot(slot, s.player.heroes[i], 'player', i);
    });
    rivalZone.querySelectorAll('.hero-slot').forEach((slot, i) => {
      this.rellenarHeroSlot(slot, s.rival.heroes[i], 'rival', i);
    });
    playerZone.querySelectorAll('.hidden-slot').forEach((slot, i) => {
      this.rellenarHiddenSlot(slot, s.player.bocaAbajo[i]);
    });
    rivalZone.querySelectorAll('.hidden-slot').forEach((slot, i) => {
      this.rellenarHiddenSlot(slot, s.rival.bocaAbajo[i]);
    });
    playerZone.querySelectorAll('.hand-slot').forEach((slot, i) => {
      this.rellenarHandSlot(slot, s.player.mano[i], i);
    });
    rivalZone.querySelectorAll('.hand-slot').forEach((slot, i) => {
      this.rellenarHandSlotRival(slot, s.rival.mano[i], i);
    });
    document.getElementById('player-name').textContent = s.modo === 'local' ? 'Jugador 1' : 'Tú';
    document.getElementById('rival-name').textContent = s.modo === 'local' ? 'Jugador 2' : 'Rival';

    this.aplicarClasesModoInteractivo();
    if (this.sugerenciaActual) {
      const sug = this.sugerenciaActual;
      if (sug.tipo === 'atacar') {
        const el1 = document.querySelector('#player-zone .hero-slot[data-slot="' + sug.atacanteSlot + '"]');
        const el2 = document.querySelector('#rival-zone .hero-slot[data-slot="' + sug.defensorSlot + '"]');
        if (el1) el1.classList.add('sugerida');
        if (el2) el2.classList.add('sugerida');
      } else if (sug.tipo === 'energia' && sug.indiceMano != null && sug.heroeSlot != null) {
        const el1 = document.querySelector('#player-zone .hand-slot[data-index="' + sug.indiceMano + '"]');
        const el2 = document.querySelector('#player-zone .hero-slot[data-slot="' + sug.heroeSlot + '"]');
        if (el1) el1.classList.add('sugerida');
        if (el2) el2.classList.add('sugerida');
      }
    }
    this.actualizarBotonesAccion();
    const scrollEl = document.getElementById('player-hand-scroll');
    if (scrollEl) scrollEl.dispatchEvent(new CustomEvent('tableroActualizado'));
    const rivalScrollEl = document.getElementById('rival-hand-scroll');
    if (rivalScrollEl) rivalScrollEl.dispatchEvent(new CustomEvent('tableroActualizado'));
    if (typeof this.afterRender === 'function') this.afterRender();
  },

  aplicarClasesModoInteractivo() {
    const modo = this.estadoModoInteractivo;
    const s = Game.estado;
    if (!s || !modo) return;
    const playerZone = document.getElementById('player-zone');
    const rivalZone = document.getElementById('rival-zone');
    const esTurnoPlayer = s.turnoActual === 'player';
    const esHumano = s.modo === 'local' || esTurnoPlayer;
    if (!esHumano) return;

    if (modo.tipo === 'energia') {
      playerZone.querySelectorAll('.hand-slot').forEach((slot, i) => {
        const carta = s.player.mano[i];
        if (carta && carta.tipo === 'energia') {
          if (modo.indiceMano === undefined) slot.classList.add('seleccionable');
          else if (i === modo.indiceMano) slot.classList.add('seleccionable', 'seleccionada');
        }
      });
      if (modo.indiceMano !== undefined) {
        playerZone.querySelectorAll('.hero-slot').forEach((slot, i) => {
          const h = s.player.heroes[i];
          const maxE = (typeof Game !== 'undefined' && Game.maxEnergiaHeroe) ? Game.maxEnergiaHeroe(h) : 3;
          if (h && h.vida > 0 && (h.energiaStack ? h.energiaStack.length < maxE : true))
            slot.classList.add('objetivo-energia');
        });
      }
    } else if (modo.tipo === 'atacar' && modo.atacanteSlot !== undefined) {
      // Modo atacar: mostrar héroes enemigos y cartas de soporte como objetivos
      rivalZone.querySelectorAll('.hero-slot').forEach((slot, i) => {
        const h = s.rival.heroes[i];
        if (h && h.vida > 0) slot.classList.add('objetivo-ataque');
      });
      // También mostrar cartas de soporte como objetivos
      rivalZone.querySelectorAll('.hidden-slot').forEach((slot, i) => {
        const carta = (s.rival.bocaAbajo || [])[i];
        if (carta) {
          const heroeAtacante = s.player.heroes[modo.atacanteSlot];
          const energiaDisponible = (heroeAtacante && heroeAtacante.energiaStack && heroeAtacante.energiaStack.length) || 0;
          if (energiaDisponible >= 1) slot.classList.add('objetivo-ataque-soporte');
        }
      });
    } else if (modo.tipo === 'soporte') {
      // Paso 1: elegir carta de mano (cualquier tipo, incluyendo héroes)
      if (modo.indiceMano === undefined) {
        playerZone.querySelectorAll('.hand-slot').forEach((slot, i) => {
          const carta = s.player.mano[i];
          if (carta) slot.classList.add('seleccionable');
        });
      } else {
        // Carta de mano elegida: resaltar slot origen y casillas de soporte libres
        playerZone.querySelectorAll('.hand-slot').forEach((slot, i) => {
          const carta = s.player.mano[i];
          if (carta && i === modo.indiceMano) slot.classList.add('seleccionada');
        });
        playerZone.querySelectorAll('.hidden-slot').forEach((slot, i) => {
          if (!s.player.bocaAbajo[i]) slot.classList.add('objetivo-energia');
        });
      }
    } else if (modo.tipo === 'atacar') {
      if (modo.atacanteSlot === undefined) {
        playerZone.querySelectorAll('.hero-slot').forEach((slot, i) => {
          if (Game.puedeAtacar('player', i)) slot.classList.add('atacable');
        });
      } else {
        playerZone.querySelectorAll('.hero-slot').forEach((slot, i) => {
          if (i === modo.atacanteSlot) slot.classList.add('atacante-elegido');
        });
        rivalZone.querySelectorAll('.hero-slot').forEach((slot, i) => {
          if (s.rival.heroes[i]) slot.classList.add('objetivo');
        });
        // También mostrar cartas de soporte como objetivos
        const heroeAtacante = s.player.heroes[modo.atacanteSlot];
        const energiaDisponible = (heroeAtacante && heroeAtacante.energiaStack && heroeAtacante.energiaStack.length) || 0;
        if (energiaDisponible >= 1) {
          rivalZone.querySelectorAll('.hidden-slot').forEach((slot, i) => {
            const carta = (s.rival.bocaAbajo || [])[i];
            if (carta) slot.classList.add('objetivo-ataque-soporte');
          });
        }
      }
    }
  },

  rellenarHeroSlot(slotEl, heroe, jugador, slotIndex) {
    slotEl.innerHTML = '';
    slotEl.classList.remove('atacable', 'objetivo', 'ataque-anim', 'recibir-dano', 'vacio');
    slotEl.dataset.player = jugador;
    slotEl.dataset.slot = slotIndex;
    if (!heroe) {
      slotEl.classList.add('vacio');
      return;
    }
    const stack = heroe.energiaStack || [];
    const faceDown = heroe.faceDownStack || [];
    const costo = heroe.costoEnergia || 0;
    const stackContainer = document.createElement('div');
    stackContainer.className = 'hero-slot-stack';
    const tooltipHeroe = heroe.nombre + ' | ⚔' + (heroe.ataque || 0) + ' ❤' + (heroe.vida || 0) + '/' + (heroe.vidaMax || heroe.vida) + ' | ⚡' + (heroe.costoEnergia ?? 0) + (heroe.habilidad ? ' | ' + heroe.habilidad : '');
    stackContainer.title = tooltipHeroe + ' | Energía: ' + stack.length + '/' + costo + ' para atacar. Boca abajo: ' + faceDown.length;
    // Cartas boca abajo (?) encima del héroe
    const faceDownWrap = document.createElement('div');
    faceDownWrap.className = 'hero-facedown-stack';
    for (let i = faceDown.length - 1; i >= 0; i--) {
      const mini = document.createElement('div');
      mini.className = 'facedown-mini-card';
      mini.textContent = '?';
      faceDownWrap.appendChild(mini);
    }
    stackContainer.appendChild(faceDownWrap);
    // Mini-cartas de energía (icono pixel-art o emoji)
    const energyStackWrap = document.createElement('div');
    energyStackWrap.className = 'hero-energy-stack';
    for (let i = stack.length - 1; i >= 0; i--) {
      const miniCard = document.createElement('div');
      miniCard.className = 'energy-mini-card';
      miniCard.innerHTML = getCardIconHtml(stack[i]);
      energyStackWrap.appendChild(miniCard);
    }
    stackContainer.appendChild(energyStackWrap);
    const div = document.createElement('div');
    div.className = 'card-hero';
    if (getCardArtUrl(heroe)) div.classList.add('has-art');
    const paralizado = (heroe.paralizado || 0) > 0 || (heroe.electrocutado || 0) > 0;
    const heroIconHtml = getCardIconHtml(heroe);
    const heroArtUrl = getCardArtUrl(heroe);
    const heroArtImg = heroArtUrl ? `<img class="card-art" src="${heroArtUrl}" alt="" onerror="this.classList.add('card-art-failed')">` : '';
    div.innerHTML = `
      ${heroArtImg}
      <div class="card-text">
        ${heroIconHtml}
        <span class="nombre">${heroe.nombre}</span>
        <span class="stats">
          <span class="ataque">⚔${heroe.ataque}</span>
          <span class="vida">❤${heroe.vida}/${heroe.vidaMax || heroe.vida}</span>
        </span>
        <span class="costo-energia">⚡${heroe.costoEnergia ?? 0}</span>
        ${paralizado ? '<span class="estado">⏸</span>' : ''}
      </div>
    `;
    stackContainer.appendChild(div);
    slotEl.appendChild(stackContainer);
    // Héroes rivales son arrastrables para atacar (arrastrar enemigo sobre nuestro héroe)
    if (jugador === 'rival' && heroe && heroe.vida > 0) {
      slotEl.draggable = true;
      slotEl.title = (slotEl.title || '') + ' Arrastra sobre tu héroe para atacar.';
    } else {
      slotEl.draggable = false;
    }
  },

  rellenarHiddenSlot(slotEl, carta, oculto = false) {
    slotEl.innerHTML = '';
    slotEl.classList.remove('soporte-face-up');
    if (!carta) return;
    // Las 3 cartas de soporte siempre boca arriba (visibles para ambos jugadores)
    slotEl.classList.add('soporte-face-up');
    const iconHtmlSoporte = getCardIconHtml(carta);
    const div = document.createElement('div');
    div.className = 'card-mini card-soporte';
    if (getCardArtUrl(carta)) div.classList.add('has-art');
    const tooltipBocaAbajo = oculto ? 'Carta oculta' : (carta.tipo === 'heroe' ? (carta.nombre + ' | ⚔' + (carta.ataque || 0) + ' ❤' + (carta.vidaMax || carta.vida) + (carta.habilidad ? ' | ' + carta.habilidad : '')) : carta.tipo === 'trampa' ? ((carta.nombre || carta.id) + (carta.efecto ? ' | ' + carta.efecto : '')) : (carta.nombre || 'Energía'));
    div.title = tooltipBocaAbajo;
    const soporteArtUrl = getCardArtUrl(carta);
    const soporteArtImg = soporteArtUrl ? `<img class="card-art" src="${soporteArtUrl}" alt="" onerror="this.classList.add('card-art-failed')">` : '';
    div.innerHTML = `
      ${soporteArtImg}
      <div class="card-text">
        ${iconHtmlSoporte}
        <span class="nombre">${carta.nombre || 'Energía'}</span>
        <span class="tipo">${carta.tipo === 'heroe' ? 'Héroe' : carta.tipo === 'trampa' ? 'Trampa' : 'Energía'}</span>
        ${carta.tipo === 'heroe' ? `<span class="stats">⚔${carta.ataque} ❤${carta.vidaMax || carta.vida}</span><span class="costo-energia">⚡${carta.costoEnergia ?? 0}</span>` : ''}
      </div>
    `;
    slotEl.appendChild(div);
  },

  rellenarHandSlot(slotEl, carta, index) {
    slotEl.innerHTML = '';
    slotEl.dataset.index = index;
    slotEl.draggable = false;
    if (!carta) return;
    const iconHtmlMano = getCardIconHtml(carta);
    const div = document.createElement('div');
    div.className = 'card-mini';
    if (getCardArtUrl(carta)) div.classList.add('has-art');
    const tooltipMano = carta.tipo === 'heroe' ? (carta.nombre + ' | Ataque ' + (carta.ataque || 0) + ' Vida ' + (carta.vidaMax || carta.vida) + ' | Costo ' + (carta.costoEnergia ?? 0) + (carta.habilidad ? ' | ' + carta.habilidad : '')) : carta.tipo === 'trampa' ? ((carta.nombre || carta.id) + (carta.efecto || carta.efectoId ? ' | ' + (carta.efecto || carta.efectoId) : '')) : (carta.nombre || 'Energía');
    div.title = tooltipMano;
    const tipoLabel = carta.tipo === 'heroe' ? 'Héroe' : carta.tipo === 'trampa' ? 'Trampa' : 'Energía';
    const manoArtUrl = getCardArtUrl(carta);
    const manoArtImg = manoArtUrl ? `<img class="card-art" src="${manoArtUrl}" alt="" onerror="this.classList.add('card-art-failed')">` : '';
    div.innerHTML = `
      ${manoArtImg}
      <div class="card-text">
        ${iconHtmlMano}
        <span class="nombre">${carta.nombre || 'Energía'}</span>
        <span class="tipo">${tipoLabel}</span>
        ${carta.tipo === 'heroe' ? `<span class="stats">⚔${carta.ataque} ❤${carta.vidaMax || carta.vida}</span><span class="costo-energia">⚡${carta.costoEnergia ?? 0}</span>` : ''}
      </div>
    `;
    slotEl.appendChild(div);
    /* Todas las cartas son arrastrables: energía a héroes, cualquier carta a soporte */
    if (carta) slotEl.draggable = true;
  },

  rellenarHandSlotRival(slotEl, carta, index) {
    slotEl.innerHTML = '';
    slotEl.dataset.index = index;
    slotEl.draggable = false;
    if (!carta) return;
    // Carta boca abajo: mostrar dorso con estilo premium
    const div = document.createElement('div');
    div.className = 'card-mini card-back';
    div.title = 'Carta oculta';
    // Patrón de dorso mitológico (SVG inline)
    div.innerHTML = `
      <div class="card-back-pattern"></div>
      <div class="card-back-content">
        <span class="card-back-icon">🛡️</span>
      </div>
    `;
    slotEl.appendChild(div);
  },

  actualizarBotonesAccion() {
    const s = Game.estado;
    const turno = s.turnoActual;
    const esHumano = s.modo === 'local' || turno === 'player';
    const j = turno === 'player' ? s.player : s.rival;
    const acciones = s.accionesRestantes;
    const modo = this.estadoModoInteractivo;
    const algunHeroeConEspacio = (j.heroes || []).some(h => h && h.vida > 0 && (h.energiaStack ? h.energiaStack.length < (typeof Game !== 'undefined' && Game.maxEnergiaHeroe ? Game.maxEnergiaHeroe(h) : 3) : true));
    const algunHeroeConEspacioBocaAbajo = (j.heroes || []).some(h => h && h.vida > 0 && (h.faceDownStack ? h.faceDownStack.length < 3 : true));
    const tieneBocaAbajo = (j.bocaAbajo || []).some(c => c != null);
    const tieneEspacioSoporte = (j.bocaAbajo || []).some(c => !c);
    const tiposSlot = (typeof Game !== 'undefined' && Game.TIPO_SLOT_SOPORTE) ? Game.TIPO_SLOT_SOPORTE : ['energia', 'heroe', 'trampa'];
    const tieneCartaParaSoporte = (j.bocaAbajo || []).some((slotCard, idx) => !slotCard && j.mano.some(c => c && c.tipo === tiposSlot[idx]));
    const tieneEnergia = j.mano.some(c => c.tipo === 'energia') || (j.bocaAbajo || []).some(c => c && c.tipo === 'energia');
    const puedePonerEnergia = esHumano && acciones > 0 && tieneEnergia && algunHeroeConEspacio;
    const puedePonerSoporte = esHumano && acciones > 0 && tieneEspacioSoporte && tieneCartaParaSoporte;
    const puedePonerBocaAbajo = esHumano && acciones > 0 && tieneBocaAbajo && algunHeroeConEspacioBocaAbajo;
    const puedeAtacar = esHumano && acciones > 0 && j.heroes.some((h, i) => Game.puedeAtacar(turno, i));
    document.getElementById('btn-poner-energia').disabled = !puedePonerEnergia;
    const btnSoporte = document.getElementById('btn-poner-soporte');
    if (btnSoporte) btnSoporte.disabled = !puedePonerSoporte;
    const btnBocaAbajo = document.getElementById('btn-poner-boca-abajo');
    if (btnBocaAbajo) btnBocaAbajo.disabled = !puedePonerBocaAbajo;
    document.getElementById('btn-atacar').disabled = !puedeAtacar;
    document.getElementById('btn-usar-efecto').disabled = !esHumano || acciones < 1;
    document.getElementById('btn-pasar').disabled = !esHumano;
    document.getElementById('btn-end-turn').classList.toggle('hidden', !esHumano);
    const btnSugerir = document.getElementById('btn-sugerir');
    if (btnSugerir) btnSugerir.disabled = !esHumano || (s.dificultad !== 'facil' && s.dificultad !== 'intermedio');
    const btnCancelar = document.getElementById('btn-cancelar-accion');
    if (btnCancelar) btnCancelar.classList.toggle('hidden', !modo);
  },

  mostrarModalSeleccion(titulo, opciones, callback) {
    const modal = document.getElementById('selection-modal');
    const titleEl = document.getElementById('selection-title');
    const optionsEl = document.getElementById('selection-options');
    titleEl.textContent = titulo;
    optionsEl.innerHTML = '';
    opciones.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'card-option';
      const text = typeof opt === 'object' ? (opt.nombre || opt.text || JSON.stringify(opt)) : opt;
      if (typeof opt === 'object' && opt.iconUrl) {
        btn.innerHTML = `<img src="${opt.iconUrl}" class="card-icon pixel-art selection-btn-icon" alt="" onerror="this.style.display='none'"> <span>${text}</span>`;
      } else {
        const emojiOpt = (typeof opt === 'object' && opt.emoji) ? opt.emoji + ' ' : '';
        btn.textContent = emojiOpt + text;
      }
      btn.addEventListener('click', () => {
        modal.classList.add('hidden');
        if (callback) callback(typeof opt === 'object' ? opt : i);
      });
      optionsEl.appendChild(btn);
    });
    modal.classList.remove('hidden');
    document.getElementById('selection-cancel').onclick = () => {
      modal.classList.add('hidden');
      if (callback) callback(null);
    };
  },

  pedirQuemarCartaRival(oponente, callback) {
    const s = Game.estado;
    const mano = s[oponente || 'rival'].mano;
    if (mano.length === 0) { callback(null); return; }
    const opciones = mano.map((c, i) => ({ index: i, nombre: c.nombre || c.tipo, tipo: c.tipo, emoji: getEmojiCarta(c), iconUrl: getCardIconUrl(c) }));
    this.mostrarModalSeleccion('Lucifer: elige una carta del oponente para quemar', opciones, (opt) => {
      if (opt && opt.index != null) callback(opt.index);
      else callback(null);
    });
  },

  pedirObjetivoAtaque(actor, callback) {
    const s = Game.estado;
    const oponente = actor === 'player' ? 'rival' : 'player';
    const objetivos = [];
    s[oponente].heroes.forEach((h, i) => { if (h) objetivos.push({ slot: i, nombre: h.nombre, emoji: getEmojiCarta(h), iconUrl: getCardIconUrl(h) }); });
    if (objetivos.length === 0) { callback(null); return; }
    this.mostrarModalSeleccion('Elige a qué héroe atacar', objetivos, (opt) => {
      if (opt && opt.slot != null) callback(opt.slot);
      else callback(null);
    });
  },

  pedirHeroeAtacante(actor, callback) {
    const s = Game.estado;
    const atacantes = [];
    s[actor].heroes.forEach((h, i) => {
      if (h && Game.puedeAtacar(actor, i)) atacantes.push({ slot: i, nombre: h.nombre, emoji: getEmojiCarta(h), iconUrl: getCardIconUrl(h) });
    });
    if (atacantes.length === 0) { callback(null); return; }
    this.mostrarModalSeleccion('Elige con qué héroe atacar', atacantes, (opt) => {
      if (opt && opt.slot != null) callback(opt.slot);
      else callback(null);
    });
  },

  mostrarGameOver(ganador, rendido = false) {
    const modal = document.getElementById('gameover-modal');
    const title = document.getElementById('gameover-title');
    const msg = document.getElementById('gameover-message');
    title.classList.remove('victoria', 'derrota');
    if (ganador === 'player') {
      title.textContent = '¡Victoria!';
      title.classList.add('victoria');
      msg.textContent = 'El rival se ha quedado sin héroes en el mazo.';
    } else {
      title.textContent = rendido ? 'Rendición' : 'Derrota';
      title.classList.add('derrota');
      msg.textContent = rendido ? 'Te has rendido. El rival gana la partida.' : 'Te has quedado sin héroes en el mazo.';
    }
    modal.classList.remove('hidden');
  },

  animarAtaque(atacanteSlotEl, defensorSlotEl, cb, dano = 0) {
    if (typeof window.vibrarSiPermitido === 'function') window.vibrarSiPermitido(50);
    const invocarCb = () => { try { if (cb) cb(); } catch (e) { if (typeof console !== 'undefined') console.error('animarAtaque callback', e); } };
    if (typeof window.animationsEnabled === 'boolean' && !window.animationsEnabled) {
      invocarCb();
      return;
    }
    if (typeof Animations !== 'undefined' && Animations.attackLunge) {
      try {
        Animations.attackLunge(atacanteSlotEl, defensorSlotEl, () => {
          try {
            if (defensorSlotEl && dano > 0) {
              const rect = defensorSlotEl.getBoundingClientRect();
              const centerX = rect.left + rect.width / 2;
              const centerY = rect.top + rect.height / 2;
              Animations.showFloatingNumber(centerX, centerY - 20, dano, dano >= 5 ? 'critical' : 'damage');
              if (typeof ParticleSystem !== 'undefined') ParticleSystem.damageEffect(centerX, centerY, dano);
            }
          } catch (e) { /* no bloquear callback */ }
          invocarCb();
        });
      } catch (e) {
        if (typeof console !== 'undefined') console.error('animarAtaque attackLunge', e);
        invocarCb();
      }
    } else {
      if (atacanteSlotEl) atacanteSlotEl.classList.add('ataque-anim');
      if (defensorSlotEl) defensorSlotEl.classList.add('recibir-dano');
      setTimeout(() => {
        if (atacanteSlotEl) atacanteSlotEl.classList.remove('ataque-anim');
        if (defensorSlotEl) defensorSlotEl.classList.remove('recibir-dano');
        invocarCb();
      }, 650);
    }
  },

  animarCuracion(heroSlotEl, cb, cantidad = 2) {
    if (!heroSlotEl) { if (cb) cb(); return; }
    
    const rect = heroSlotEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Efectos de partículas premium
    if (typeof ParticleSystem !== 'undefined') {
      ParticleSystem.healEffect(centerX, centerY, cantidad);
    }
    
    // Número flotante de curación
    if (typeof Animations !== 'undefined') {
      Animations.showFloatingNumber(centerX, centerY - 20, cantidad, 'heal');
    }
    
    // Animación CSS
    heroSlotEl.classList.remove('efecto-curacion');
    heroSlotEl.offsetHeight;
    heroSlotEl.classList.add('efecto-curacion');
    
    setTimeout(() => {
      heroSlotEl.classList.remove('efecto-curacion');
      if (cb) cb();
    }, 720);
  },

  animarTrampa(slotEl, cb) {
    if (!slotEl) { if (cb) cb(); return; }
    
    const rect = slotEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Efectos de partículas premium
    if (typeof ParticleSystem !== 'undefined') {
      ParticleSystem.trapActivated(centerX, centerY);
    }
    
    // Screen shake suave
    if (typeof Animations !== 'undefined') {
      Animations.lightScreenShake();
    }
    
    // Animación CSS
    slotEl.classList.remove('efecto-trampa');
    slotEl.offsetHeight;
    slotEl.classList.add('efecto-trampa');
    
    setTimeout(() => {
      slotEl.classList.remove('efecto-trampa');
      if (cb) cb();
    }, 620);
  },

  animarEnergiaPuesta(heroSlotEl) {
    if (!heroSlotEl) return;
    
    const rect = heroSlotEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Efectos de partículas premium
    if (typeof ParticleSystem !== 'undefined') {
      ParticleSystem.energyPlaced(centerX, centerY);
    }
    
    // Número flotante
    if (typeof Animations !== 'undefined') {
      Animations.showFloatingNumber(centerX, centerY - 30, 1, 'energy');
    }
    
    heroSlotEl.classList.add('energy-added');
    setTimeout(() => heroSlotEl.classList.remove('energy-added'), 550);
  },

  mostrarMensajeHeroeAsesinado(tipo, slotEl = null) {
    if (typeof window.vibrarSiPermitido === 'function') window.vibrarSiPermitido([40, 60, 40]);
    const el = document.getElementById('hero-kill-message');
    const textEl = document.getElementById('hero-kill-text');
    if (!el || !textEl) return;
    if (typeof window.animationsEnabled === 'boolean' && !window.animationsEnabled) {
      el.classList.remove('hero-kill-aliado', 'hero-kill-enemigo');
      const text = document.getElementById('hero-kill-text');
      if (text) text.textContent = tipo === 'aliado' ? 'Aliado Asesinado' : 'Enemigo Eliminado';
      el.classList.add(tipo === 'aliado' ? 'hero-kill-aliado' : 'hero-kill-enemigo');
      el.classList.remove('hidden');
      setTimeout(() => el.classList.add('hidden'), 1500);
      return;
    }
    // Screen shake fuerte
    if (typeof Animations !== 'undefined') {
      Animations.heavyScreenShake();
    }
    
    // Partículas de muerte
    if (slotEl && typeof ParticleSystem !== 'undefined') {
      const rect = slotEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      ParticleSystem.heroDefeated(centerX, centerY, tipo === 'enemigo');
    }
    
    // Animación de muerte del elemento
    if (slotEl && typeof Animations !== 'undefined') {
      Animations.heroDeath(slotEl, tipo === 'enemigo');
    }
    
    el.classList.remove('hero-kill-aliado', 'hero-kill-enemigo');
    if (tipo === 'aliado') {
      textEl.textContent = 'Aliado Asesinado';
      el.classList.add('hero-kill-aliado');
    } else {
      textEl.textContent = 'Enemigo Eliminado';
      el.classList.add('hero-kill-enemigo');
    }
    el.classList.remove('hidden');
    clearTimeout(this._heroKillTimeout);
    this._heroKillTimeout = setTimeout(() => {
      el.classList.add('hidden');
    }, 2500);
  },

  // Mostrar indicador de turno con efectos premium
  mostrarIndicadorTurno(esJugador) {
    if (typeof Animations !== 'undefined') {
      Animations.turnStart(esJugador);
    }
  },

  // Animar victoria con efectos premium
  animarVictoria(cb) {
    if (typeof window.vibrarSiPermitido === 'function') window.vibrarSiPermitido([100, 50, 100]);
    if (typeof window.animationsEnabled === 'boolean' && !window.animationsEnabled) {
      if (typeof ParticleSystem !== 'undefined' && ParticleSystem.enabled !== false) ParticleSystem.victoryBurst(window.innerWidth / 2, window.innerHeight / 2);
      if (cb) cb();
      return;
    }
    if (typeof Animations !== 'undefined') {
      Animations.victoryAnimation(cb);
    } else if (cb) {
      cb();
    }
    if (typeof ParticleSystem !== 'undefined' && ParticleSystem.enabled !== false) {
      ParticleSystem.victoryBurst(window.innerWidth / 2, window.innerHeight / 2);
    }
  },

  // Animar derrota con efectos premium
  animarDerrota(cb) {
    if (typeof window.vibrarSiPermitido === 'function') window.vibrarSiPermitido([150, 80, 150]);
    if (typeof window.animationsEnabled === 'boolean' && !window.animationsEnabled) {
      if (cb) cb();
      return;
    }
    if (typeof Animations !== 'undefined') {
      Animations.defeatAnimation(cb);
    } else if (cb) {
      cb();
    }
  },

  // Animar habilidad especial
  animarHabilidadEspecial(slotEl, habilidadId) {
    if (!slotEl) return;
    
    const rect = slotEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    if (typeof ParticleSystem !== 'undefined') {
      ParticleSystem.abilityEffect(centerX, centerY, habilidadId);
    }
    
    if (typeof Animations !== 'undefined') {
      Animations.dramaticZoom(slotEl);
    }
  },

  // Iniciar partículas de ambiente
  iniciarEfectosAmbiente() {
    if (typeof ParticleSystem !== 'undefined') {
      ParticleSystem.startAmbientParticles();
    }
  },

  // Detener partículas de ambiente
  detenerEfectosAmbiente() {
    if (typeof ParticleSystem !== 'undefined') {
      ParticleSystem.stopAmbientParticles();
    }
  }
};
