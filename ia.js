/**
 * Dioses en Guerra - IA
 * Cuatro niveles: Fácil, Intermedio, Difícil, JARCOR (óptima).
 */

const IA = {
  dificultad: 'facil',

  /**
   * Elige setup para el rival: 2 héroes, 3 soporte (1 energía, 1 héroe, 1 trampa), 3 en mano.
   */
  elegirSetup(manoInicial) {
    const heroes = [];
    const bocaAbajo = [null, null, null];
    const mano = [];
    const restantes = [...manoInicial];

    const esHeroe = c => c.tipo === 'heroe';
    const poderHeroe = h => (h.ataque || 0) + (h.vidaMax || h.vida || 0) + (h.costoEnergia || 0);
    const heroesDisponibles = restantes.filter(esHeroe).sort((a, b) => poderHeroe(b) - poderHeroe(a));
    const noHeroes = restantes.filter(c => !esHeroe(c));

    for (let i = 0; i < 2 && i < heroesDisponibles.length; i++) heroes.push(heroesDisponibles[i]);
    const rest = [...noHeroes, ...heroesDisponibles.slice(2)];
    const iE = rest.findIndex(c => c && c.tipo === 'energia');
    if (iE >= 0) { bocaAbajo[0] = rest.splice(iE, 1)[0]; }
    const iH = rest.findIndex(c => c && c.tipo === 'heroe');
    if (iH >= 0) { bocaAbajo[1] = rest.splice(iH, 1)[0]; }
    const iT = rest.findIndex(c => c && c.tipo === 'trampa');
    if (iT >= 0) { bocaAbajo[2] = rest.splice(iT, 1)[0]; }
    for (let i = 0; i < 3 && i < rest.length; i++) mano.push(rest[i]);

    return { heroes, bocaAbajo, mano };
  },

  /**
   * Devuelve la acción que la IA quiere ejecutar este turno.
   */
  jugar() {
    const s = Game.estado;
    if (!s || s.turnoActual !== 'rival' || s.ganador) return null;

    let acciones;
    try {
      acciones = Game.getAccionesPosibles('rival');
    } catch (e) {
      if (typeof console !== 'undefined') console.error('IA.jugar getAccionesPosibles', e);
      return { tipo: 'terminar_turno' };
    }
    if (!acciones || !Array.isArray(acciones) || acciones.length === 0) return { tipo: 'terminar_turno' };

    switch (this.dificultad) {
      case 'facil':
        return this.accionFacil(acciones);
      case 'intermedio':
        return this.accionIntermedio(acciones);
      case 'dificil':
        return this.accionDificil(acciones);
      case 'jarcor':
        return this.accionJarcor(acciones);
      default:
        return this.accionFacil(acciones);
    }
  },

  accionFacil(acciones) {
    const idx = Math.floor(Math.random() * acciones.length);
    return acciones[idx];
  },

  accionIntermedio(acciones) {
    const ataques = acciones.filter(a => a.tipo === 'atacar');
    if (ataques.length > 0) {
      const s = Game.estado;
      const defensor = s.player;
      let mejor = ataques[0];
      let mejorPuntos = -1;
      ataques.forEach(a => {
        const def = defensor.heroes[a.defensorSlot];
        if (!def) return;
        const puntos = (def.vida || 0) + (def.ataque || 0);
        if (puntos > mejorPuntos) { mejorPuntos = puntos; mejor = a; }
      });
      return mejor;
    }
    const energias = acciones.filter(a => a.tipo === 'energia');
    if (energias.length > 0) return energias[Math.floor(Math.random() * energias.length)];
    return acciones[0];
  },

  accionDificil(acciones) {
    const s = Game.estado;
    const ataques = acciones.filter(a => a.tipo === 'atacar');
    if (ataques.length > 0) {
      let mejor = ataques[0];
      let mejorValor = -999;
      ataques.forEach(a => {
        const valor = this.evaluarAtaque(a);
        if (valor > mejorValor) { mejorValor = valor; mejor = a; }
      });
      return mejor;
    }
    const energias = acciones.filter(a => a.tipo === 'energia');
    const miZona = s.rival;
    const heroesSinEnergia = miZona.heroes.filter(h => h && h.vida > 0 && ((h.energiaStack ? h.energiaStack.length : 0) < (h.costoEnergia || 0))).length;
    if (heroesSinEnergia > 0 && energias.length > 0) return energias[0];
    if (energias.length > 0) return energias[Math.floor(Math.random() * energias.length)];
    return acciones[0];
  },

  evaluarAtaque(accion) {
    const s = Game.estado;
    const rival = s.rival;
    const player = s.player;
    const atacante = rival.heroes[accion.atacanteSlot];
    const defensor = player.heroes[accion.defensorSlot];
    if (!atacante || !defensor) return -100;
    let valor = 0;
    valor += defensor.vida; // priorizar matar héroes
    valor += (defensor.ataque || 0) * 0.5;
    if (defensor.vida <= atacante.ataque) valor += 20; // matar
    return valor;
  },

  accionJarcor(acciones) {
    const s = Game.estado;
    let mejorAccion = null;
    let mejorPuntuacion = -Infinity;

    for (const accion of acciones) {
      const puntuacion = this.minimaxValor(accion, s, 0, 3);
      if (puntuacion > mejorPuntuacion) {
        mejorPuntuacion = puntuacion;
        mejorAccion = accion;
      }
    }

    if (mejorAccion) return mejorAccion;
    if (acciones.length > 0) return acciones[0];
    return { tipo: 'terminar_turno' };
  },

  /**
   * Evalúa el estado desde el punto de vista del rival (IA). Positivo = bueno para IA.
   */
  evaluarEstado(s) {
    let score = 0;
    const r = s.rival;
    const p = s.player;

    r.heroes.forEach(h => {
      if (h) score += (h.vida || 0) * 2 + (h.ataque || 0) * 3;
    });
    p.heroes.forEach(h => {
      if (h) score -= (h.vida || 0) * 2 + (h.ataque || 0) * 3;
    });
    score += r.mano.length * 2;
    score -= p.mano.length * 2;
    score += r.bocaAbajo.filter(c => c).length;
    score -= p.bocaAbajo.filter(c => c).length;
    (r.heroes || []).forEach(h => { if (h && h.energiaStack) score += h.energiaStack.length * 1.5; });
    (p.heroes || []).forEach(h => { if (h && h.energiaStack) score -= h.energiaStack.length * 1.5; });
    score += contarHeroesEnMazo(s.mazo) * 0.5;
    if (s.ganador === 'rival') score += 1000;
    if (s.ganador === 'player') score -= 1000;
    return score;
  },

  minimaxValor(accion, estadoCopia, profundidad, maxProfundidad) {
    if (profundidad >= maxProfundidad) return this.evaluarEstado(estadoCopia);
    const s = JSON.parse(JSON.stringify(estadoCopia));
    if (accion.tipo === 'atacar') {
      const rival = s.rival;
      const player = s.player;
      const atacante = rival.heroes[accion.atacanteSlot];
      const defensor = player.heroes[accion.defensorSlot];
      if (!atacante || !defensor) return this.evaluarEstado(s);
      defensor.vida -= atacante.ataque || 0;
      if (defensor.vida <= 0) player.heroes[accion.defensorSlot] = null;
      if (atacante.vida <= 0) rival.heroes[accion.atacanteSlot] = null;
    } else if (accion.tipo === 'energia') {
      const heroe = s.rival.heroes[accion.heroeSlot];
      const maxE = (typeof Game !== 'undefined' && Game.maxEnergiaHeroe) ? Game.maxEnergiaHeroe(heroe) : 3;
      if (heroe && heroe.energiaStack && heroe.energiaStack.length < maxE) {
        const c = s.rival.mano[accion.indiceMano];
        s.rival.mano.splice(accion.indiceMano, 1);
        heroe.energiaStack.push(c);
      }
    }
    return this.evaluarEstado(s);
  }
};
