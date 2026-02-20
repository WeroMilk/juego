/**
 * Simulación de 100 partidas IA vs IA para validar jugabilidad y equilibrio.
 * Cargar después de cartas.js, game.js, ia.js.
 */
(function () {
  const MAX_TURNOS = 800;

  function aplicarAccion(accion) {
    const s = Game.estado;
    const jugador = s.turnoActual;
    if (!accion || s.ganador) return false;
    if (accion.tipo === 'terminar_turno') {
      Game.terminarTurno();
      return true;
    }
    if (accion.tipo === 'energia') {
      const r = Game.ponerEnergia(jugador, accion.indiceMano, accion.heroeSlot != null ? accion.heroeSlot : 0);
      return r && r.ok;
    }
    if (accion.tipo === 'energia_soporte') {
      const r = Game.ponerEnergiaDesdeSoporte(jugador, accion.indiceSoporte, accion.heroeSlot != null ? accion.heroeSlot : 0);
      return r && r.ok;
    }
    if (accion.tipo === 'boca_abajo') {
      const r = Game.ponerBocaAbajoEnHeroe(jugador, accion.indiceBocaAbajo, accion.heroeSlot);
      return r && r.ok;
    }
    if (accion.tipo === 'soporte') {
      const r = Game.ponerEnSoporteDesdeMano(jugador, accion.indiceMano, accion.slotSoporte);
      return r && r.ok;
    }
    if (accion.tipo === 'atacar') {
      const r = Game.atacar(jugador, accion.atacanteSlot, accion.defensorSlot);
      if (!r || !r.ok) return false;
      if (r.luciferQuemar) {
        const oponente = jugador === 'player' ? 'rival' : 'player';
        const mano = s[oponente].mano;
        if (mano.length > 0) Game.quemarCartaDe(oponente, Math.floor(Math.random() * mano.length));
      }
      return true;
    }
    if (accion.tipo === 'atacar_soporte') {
      const r = Game.atacarSoporte(jugador, accion.atacanteSlot, accion.slotSoporte);
      return r && r.ok;
    }
    if (accion.tipo === 'activar_trampa') {
      const param = accion.heroeSlot != null ? { heroeSlot: accion.heroeSlot } : {};
      const r = Game.activarTrampa(jugador, accion.slotBocaAbajo, param);
      return r && r.ok;
    }
    if (accion.tipo === 'usar_efecto_mano') {
      const param = accion.heroeSlot != null ? { heroeSlot: accion.heroeSlot } : {};
      const r = Game.usarEfectoDesdeMano(jugador, accion.indiceMano, param);
      return r && r.ok;
    }
    return false;
  }

  function jugarUnaPartida() {
    Game.iniciar('ia', 'intermedio');
    IA.dificultad = Game.estado.dificultad;
    const setupP = IA.elegirSetup(Game.estado.setupPlayer.manoInicial);
    const setupR = IA.elegirSetup(Game.estado.setupRival.manoInicial);
    Game.aplicarSetupJugador(setupP.heroes, setupP.bocaAbajo, setupP.mano);
    Game.aplicarSetupRival(setupR.heroes, setupR.bocaAbajo, setupR.mano);
    Game.finalizarSetup();

    let turnos = 0;
    while (!Game.estado.ganador && turnos < MAX_TURNOS) {
      const jugador = Game.estado.turnoActual;
      let accion;
      if (jugador === 'rival') {
        accion = IA.jugar();
      } else {
        const acciones = Game.getAccionesPosibles('player');
        accion = acciones.length ? acciones[Math.floor(Math.random() * acciones.length)] : { tipo: 'terminar_turno' };
      }
      if (!accion) accion = { tipo: 'terminar_turno' };
      const ok = aplicarAccion(accion);
      if (!ok && accion.tipo !== 'terminar_turno') {
        Game.terminarTurno();
      }
      turnos++;
    }

    return {
      ganador: Game.estado.ganador,
      turnos,
      timeout: turnos >= MAX_TURNOS
    };
  }

  function ejecutar100() {
    return ejecutarN(100);
  }

  function ejecutar1000() {
    return ejecutarN(1000);
  }

  function ejecutarN(n) {
    let winsPlayer = 0, winsRival = 0, timeouts = 0, errores = 0;
    const inicio = Date.now();
    for (let i = 0; i < n; i++) {
      try {
        const r = jugarUnaPartida();
        if (r.timeout) timeouts++;
        else if (r.ganador === 'player') winsPlayer++;
        else if (r.ganador === 'rival') winsRival++;
      } catch (e) {
        errores++;
        if (typeof console !== 'undefined') console.error('Simulación ' + (i + 1), e);
      }
    }
    const seg = ((Date.now() - inicio) / 1000).toFixed(1);
    return {
      total: n,
      winsPlayer,
      winsRival,
      timeouts,
      errores,
      partidasConGanador: winsPlayer + winsRival,
      seg
    };
  }

  const globalObj = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this);
  globalObj.Simulacion = { ejecutar100, ejecutar1000, ejecutarN, jugarUnaPartida };
})();
