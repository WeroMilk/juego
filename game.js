/**
 * Dioses en Guerra - Lógica del juego
 * Objeto Game: estado, turnos, validaciones y resolución de efectos.
 */

const MAX_MANO = 7;
/** Tras este número de turnos, si no hay ganador, se desempata por vida total en mesa (para que la partida siempre pueda terminar). */
const MAX_TURNOS_PARTIDA = 200;

/** Máxima energía que puede tener un héroe: la que necesita para atacar (no más). */
function maxEnergiaHeroe(heroe) {
  return Math.max(1, heroe.costoEnergia || 0);
}

/** Tipo de carta permitido en cada slot de soporte: 0 = energía, 1 = héroe, 2 = trampa. */
const TIPO_SLOT_SOPORTE = ['energia', 'heroe', 'trampa'];

const Game = {
  estado: null,

  /**
   * Inicia una nueva partida.
   * modo: 'ia' | 'local' | 'campania' | 'torneo' | 'survival' | 'desafio' | 'online'
   * dificultad: 'facil' | 'intermedio' | 'dificil' | 'jarcor' (solo si modo === 'ia' o similar)
   * opciones: { idMazo?, nivelCampania?, rondaTorneo?, olaSurvival?, reglasDesafio?, desafioId? }
   */
  iniciar(modo, dificultad = 'facil', opciones) {
    const mazo = (typeof construirMazoConId !== 'undefined' && opciones && opciones.idMazo != null)
      ? construirMazoConId(opciones.idMazo)
      : construirMazo();
    const manoInicial = [];
    for (let i = 0; i < 8; i++) {
      if (mazo.length > 0) manoInicial.push(mazo.shift());
    }

    opciones = opciones || {};
    this.estado = {
      modo,
      dificultad,
      mazo,
      descarte: [],
      turnoActual: 'player', // 'player' | 'rival'
      fase: 'setup', // 'setup' | 'acciones' | 'robar' | 'fin_turno'
      accionesRestantes: 2,
      turnoPerdido: { player: 0, rival: 0 }, // turnos que debe saltar (Medusa, Thor)
      ganador: null,
      nivelCampania: opciones.nivelCampania,
      olaSurvival: opciones.olaSurvival,
      reglasDesafio: opciones.reglasDesafio || null,
      desafioId: opciones.desafioId || null,
      resumenTurno: { danoHecho: 0, danoRecibido: 0, curacion: 0 },

      player: {
        heroes: [null, null],       // 2 slots boca arriba
        bocaAbajo: [null, null, null],
        mano: [],
        energiaPorHeroe: [0, 0],    // energía asignada a cada slot de héroe
        trampasActivadas: []       // ids de trampas ya usadas este turno/ataque
      },
      rival: {
        heroes: [null, null],
        bocaAbajo: [null, null, null],
        mano: [],
        energiaPorHeroe: [0, 0],
        trampasActivadas: []
      },

      // Para setup: lo que cada jugador eligió de su mano inicial (8 cartas)
      setupPlayer: { heroes: [], bocaAbajo: [], mano: [], manoInicial: [] },
      setupRival: { heroes: [], bocaAbajo: [], mano: [], manoInicial: [] }
    };

    const vsIA = modo === 'ia' || modo === 'campania' || modo === 'torneo' || modo === 'survival' || modo === 'desafio';
    if (vsIA) {
      this.estado.setupRival.manoInicial = [...manoInicial];
      this.estado.setupPlayer.manoInicial = [];
      // Repartir 8 al jugador desde el mazo (el mazo ya tiene 8 menos)
      for (let i = 0; i < 8; i++) {
        if (this.estado.mazo.length > 0)
          this.estado.setupPlayer.manoInicial.push(this.estado.mazo.shift());
      }
    } else {
      // Local: repartir 8 a cada uno
      this.estado.setupPlayer.manoInicial = manoInicial.slice(0, 8);
      this.estado.setupRival.manoInicial = [];
      for (let i = 0; i < 8; i++) {
        if (this.estado.mazo.length > 0)
          this.estado.setupRival.manoInicial.push(this.estado.mazo.shift());
      }
    }
    return this.estado;
  },

  /**
   * Aplica la configuración elegida por el jugador (2 héroes, 3 boca abajo, 3 mano).
   */
  aplicarSetupJugador(heroes, bocaAbajo, mano) {
    const s = this.estado;
    if (s.fase !== 'setup') return false;
    s.setupPlayer.heroes = heroes;
    s.setupPlayer.bocaAbajo = bocaAbajo;
    s.setupPlayer.mano = mano;
    return true;
  },

  /**
   * La IA (o segundo jugador en local) aplica su setup.
   */
  aplicarSetupRival(heroes, bocaAbajo, mano) {
    const s = this.estado;
    s.setupRival.heroes = heroes;
    s.setupRival.bocaAbajo = bocaAbajo;
    s.setupRival.mano = mano;
    return true;
  },

  /**
   * Finaliza el setup y coloca las cartas en el campo. Luego activa habilidades de entrada (Medusa).
   */
  finalizarSetup() {
    const s = this.estado;
    if (s.fase !== 'setup') return false;

    const normalizarHeroe = (h) => {
      if (!h) return null;
      const x = { ...h };
      x.vida = x.vidaMax ?? x.vida ?? 1;
      x.paralizado = x.paralizado ?? 0;
      x.electrocutado = x.electrocutado ?? 0;
      x.usadoHabilidad = x.usadoHabilidad ?? false;
      x.fenixUsado = x.fenixUsado ?? false;
      x.energiaStack = x.energiaStack ?? [];
      x.faceDownStack = x.faceDownStack ?? [];
      x._vidaMaxOriginal = x.vidaMax ?? x.vida ?? 1;
      x.defensaExtra = 0;
      return x;
    };
    s.player.heroes = s.setupPlayer.heroes.map(normalizarHeroe);
    s.player.bocaAbajo = s.setupPlayer.bocaAbajo.map(c => c ? { ...c } : null);
    s.player.mano = s.setupPlayer.mano.map(c => c ? { ...c } : null);

    s.rival.heroes = s.setupRival.heroes.map(normalizarHeroe);
    s.rival.bocaAbajo = s.setupRival.bocaAbajo.map(c => c ? { ...c } : null);
    s.rival.mano = s.setupRival.mano.map(c => c ? { ...c } : null);

    s.fase = 'acciones';
    s.turnoActual = 'player';
    const rd = s.reglasDesafio || {};
    s.accionesRestantes = (rd.accionesPorTurno != null) ? rd.accionesPorTurno : 2;
    s.numeroTurno = 1;

    // Activar habilidades "al entrar en juego" (ej. Medusa)
    s.player.heroes.forEach(h => { if (h && h.habilidadId === 'medusa_entrada') s.turnoPerdido.rival += 1; });
    s.rival.heroes.forEach(h => { if (h && h.habilidadId === 'medusa_entrada') s.turnoPerdido.player += 1; });

    // Aplicar efectos de soporte iniciales
    this.aplicarEfectosSoporte('player');
    this.aplicarEfectosSoporte('rival');

    return true;
  },

  /**
   * Roba cartas del mazo hasta llenar mano (máx MAX_MANO), o hasta que el mazo se acabe.
   */
  robarHastaMano(jugador) {
    const j = jugador === 'player' ? this.estado.player : this.estado.rival;
    while (j.mano.length < MAX_MANO && this.estado.mazo.length > 0) {
      j.mano.push(this.estado.mazo.shift());
    }
  },

  /**
   * Roba exactamente 1 carta al inicio del turno (si hay mazo y mano no está llena).
   */
  robarUnaAlInicioTurno(jugador) {
    const s = this.estado;
    const j = jugador === 'player' ? s.player : s.rival;
    if (j.mano.length < MAX_MANO && s.mazo.length > 0) {
      j.mano.push(s.mazo.shift());
    }
  },

  /**
   * Reemplaza un héroe destruido: busca en mano un héroe, si no hay roba hasta encontrar uno.
   * Si no quedan héroes en el mazo, el jugador pierde (ganador = oponente).
   */
  reemplazarHeroeDestruido(jugador, slotIndex) {
    const s = this.estado;
    const j = jugador === 'player' ? s.player : s.rival;
    const oponente = jugador === 'player' ? 'rival' : 'player';

    const esHeroe = (c) => c && (c.tipo === 'heroe' || (c.ataque != null && (c.vidaMax != null || c.vida != null)));
    const idxMano = (j.mano && j.mano.length) ? j.mano.findIndex(esHeroe) : -1;
    if (idxMano >= 0) {
      const heroe = j.mano.splice(idxMano, 1)[0];
      const vidaMax = heroe.vidaMax || heroe.vida || 1;
      j.heroes[slotIndex] = { ...heroe, vida: vidaMax, vidaMax: vidaMax, _vidaMaxOriginal: vidaMax, paralizado: 0, electrocutado: 0, usadoHabilidad: false, fenixUsado: false, energiaStack: [], faceDownStack: [], defensaExtra: 0 };
      this.aplicarEfectosSoporte(jugador);
      return { ok: true, nuevoHeroe: j.heroes[slotIndex] };
    }

    // Robar hasta encontrar héroe
    while (s.mazo.length > 0) {
      const robada = s.mazo.shift();
      if (robada && (robada.tipo === 'heroe' || (robada.ataque != null && (robada.vidaMax != null || robada.vida != null)))) {
        const vidaMax = robada.vidaMax || robada.vida || 1;
        j.heroes[slotIndex] = { ...robada, vida: vidaMax, vidaMax: vidaMax, _vidaMaxOriginal: vidaMax, paralizado: 0, electrocutado: 0, usadoHabilidad: false, fenixUsado: false, energiaStack: [], faceDownStack: [], defensaExtra: 0 };
        // Re-aplicar efectos de soporte después de reemplazar héroe
        this.aplicarEfectosSoporte(jugador);
        return { ok: true, nuevoHeroe: j.heroes[slotIndex] };
      }
      if (j.mano.length < MAX_MANO) j.mano.push(robada);
      else s.descarte.push(robada);
    }

    // No hay más héroes en el mazo: este jugador pierde
    s.ganador = oponente;
    return { ok: false, sinHeroes: true };
  },

  /**
   * Pone una carta de energía desde la mano encima del héroe indicado (stack sobre la carta del héroe).
   * Máximo 3 energías por héroe.
   */
  ponerEnergia(jugador, indiceMano, heroeSlot) {
    const s = this.estado;
    if (s.fase !== 'acciones' || s.accionesRestantes < 1) return { ok: false, msg: 'Sin acciones' };
    const j = jugador === 'player' ? s.player : s.rival;
    const carta = j.mano[indiceMano];
    if (!carta || carta.tipo !== 'energia') return { ok: false, msg: 'No es energía' };
    const heroe = j.heroes[heroeSlot];
    if (!heroe || heroe.vida <= 0) return { ok: false, msg: 'Héroe inválido' };
    if (!heroe.energiaStack) heroe.energiaStack = [];
    const maxE = maxEnergiaHeroe(heroe);
    if (heroe.energiaStack.length >= maxE) return { ok: false, msg: 'Este héroe ya tiene la energía máxima para atacar' };

    j.mano.splice(indiceMano, 1);
    heroe.energiaStack.push(carta);
    s.accionesRestantes--;
    return { ok: true };
  },

  /**
   * Pone una carta desde la zona "boca abajo" (una de las 3) encima de un héroe, boca abajo.
   * El enemigo puede atacar esa carta: energía va al mazo, trampa se activa, bonus vida cura al héroe.
   */
  ponerBocaAbajoEnHeroe(jugador, indiceBocaAbajo, heroeSlot) {
    const s = this.estado;
    if (s.fase !== 'acciones' || s.accionesRestantes < 1) return { ok: false, msg: 'Sin acciones' };
    const j = jugador === 'player' ? s.player : s.rival;
    const carta = j.bocaAbajo[indiceBocaAbajo];
    if (!carta) return { ok: false, msg: 'No hay carta en ese slot' };
    const heroe = j.heroes[heroeSlot];
    if (!heroe || heroe.vida <= 0) return { ok: false, msg: 'Héroe inválido' };
    if (!heroe.faceDownStack) heroe.faceDownStack = [];
    if (heroe.faceDownStack.length >= 3) return { ok: false, msg: 'Este héroe ya tiene 3 cartas boca abajo' };

    j.bocaAbajo[indiceBocaAbajo] = null;
    heroe.faceDownStack.push(carta);
    s.accionesRestantes--;
    return { ok: true };
  },

  /**
   * Pone una carta de energía desde la zona de soporte (3 cartas boca arriba) sobre un héroe.
   */
  ponerEnergiaDesdeSoporte(jugador, indiceSoporte, heroeSlot) {
    const s = this.estado;
    if (s.fase !== 'acciones' || s.accionesRestantes < 1) return { ok: false, msg: 'Sin acciones' };
    const j = jugador === 'player' ? s.player : s.rival;
    const carta = j.bocaAbajo[indiceSoporte];
    if (!carta || carta.tipo !== 'energia') return { ok: false, msg: 'No es energía' };
    const heroe = j.heroes[heroeSlot];
    if (!heroe || heroe.vida <= 0) return { ok: false, msg: 'Héroe inválido' };
    if (!heroe.energiaStack) heroe.energiaStack = [];
    const maxE = maxEnergiaHeroe(heroe);
    if (heroe.energiaStack.length >= maxE) return { ok: false, msg: 'Este héroe ya tiene la energía máxima para atacar' };

    j.bocaAbajo[indiceSoporte] = null;
    heroe.energiaStack.push(carta);
    s.accionesRestantes--;
    return { ok: true };
  },

  /**
   * Pone una carta de la mano en una casilla de soporte (bocaAbajo[0..2]).
   * Slot 0 = solo energía, Slot 1 = solo héroe, Slot 2 = solo trampa (robo, curación, etc.).
   * Cuesta 1 acción. Las cartas de soporte afectan a los 2 héroes.
   */
  ponerEnSoporteDesdeManoV2(jugador, indiceMano, slotSoporte) {
    const s = this.estado;
    if (s.fase !== 'acciones' || s.accionesRestantes < 1) return { ok: false, msg: 'Sin acciones' };
    const j = jugador === 'player' ? s.player : s.rival;
    const carta = (j.mano || [])[indiceMano];
    if (!carta) return { ok: false, msg: 'Carta inválida' };
    if (!j.bocaAbajo || slotSoporte < 0 || slotSoporte >= j.bocaAbajo.length) return { ok: false, msg: 'Slot inválido' };
    const tipoRequerido = TIPO_SLOT_SOPORTE[slotSoporte];
    if (carta.tipo !== tipoRequerido) return { ok: false, msg: `En ese slot solo se puede poner una carta de ${tipoRequerido === 'heroe' ? 'héroe' : tipoRequerido === 'trampa' ? 'soporte (trampa)' : 'energía'}` };
    if (j.bocaAbajo[slotSoporte]) return { ok: false, msg: 'Ese espacio de soporte ya está ocupado' };

    j.mano[indiceMano] = null;
    j.bocaAbajo[slotSoporte] = carta;
    s.accionesRestantes--;
    this.aplicarEfectosSoporte(jugador);
    return { ok: true };
  },

  /** Pone una carta en soporte; delega en validación por tipo de slot (0=energía, 1=héroe, 2=trampa). */
  ponerEnSoporteDesdeMano(jugador, indiceMano, slotSoporte) {
    return this.ponerEnSoporteDesdeManoV2(jugador, indiceMano, slotSoporte);
  },

  /**
   * Aplica los efectos de las cartas de soporte a los 2 héroes.
   * - Slot energía: da 1 energía virtual por héroe (máx = costoEnergia del héroe).
   * - Slot héroe: suma vida, defensa y ataque a los 2 héroes.
   * - Slot trampa curación: cura sin superar vida máxima; robo: se activa al usar.
   */
  aplicarEfectosSoporte(jugador) {
    const s = this.estado;
    const j = jugador === 'player' ? s.player : s.rival;
    const bocaAbajo = j.bocaAbajo || [];
    
    // Resetear efectos de soporte antes de recalcular
    j.heroes.forEach((heroe) => {
      if (!heroe) return;
      if (heroe.energiaStack) {
        heroe.energiaStack = heroe.energiaStack.filter(e => !e.virtual || e.soporteIndex === undefined);
      }
      if (heroe._vidaMaxOriginal === undefined) {
        heroe._vidaMaxOriginal = heroe.vidaMax || heroe.vida;
      }
      heroe.vidaMax = heroe._vidaMaxOriginal;
      heroe.defensaExtra = 0;
      heroe.ataqueExtra = 0;
    });
    
    j.heroes.forEach((heroe) => {
      if (!heroe || heroe.vida <= 0) return;
      
      bocaAbajo.forEach((cartaSoporte, soporteIndex) => {
        if (!cartaSoporte) return;
        
        if (cartaSoporte.tipo === 'energia') {
          if (!heroe.energiaStack) heroe.energiaStack = [];
          const maxE = maxEnergiaHeroe(heroe);
          const energiaReal = heroe.energiaStack.filter(e => !e.virtual || e.soporteIndex === undefined).length;
          if (energiaReal < maxE) {
            const yaTieneEsta = heroe.energiaStack.some(e => e.virtual && e.soporteIndex === soporteIndex);
            if (!yaTieneEsta) {
              heroe.energiaStack.push({ id: 'energia_soporte_' + soporteIndex, tipo: 'energia', virtual: true, soporteIndex });
            }
          }
        } else if (cartaSoporte.tipo === 'heroe') {
          const vidaExtra = cartaSoporte.vidaMax || cartaSoporte.vida || 0;
          const defensaExtra = cartaSoporte.ataque || 0;
          const ataqueExtra = cartaSoporte.ataque || 0;
          const vidaMaxBase = heroe._vidaMaxOriginal || heroe.vidaMax || heroe.vida;
          heroe.vidaMax = vidaMaxBase + vidaExtra;
          heroe.vida = Math.min(heroe.vida, heroe.vidaMax);
          heroe.defensaExtra = (heroe.defensaExtra || 0) + defensaExtra;
          heroe.ataqueExtra = (heroe.ataqueExtra || 0) + ataqueExtra;
        } else if (cartaSoporte.tipo === 'trampa' && (cartaSoporte.efectoId === 'curacion' || cartaSoporte.id === 'curacion')) {
          if (!cartaSoporte._curacionUsada) {
            const curacion = 2;
            const vidaMax = heroe.vidaMax || heroe.vida;
            heroe.vida = Math.min(vidaMax, heroe.vida + curacion);
            cartaSoporte._curacionUsada = true;
          }
        }
      });
    });
    
    bocaAbajo.forEach((carta, index) => {
      if (carta && carta._curacionUsada) {
        s.descarte.push(carta);
        j.bocaAbajo[index] = null;
      }
    });
  },

  /**
   * Comprueba si un héroe puede atacar: tiene suficientes energías apiladas encima (>= costoEnergia).
   * También puede atacar cartas de soporte con 1 energía.
   */
  puedeAtacar(jugador, heroeSlot) {
    const j = jugador === 'player' ? this.estado.player : this.estado.rival;
    const heroe = j.heroes[heroeSlot];
    if (!heroe || heroe.vida <= 0) return false;
    if (heroe.paralizado > 0 || heroe.electrocutado > 0) return false;
    const n = (heroe.energiaStack && heroe.energiaStack.length) || 0;
    return n >= (heroe.costoEnergia || 0) || n >= 1; // Puede atacar con 1 energía (para soporte)
  },

  /**
   * Ataca una carta de soporte del rival. Cuesta 1 energía.
   */
  atacarSoporte(atacanteJugador, atacanteSlot, slotSoporte) {
    const s = this.estado;
    if (s.fase !== 'acciones' || s.accionesRestantes < 1) return { ok: false, msg: 'Sin acciones' };
    const atacante = atacanteJugador === 'player' ? s.player : s.rival;
    const defensorJugador = atacanteJugador === 'player' ? 'rival' : 'player';
    const defensor = s[defensorJugador];

    const heroeAtacante = atacante.heroes[atacanteSlot];
    if (!heroeAtacante || heroeAtacante.vida <= 0) return { ok: false, msg: 'Héroe inválido' };
    if (heroeAtacante.paralizado > 0 || heroeAtacante.electrocutado > 0) return { ok: false, msg: 'Héroe paralizado' };
    
    // Verificar que tiene al menos 1 energía
    const energiaDisponible = (heroeAtacante.energiaStack && heroeAtacante.energiaStack.length) || 0;
    if (energiaDisponible < 1) return { ok: false, msg: 'Sin energía suficiente' };
    
    const cartaSoporte = defensor.bocaAbajo && defensor.bocaAbajo[slotSoporte];
    if (!cartaSoporte) return { ok: false, msg: 'No hay carta en ese slot de soporte' };

    // Gastar 1 energía
    this.gastarEnergiaDeHeroe(atacanteJugador, atacanteSlot, 1);
    s.accionesRestantes--;

    // Destruir la carta de soporte
    defensor.bocaAbajo[slotSoporte] = null;
    s.descarte.push(cartaSoporte);
    
    // Re-aplicar efectos de soporte del defensor (ya que se eliminó una carta)
    this.aplicarEfectosSoporte(defensorJugador);

    return {
      ok: true,
      cartaDestruida: cartaSoporte,
      atacanteJugador,
      atacanteNombre: heroeAtacante.nombre,
      cartaNombre: cartaSoporte.nombre || 'Carta de soporte'
    };
  },

  /**
   * Gasta energía del héroe (quita cartas del stack de ese héroe y las manda al descarte).
   */
  gastarEnergiaDeHeroe(jugador, heroeSlot, cantidad) {
    const j = jugador === 'player' ? this.estado.player : this.estado.rival;
    const heroe = j.heroes[heroeSlot];
    if (!heroe || !heroe.energiaStack) return 0;
    let gastadas = 0;
    while (gastadas < cantidad && heroe.energiaStack.length > 0) {
      const item = heroe.energiaStack.pop();
      if (!item.virtual) this.estado.descarte.push(item);
      gastadas++;
    }
    return gastadas;
  },

  /**
   * Ataca con un héroe del jugador a un héroe del rival.
   */
  atacar(atacanteJugador, atacanteSlot, defensorSlot) {
    const s = this.estado;
    if (s.fase !== 'acciones' || s.accionesRestantes < 1) return { ok: false, msg: 'Sin acciones' };
    const atacante = atacanteJugador === 'player' ? s.player : s.rival;
    const defensorJugador = atacanteJugador === 'player' ? 'rival' : 'player';
    const defensor = s[defensorJugador];

    const heroeAtacante = atacante.heroes[atacanteSlot];
    const heroeDefensor = defensor.heroes[defensorSlot];
    if (!heroeAtacante || heroeAtacante.vida <= 0) return { ok: false, msg: 'Héroe inválido' };
    if (heroeAtacante.paralizado > 0 || heroeAtacante.electrocutado > 0) return { ok: false, msg: 'Héroe paralizado' };
    if (!heroeDefensor) return { ok: false, msg: 'No hay objetivo' };
    if (!this.puedeAtacar(atacanteJugador, atacanteSlot)) return { ok: false, msg: 'Sin energía suficiente' };

    // Gastar energía del stack del héroe atacante
    this.gastarEnergiaDeHeroe(atacanteJugador, atacanteSlot, heroeAtacante.costoEnergia || 0);
    s.accionesRestantes--;

    // Contraataque en Soporte (bocaAbajo) del defensor: hace 2 de daño al atacante al ser atacado
    let contraataqueRevelada = null;
    const bocaAbajo = defensor.bocaAbajo || [];
    for (let i = 0; i < bocaAbajo.length; i++) {
      const c = bocaAbajo[i];
      if (c && c.tipo === 'trampa' && (c.efectoId === 'contraataque' || c.id === 'contraataque')) {
        contraataqueRevelada = c;
        defensor.bocaAbajo[i] = null;
        s.descarte.push(c);
        heroeAtacante.vida = Math.max(0, (heroeAtacante.vida || 0) - 2);
        if (s.resumenTurno && atacanteJugador === 'player') s.resumenTurno.danoRecibido = (s.resumenTurno.danoRecibido || 0) + 2;
        break;
      }
    }

    // Si el defensor tiene cartas boca abajo encima, el ataque golpea la de arriba
    const faceDown = heroeDefensor.faceDownStack && heroeDefensor.faceDownStack.length > 0
      ? heroeDefensor.faceDownStack.pop()
      : null;
    if (faceDown) {
      if (faceDown.tipo === 'energia') {
        s.mazo.push(faceDown);
        barajar(s.mazo);
      } else if (faceDown.tipo === 'trampa') {
        s.descarte.push(faceDown);
        if (faceDown.efectoId === 'contraataque') {
          heroeAtacante.vida = Math.max(0, (heroeAtacante.vida || 0) - 2);
          if (s.resumenTurno && atacanteJugador === 'player') s.resumenTurno.danoRecibido = (s.resumenTurno.danoRecibido || 0) + 2;
        }
        if (faceDown.efectoId === 'escudo') {
          // Escudo: absorbe el ataque (bloquea el daño); se rellena resultado más abajo
        }
        if (faceDown.efectoId === 'curacion') {
          heroeDefensor.vida = Math.min(heroeDefensor.vidaMax || heroeDefensor.vida, (heroeDefensor.vida || 0) + 2);
        }
        if (faceDown.efectoId === 'robo') {
          for (let i = 0; i < 2 && s.mazo.length > 0; i++) defensor.mano.push(s.mazo.shift());
        }
      } else {
        s.descarte.push(faceDown);
      }
      const resultado = { ok: true, cartaRevelada: faceDown, atacanteDestruido: heroeAtacante.vida <= 0 };
      if (faceDown.efectoId === 'escudo') {
        let danoQueSería = (heroeAtacante.ataque || 0) + (heroeAtacante.ataqueExtra || 0);
        if (heroeAtacante.habilidadId === 'odin_vision' && heroeDefensor.atributo && ['humano', 'mortal'].includes(heroeDefensor.atributo)) danoQueSería += 2;
        if (heroeDefensor.habilidadId === 'cleopatra_defensa') danoQueSería = Math.max(0, danoQueSería - 1);
        resultado.bloqueado = true;
        resultado.danoBloqueado = danoQueSería;
        resultado.atacanteNombre = heroeAtacante.nombre;
        resultado.defensorNombre = heroeDefensor.nombre;
        resultado.atacanteJugador = atacanteJugador;
      }
      if (faceDown.efectoId === 'curacion') {
        resultado.curacion = 2;
        resultado.heroeNombre = heroeDefensor.nombre;
        resultado.jugadorCurado = defensorJugador;
      }
      if (heroeAtacante.vida <= 0) {
        atacante.heroes[atacanteSlot] = null;
        const reemplazoAtacante = this.reemplazarHeroeDestruido(atacanteJugador, atacanteSlot);
        resultado.reemplazoAtacante = reemplazoAtacante;
      }
      return resultado;
    }

    let dano = (heroeAtacante.ataque || 0) + (heroeAtacante.ataqueExtra || 0);
    // Bonus Odin vs heroína/mortal
    if (heroeAtacante.habilidadId === 'odin_vision' && heroeDefensor.atributo && ['humano', 'mortal'].includes(heroeDefensor.atributo)) dano += 2;
    // Cleopatra: atacante pierde 1 de ataque este turno
    if (heroeDefensor.habilidadId === 'cleopatra_defensa') dano = Math.max(0, dano - 1);
    // Defensa extra de cartas de soporte (héroes en soporte)
    if (heroeDefensor.defensaExtra) dano = Math.max(0, dano - heroeDefensor.defensaExtra);

    const vidaAntes = heroeDefensor.vida || 0;
    heroeDefensor.vida -= dano;
    // Daño para el log: solo los corazones que se quitaron (nunca más de los que tenía)
    const danoParaLog = Math.min(dano, vidaAntes);
    if (s.resumenTurno) {
      if (atacanteJugador === 'player') s.resumenTurno.danoHecho = (s.resumenTurno.danoHecho || 0) + dano;
      else s.resumenTurno.danoRecibido = (s.resumenTurno.danoRecibido || 0) + dano;
    }
    // Hydra: cada vez que recibe daño gana +1 ataque hasta fin del turno
    if (dano > 0 && heroeDefensor.habilidadId === 'hydra_dano') heroeDefensor.ataque = (heroeDefensor.ataque || 0) + 1;

    const resultado = {
      ok: true,
      dano: danoParaLog,
      defensorDestruido: heroeDefensor.vida <= 0,
      atacanteDestruido: heroeAtacante.vida <= 0,
      atacanteJugador,
      atacanteNombre: heroeAtacante.nombre,
      defensorNombre: heroeDefensor.nombre
    };
    if (contraataqueRevelada) resultado.cartaRevelada = contraataqueRevelada;

    // Zeus: paraliza al defensor 1 turno
    if (heroeAtacante.habilidadId === 'zeus_paralizar') {
      heroeDefensor.paralizado = (heroeDefensor.paralizado || 0) + 1;
      resultado.efectoEspecial = { tipo: 'paralizar', heroe: heroeDefensor.nombre, turnos: 1 };
    }
    // Thor: electrocutado 2 turnos
    if (heroeAtacante.habilidadId === 'thor_ataque') {
      heroeDefensor.electrocutado = (heroeDefensor.electrocutado || 0) + 2;
      resultado.efectoEspecial = { tipo: 'electrocutar', heroe: heroeDefensor.nombre, turnos: 2 };
    }

    // Lucifer: el jugador que controla a Lucifer elige 1 carta de la mano del rival para quemar (se hace desde UI).
    if (heroeAtacante.habilidadId === 'lucifer_ataque') {
      resultado.luciferQuemar = true;
      resultado.efectoEspecial = { tipo: 'quemar_carta' };
    }
    // Centauro: destruye 1 energía de un héroe del oponente
    if (heroeAtacante.habilidadId === 'centauro_ataque') {
      for (let i = 0; i < defensor.heroes.length; i++) {
        const h = defensor.heroes[i];
        if (h && h.energiaStack && h.energiaStack.length > 0) {
          s.descarte.push(h.energiaStack.pop());
          resultado.efectoEspecial = { tipo: 'destruir_energia', heroe: h.nombre };
          break;
        }
      }
    }
    // Minotauro: si rival tiene 2+ energías en algún héroe, destruye 1
    if (heroeAtacante.habilidadId === 'minotauro_ataque') {
      const totalEnergia = (defensor.heroes || []).reduce((sum, h) => sum + (h && h.energiaStack ? h.energiaStack.length : 0), 0);
      if (totalEnergia >= 2) {
        for (let i = 0; i < defensor.heroes.length; i++) {
          const h = defensor.heroes[i];
          if (h && h.energiaStack && h.energiaStack.length > 0) {
            s.descarte.push(h.energiaStack.pop());
            resultado.efectoEspecial = { tipo: 'destruir_energia', heroe: h.nombre };
            break;
          }
        }
      }
    }

    // Comprobar si el defensor murió
    if (heroeDefensor.vida <= 0) {
      // Anubis: al destruir héroe enemigo, roba 1
      if (heroeAtacante.habilidadId === 'anubis_destruir' && s.mazo.length > 0) {
        atacante.mano.push(s.mazo.shift());
        resultado.efectoEspecial = { tipo: 'robar_carta', cantidad: 1 };
      }
      // Fénix: vuelve a mano (una vez por partida)
      if (heroeDefensor.habilidadId === 'fenix_revivir' && !heroeDefensor.fenixUsado) {
        heroeDefensor.fenixUsado = true;
        heroeDefensor.vida = heroeDefensor.vidaMax || 1;
        defensor.heroes[defensorSlot] = heroeDefensor;
        resultado.defensorDestruido = false;
        resultado.efectoEspecial = { tipo: 'fenix_revivir', heroe: heroeDefensor.nombre };
      } else {
        defensor.heroes[defensorSlot] = null;
        const reemplazo = this.reemplazarHeroeDestruido(defensorJugador, defensorSlot);
        resultado.reemplazo = reemplazo;
        // El héroe que mató recupera 1 energía (máx 3)
        if (heroeAtacante.vida > 0 && atacante.heroes[atacanteSlot] === heroeAtacante) {
          if (!heroeAtacante.energiaStack) heroeAtacante.energiaStack = [];
          if (heroeAtacante.energiaStack.length < maxEnergiaHeroe(heroeAtacante)) {
            heroeAtacante.energiaStack.push({ id: 'energia_kill', tipo: 'energia', virtual: true });
          }
        }
      }
    }

    // Comprobar si el atacante murió (p. ej. contraataque)
    if (heroeAtacante.vida <= 0) {
      atacante.heroes[atacanteSlot] = null;
      const reemplazoAtacante = this.reemplazarHeroeDestruido(atacanteJugador, atacanteSlot);
      resultado.reemplazoAtacante = reemplazoAtacante;
    }

    return resultado;
  },

  /**
   * Usar efecto: curación, visión, robo, antídoto (desde mano o revelar trampa).
   */
  usarEfecto(jugador, tipo, parametros) {
    const s = this.estado;
    if (s.fase !== 'acciones' || s.accionesRestantes < 1) return { ok: false, msg: 'Sin acciones' };
    const j = jugador === 'player' ? s.player : s.rival;

    if (tipo === 'curacion') {
      const heroeSlot = parametros.heroeSlot;
      const heroe = j.heroes[heroeSlot];
      if (!heroe) return { ok: false, msg: 'Sin héroe' };
      heroe.vida = Math.min(heroe.vidaMax || heroe.vida, heroe.vida + 2);
      if (s.resumenTurno && jugador === 'player') s.resumenTurno.curacion = (s.resumenTurno.curacion || 0) + 2;
      s.accionesRestantes--;
      return { ok: true, curacion: 2, heroeNombre: heroe.nombre, jugadorCurado: jugador, heroeSlot };
    }
    if (tipo === 'antidoto') {
      const heroeSlot = parametros.heroeSlot;
      const heroe = j.heroes[heroeSlot];
      if (!heroe) return { ok: false, msg: 'Sin héroe' };
      heroe.paralizado = 0;
      heroe.electrocutado = 0;
      s.accionesRestantes--;
      return { ok: true };
    }
    if (tipo === 'robo') {
      for (let i = 0; i < 2 && s.mazo.length > 0; i++) j.mano.push(s.mazo.shift());
      s.accionesRestantes--;
      return { ok: true };
    }
    if (tipo === 'vision') {
      s.accionesRestantes--;
      return { ok: true, mostrarRival: true };
    }
    if (tipo === 'hercules_cura') {
      const heroeSlot = parametros.heroeSlot;
      const heroe = j.heroes[heroeSlot];
      if (!heroe) return { ok: false, msg: 'Sin héroe' };
      const hercules = j.heroes.find(h => h && h.habilidadId === 'hercules_cura');
      if (!hercules || hercules.usadoHabilidad) return { ok: false, msg: 'Hércules ya usó la habilidad' };
      heroe.vida = Math.min(heroe.vidaMax || heroe.vida, heroe.vida + 2);
      hercules.usadoHabilidad = true;
      s.accionesRestantes--;
      return { ok: true, curacion: 2, heroeNombre: heroe.nombre, jugadorCurado: jugador };
    }
    return { ok: false, msg: 'Efecto no soportado' };
  },

  /**
   * Activar una trampa boca abajo (curación, robo, antídoto, visión).
   */
  activarTrampa(jugador, slotBocaAbajo, parametros) {
    const s = this.estado;
    if (s.fase !== 'acciones' || s.accionesRestantes < 1) return { ok: false };
    const j = jugador === 'player' ? s.player : s.rival;
    const carta = j.bocaAbajo[slotBocaAbajo];
    if (!carta || carta.tipo !== 'trampa') return { ok: false };
    j.bocaAbajo[slotBocaAbajo] = null;
    s.descarte.push(carta);
    return this.usarEfecto(jugador, carta.efectoId || carta.id, parametros || {});
  },

  /**
   * Usar una carta de efecto (trampa) desde la mano: se descarta y se aplica el efecto.
   * Solo para trampas con efecto activo: curacion, vision, robo, antidoto.
   */
  usarEfectoDesdeMano(jugador, indiceMano, parametros) {
    const s = this.estado;
    if (s.fase !== 'acciones' || s.accionesRestantes < 1) return { ok: false, msg: 'Sin acciones' };
    const j = jugador === 'player' ? s.player : s.rival;
    const carta = j.mano[indiceMano];
    if (!carta || carta.tipo !== 'trampa') return { ok: false, msg: 'No es una carta de efecto' };
    const efectoId = carta.efectoId || carta.id;
    const efectosDesdeMano = ['curacion', 'vision', 'robo', 'antidoto'];
    if (!efectosDesdeMano.includes(efectoId)) return { ok: false, msg: 'Esta carta solo se usa al ponerla sobre un héroe' };
    j.mano.splice(indiceMano, 1);
    s.descarte.push(carta);
    return this.usarEfecto(jugador, efectoId, parametros || {});
  },

  /**
   * Quemar una carta de la mano del rival (Lucifer).
   */
  quemarCartaRival(indiceManoRival) {
    return this.quemarCartaDe('rival', indiceManoRival);
  },

  quemarCartaDe(jugador, indice) {
    const s = this.estado;
    const j = jugador === 'player' ? s.player : s.rival;
    if (indice < 0 || indice >= j.mano.length) return { ok: false };
    const carta = j.mano.splice(indice, 1)[0];
    s.descarte.push(carta);
    return { ok: true };
  },

  /**
   * Terminar turno: aplicar turnos perdidos, cambiar turno, resetear acciones y estados temporales.
   */
  terminarTurno() {
    const s = this.estado;
    if (s.ganador) return;

    const actual = s.turnoActual;
    s.turnoActual = actual === 'player' ? 'rival' : 'player';
    const rd = s.reglasDesafio || {};
    s.accionesRestantes = (rd.accionesPorTurno != null) ? rd.accionesPorTurno : 2;
    s.fase = 'acciones';
    s.numeroTurno = (s.numeroTurno || 1) + 1;

    // Desafío: límite de turnos (si se supera, pierde el jugador)
    if (rd.maxTurnos && s.numeroTurno >= rd.maxTurnos && !s.ganador) {
      s.ganador = 'rival';
      return true;
    }

    // Si el jugador que acaba de recibir el turno tiene "perder turno" (Medusa/Thor), se salta su turno
    const siguiente = s.turnoActual;
    if (s.turnoPerdido[siguiente] > 0) {
      s.turnoPerdido[siguiente]--;
      return this.terminarTurno();
    }

    // Reducir paralizado/electrocutado en los héroes del jugador que empieza turno
    const j = s.turnoActual === 'player' ? s.player : s.rival;
    j.heroes.forEach(h => {
      if (h) {
        if (h.paralizado > 0) h.paralizado--;
        if (h.electrocutado > 0) h.electrocutado--;
      }
    });
    
    // Re-aplicar efectos de soporte al inicio de cada turno
    this.aplicarEfectosSoporte('player');
    this.aplicarEfectosSoporte('rival');
    // Cada turno ambos jugadores roban 1 carta al inicio (el que recibe el turno y el que lo acaba de dejar)
    this.robarUnaAlInicioTurno('player');
    this.robarUnaAlInicioTurno('rival');
    if (s.resumenTurno) s.resumenTurno = { danoHecho: 0, danoRecibido: 0, curacion: 0 };

    // Desempate por tiempo: tras MAX_TURNOS_PARTIDA, gana quien tenga más vida total en héroes (para que siempre se pueda ganar).
    if (s.numeroTurno >= MAX_TURNOS_PARTIDA && !s.ganador) {
      const vidaPlayer = (s.player.heroes || []).reduce((sum, h) => sum + (h && h.vida > 0 ? h.vida : 0), 0);
      const vidaRival = (s.rival.heroes || []).reduce((sum, h) => sum + (h && h.vida > 0 ? h.vida : 0), 0);
      if (vidaPlayer > vidaRival) s.ganador = 'player';
      else if (vidaRival > vidaPlayer) s.ganador = 'rival';
      else s.ganador = s.mazo.length <= 0 ? 'rival' : 'player';
    }
    return true;
  },

  /**
   * Obtiene las acciones posibles para el jugador actual (para IA o validación).
   */
  getAccionesPosibles(jugador) {
    const s = this.estado;
    if (s.fase !== 'acciones' || s.accionesRestantes < 1) return [];
    const j = jugador === 'player' ? s.player : s.rival;
    const acciones = [];

    for (let m = 0; m < j.mano.length; m++) {
      if (j.mano[m] && j.mano[m].tipo === 'energia') {
        for (let h = 0; h < j.heroes.length; h++) {
          const heroe = j.heroes[h];
          if (heroe && heroe.vida > 0 && (heroe.energiaStack ? heroe.energiaStack.length < maxEnergiaHeroe(heroe) : true))
            acciones.push({ tipo: 'energia', indiceMano: m, heroeSlot: h });
        }
      }
    }
    // Energía desde zona de soporte (carta ya boca arriba tipo energía)
    for (let b = 0; b < (j.bocaAbajo || []).length; b++) {
      const cartaSoporte = j.bocaAbajo[b];
      if (cartaSoporte && cartaSoporte.tipo === 'energia') {
        for (let h = 0; h < j.heroes.length; h++) {
          const heroe = j.heroes[h];
          if (heroe && heroe.vida > 0 && (heroe.energiaStack ? heroe.energiaStack.length < maxEnergiaHeroe(heroe) : true))
            acciones.push({ tipo: 'energia_soporte', indiceSoporte: b, heroeSlot: h });
        }
      }
    }
    for (let b = 0; b < (j.bocaAbajo || []).length; b++) {
      if (j.bocaAbajo[b]) {
        for (let h = 0; h < j.heroes.length; h++) {
          const heroe = j.heroes[h];
          if (heroe && heroe.vida > 0 && (heroe.faceDownStack ? heroe.faceDownStack.length < 3 : true))
            acciones.push({ tipo: 'boca_abajo', indiceBocaAbajo: b, heroeSlot: h });
        }
      }
    }
    for (let h = 0; h < j.heroes.length; h++) {
      const heroe = j.heroes[h];
      if (!heroe || heroe.vida <= 0) continue;
      if (heroe.paralizado > 0 || heroe.electrocutado > 0) continue;
      const energiaDisponible = (heroe.energiaStack && heroe.energiaStack.length) || 0;
      const costo = heroe.costoEnergia || 0;
      const defensor = jugador === 'player' ? s.rival : s.player;
      if (energiaDisponible >= costo) {
        // Atacar héroes enemigos
        for (let d = 0; d < defensor.heroes.length; d++) {
          if (defensor.heroes[d]) acciones.push({ tipo: 'atacar', atacanteSlot: h, defensorSlot: d });
        }
      }
      // Atacar cartas de soporte (cuesta 1 energía)
      if (energiaDisponible >= 1) {
        for (let s = 0; s < (defensor.bocaAbajo || []).length; s++) {
          if (defensor.bocaAbajo[s]) {
            acciones.push({ tipo: 'atacar_soporte', atacanteSlot: h, slotSoporte: s });
          }
        }
      }
    }
    // Activar trampa desde boca abajo (cualquier slot con carta; si no es trampa fallará)
    for (let b = 0; b < (j.bocaAbajo || []).length; b++) {
      if (j.bocaAbajo[b] && j.bocaAbajo[b].tipo === 'trampa') {
        const carta = j.bocaAbajo[b];
        const necesitaHeroe = (carta.efectoId || carta.id) === 'curacion' || (carta.efectoId || carta.id) === 'antidoto';
        if (necesitaHeroe) {
          for (let h = 0; h < j.heroes.length; h++) {
            if (j.heroes[h] && j.heroes[h].vida > 0)
              acciones.push({ tipo: 'activar_trampa', slotBocaAbajo: b, heroeSlot: h });
          }
        } else {
          acciones.push({ tipo: 'activar_trampa', slotBocaAbajo: b });
        }
      }
    }
    // Poner carta en soporte (slot 0=energía, 1=héroe, 2=trampa)
    for (let slot = 0; slot < (j.bocaAbajo || []).length; slot++) {
      if (j.bocaAbajo[slot]) continue;
      const tipoRequerido = TIPO_SLOT_SOPORTE[slot];
      for (let m = 0; m < j.mano.length; m++) {
        if (j.mano[m] && j.mano[m].tipo === tipoRequerido) {
          acciones.push({ tipo: 'soporte', indiceMano: m, slotSoporte: slot });
        }
      }
    }
    // Usar efecto desde mano (curación, visión, robo, antídoto)
    const efectosDesdeMano = ['curacion', 'vision', 'robo', 'antidoto'];
    for (let m = 0; m < j.mano.length; m++) {
      const c = j.mano[m];
      if (c && c.tipo === 'trampa' && efectosDesdeMano.includes(c.efectoId || c.id)) {
        const efectoId = c.efectoId || c.id;
        if (efectoId === 'curacion' || efectoId === 'antidoto') {
          for (let h = 0; h < j.heroes.length; h++) {
            if (j.heroes[h] && j.heroes[h].vida > 0)
              acciones.push({ tipo: 'usar_efecto_mano', indiceMano: m, heroeSlot: h });
          }
        } else {
          acciones.push({ tipo: 'usar_efecto_mano', indiceMano: m });
        }
      }
    }
    return acciones;
  },

  /**
   * El jugador se rinde: el rival gana.
   */
  rendirse() {
    const s = this.estado;
    if (s.ganador) return;
    s.ganador = 'rival';
    return true;
  }
};
if (typeof Game !== 'undefined') {
  Game.maxEnergiaHeroe = maxEnergiaHeroe;
  Game.TIPO_SLOT_SOPORTE = TIPO_SLOT_SOPORTE;
}
