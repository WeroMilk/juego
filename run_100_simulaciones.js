/**
 * Ejecuta 100 simulaciones (Jugador aleatorio vs IA intermedia) y asigna una puntuación 1-10 al juego.
 * Uso: node run_100_simulaciones.js
 */

const fs = require('fs');
const path = require('path');
const dir = __dirname;
const globalObj = typeof globalThis !== 'undefined' ? globalThis : global;

const cartasCode = fs.readFileSync(path.join(dir, 'cartas.js'), 'utf8');
const gameCode = fs.readFileSync(path.join(dir, 'game.js'), 'utf8');
const iaCode = fs.readFileSync(path.join(dir, 'ia.js'), 'utf8');

(function (g) {
  eval(cartasCode);
  eval(gameCode + '\ng.Game = typeof Game !== "undefined" ? Game : null;');
  eval(iaCode + '\ng.IA = typeof IA !== "undefined" ? IA : null;');
})(globalObj);

const Game = globalObj.Game;
const IA = globalObj.IA;
if (!Game || !IA) throw new Error('No se cargaron Game o IA.');

const MAX_TURNOS = 800;
const NUM_SIMULACIONES = 100;

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
  let winsPlayer = 0, winsRival = 0, timeouts = 0, errores = 0;
  const turnosPorPartida = [];
  const inicio = Date.now();

  for (let i = 0; i < NUM_SIMULACIONES; i++) {
    try {
      const r = jugarUnaPartida();
      if (r.timeout) timeouts++;
      else if (r.ganador === 'player') winsPlayer++;
      else if (r.ganador === 'rival') winsRival++;
      if (!r.timeout) turnosPorPartida.push(r.turnos);
    } catch (e) {
      errores++;
      console.error('Simulación', i + 1, e.message);
    }
  }

  const seg = (Date.now() - inicio) / 1000;
  const partidasConGanador = winsPlayer + winsRival;
  const turnosPromedio = turnosPorPartida.length ? turnosPorPartida.reduce((a, b) => a + b, 0) / turnosPorPartida.length : 0;
  const turnosMin = turnosPorPartida.length ? Math.min(...turnosPorPartida) : 0;
  const turnosMax = turnosPorPartida.length ? Math.max(...turnosPorPartida) : 0;

  return {
    total: NUM_SIMULACIONES,
    winsPlayer,
    winsRival,
    timeouts,
    errores,
    partidasConGanador,
    seg,
    turnosPromedio: Math.round(turnosPromedio * 10) / 10,
    turnosMin,
    turnosMax,
    turnosPorPartida
  };
}

function calcularPuntuacion(resultado) {
  const { total, winsPlayer, winsRival, timeouts, errores, partidasConGanador, turnosPromedio } = resultado;
  let puntos = 5; // base 5/10

  // 1) Equilibrio: que no gane siempre uno (random vs IA intermedia, esperamos algo 30-70 o 40-60)
  const pctPlayer = partidasConGanador > 0 ? (winsPlayer / partidasConGanador) * 100 : 50;
  const balance = Math.min(pctPlayer, 100 - pctPlayer); // % del que menos gana (50 = perfecto equilibrio)
  if (balance >= 45) puntos += 1.5;
  else if (balance >= 40) puntos += 1;
  else if (balance >= 30) puntos += 0.5;
  else if (balance < 15) puntos -= 1;

  // 2) Pocos o ningún timeout: las partidas terminan
  if (timeouts === 0) puntos += 1.5;
  else if (timeouts <= 2) puntos += 0.5;
  else if (timeouts > 10) puntos -= 1;

  // 3) Cero errores: el motor no falla
  if (errores === 0) puntos += 1;
  else puntos -= Math.min(2, errores);

  // 4) Partidas con resolución clara
  if (partidasConGanador === total) puntos += 0.5;

  // 5) Duración razonable (ni 3 turnos ni 500)
  if (turnosPromedio >= 15 && turnosPromedio <= 120) puntos += 0.5;
  else if (turnosPromedio >= 8 && turnosPromedio <= 200) puntos += 0.2;

  const puntuacion = Math.max(1, Math.min(10, Math.round(puntos * 10) / 10));
  return puntuacion;
}

// --- Ejecución ---
console.log('Ejecutando 100 simulaciones (Jugador aleatorio vs IA intermedia)...\n');
const resultado = ejecutar100();

console.log('=== RESULTADOS DE 100 PARTIDAS ===');
console.log('Victorias Jugador (aleatorio):', resultado.winsPlayer);
console.log('Victorias IA (intermedia):     ', resultado.winsRival);
console.log('Timeouts (sin ganador):        ', resultado.timeouts);
console.log('Errores:                      ', resultado.errores);
console.log('Partidas con ganador:         ', resultado.partidasConGanador);
console.log('Tiempo total:                 ', resultado.seg.toFixed(1), 's');
console.log('Turnos por partida (promedio):', resultado.turnosPromedio);
console.log('Turnos (mín / máx):           ', resultado.turnosMin, '/', resultado.turnosMax);

const puntuacion = calcularPuntuacion(resultado);
console.log('\n=== PUNTUACIÓN DEL JUEGO (1-10) ===');
console.log('Nota:', puntuacion, '/ 10');
console.log('');

process.exit(0);
