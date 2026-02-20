/**
 * Dioses en Guerra - Sistema de Partículas Premium
 * Efectos visuales nivel Pokemon Pocket / Riot Games
 */

const ParticleSystem = {
  canvas: null,
  ctx: null,
  particles: [],
  emitters: [],
  running: false,
  lastTime: 0,
  enabled: true,

  // Configuración de rendimiento
  config: {
    maxParticles: 500,
    useBlending: true,
    quality: 'high' // 'low', 'medium', 'high'
  },

  init() {
    if (this.canvas) return;
    
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'particle-canvas';
    this.canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
    `;
    document.body.appendChild(this.canvas);
    
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    this.start();
  },

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth * (window.devicePixelRatio || 1);
    this.canvas.height = window.innerHeight * (window.devicePixelRatio || 1);
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    if (this.ctx) {
      this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    }
  },

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  },

  stop() {
    this.running = false;
  },

  loop() {
    if (!this.running) return;
    
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    
    this.update(dt);
    this.render();
    
    requestAnimationFrame(() => this.loop());
  },

  update(dt) {
    // Actualizar emisores
    for (let i = this.emitters.length - 1; i >= 0; i--) {
      const emitter = this.emitters[i];
      emitter.time += dt;
      
      if (emitter.time < emitter.duration) {
        emitter.accumulator += emitter.rate * dt;
        while (emitter.accumulator >= 1 && this.particles.length < this.config.maxParticles) {
          emitter.accumulator--;
          this.particles.push(emitter.spawn());
        }
      } else if (emitter.once) {
        this.emitters.splice(i, 1);
      }
    }
    
    // Actualizar partículas
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      
      const lifeRatio = p.life / p.maxLife;
      
      // Física
      p.vx += (p.ax || 0) * dt;
      p.vy += (p.ay || 0) * dt;
      p.vx *= (1 - (p.drag || 0) * dt);
      p.vy *= (1 - (p.drag || 0) * dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      
      // Rotación
      if (p.vr) p.rotation = (p.rotation || 0) + p.vr * dt;
      
      // Escala y alpha según vida
      if (p.scaleStart !== undefined && p.scaleEnd !== undefined) {
        p.scale = p.scaleStart + (p.scaleEnd - p.scaleStart) * this.easeOut(lifeRatio);
      }
      if (p.alphaStart !== undefined && p.alphaEnd !== undefined) {
        p.alpha = p.alphaStart + (p.alphaEnd - p.alphaStart) * lifeRatio;
      }
    }
  },

  render() {
    if (!this.ctx) return;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (this.config.useBlending) {
      this.ctx.globalCompositeOperation = 'lighter';
    }
    
    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.globalAlpha = p.alpha ?? 1;
      this.ctx.translate(p.x, p.y);
      if (p.rotation) this.ctx.rotate(p.rotation);
      const scale = p.scale ?? 1;
      this.ctx.scale(scale, scale);
      
      if (p.render) {
        p.render(this.ctx, p);
      } else {
        this.renderDefault(p);
      }
      
      this.ctx.restore();
    }
    
    this.ctx.globalCompositeOperation = 'source-over';
  },

  renderDefault(p) {
    const ctx = this.ctx;
    const size = p.size || 4;
    
    if (p.shape === 'star') {
      this.drawStar(ctx, 0, 0, 5, size, size / 2, p.color);
    } else if (p.shape === 'spark') {
      this.drawSpark(ctx, 0, 0, size, p.color);
    } else if (p.shape === 'ring') {
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.strokeStyle = p.color || '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (p.shape === 'trail') {
      this.drawTrail(ctx, p);
    } else {
      // Círculo con glow
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
      gradient.addColorStop(0, p.color || '#fff');
      gradient.addColorStop(0.4, p.color || '#fff');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, color) {
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;
    
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
      rot += step;
    }
    
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fillStyle = color || '#ffd700';
    ctx.fill();
  },

  drawSpark(ctx, cx, cy, size, color) {
    ctx.beginPath();
    ctx.moveTo(cx - size, cy);
    ctx.lineTo(cx + size, cy);
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx, cy + size);
    ctx.strokeStyle = color || '#fff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  },

  drawTrail(ctx, p) {
    if (!p.trail || p.trail.length < 2) return;
    
    ctx.beginPath();
    ctx.moveTo(p.trail[0].x - p.x, p.trail[0].y - p.y);
    
    for (let i = 1; i < p.trail.length; i++) {
      ctx.lineTo(p.trail[i].x - p.x, p.trail[i].y - p.y);
    }
    
    ctx.strokeStyle = p.color || '#fff';
    ctx.lineWidth = p.size || 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  },

  // Easing functions
  easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  },

  easeIn(t) {
    return t * t * t;
  },

  easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },

  // ==========================================
  // EFECTOS PREDEFINIDOS - NIVEL PROFESIONAL
  // ==========================================

  // Explosión de impacto (ataque)
  impactExplosion(x, y, color = '#ff6b35', scale = 1) {
    if (this.enabled === false) return;
    this.init();
    
    // Partículas principales de explosión
    for (let i = 0; i < 20 * scale; i++) {
      const angle = (Math.PI * 2 / 20) * i + Math.random() * 0.5;
      const speed = 150 + Math.random() * 200;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        ax: 0,
        ay: 100,
        drag: 2,
        size: 6 + Math.random() * 8,
        color: color,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.3,
        scaleStart: 1,
        scaleEnd: 0,
        alphaStart: 1,
        alphaEnd: 0
      });
    }
    
    // Chispas rápidas
    for (let i = 0; i < 15 * scale; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 200 + Math.random() * 300;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        drag: 3,
        size: 3 + Math.random() * 3,
        color: '#fff',
        shape: 'spark',
        life: 0,
        maxLife: 0.2 + Math.random() * 0.2,
        alphaStart: 1,
        alphaEnd: 0,
        vr: (Math.random() - 0.5) * 20
      });
    }
    
    // Onda expansiva
    this.particles.push({
      x, y,
      vx: 0, vy: 0,
      size: 10,
      color: color,
      shape: 'ring',
      life: 0,
      maxLife: 0.4,
      scaleStart: 0.5,
      scaleEnd: 8,
      alphaStart: 0.8,
      alphaEnd: 0
    });
  },

  // Efecto de daño (números y sangre)
  damageEffect(x, y, damage, isCritical = false) {
    if (this.enabled === false) return;
    this.init();
    
    const color = isCritical ? '#ff0000' : '#ff4444';
    
    // Partículas de "sangre" / energía
    for (let i = 0; i < 12; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      const speed = 80 + Math.random() * 120;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed * 0.3,
        vy: Math.sin(angle) * speed,
        ay: 300,
        drag: 1,
        size: 4 + Math.random() * 4,
        color: color,
        life: 0,
        maxLife: 0.5 + Math.random() * 0.3,
        alphaStart: 1,
        alphaEnd: 0
      });
    }
  },

  // Efecto de curación
  healEffect(x, y, amount) {
    if (this.enabled === false) return;
    this.init();
    
    // Partículas verdes ascendentes
    for (let i = 0; i < 20; i++) {
      const offsetX = (Math.random() - 0.5) * 60;
      const delay = Math.random() * 0.3;
      this.particles.push({
        x: x + offsetX,
        y: y + 30,
        vx: (Math.random() - 0.5) * 30,
        vy: -80 - Math.random() * 60,
        drag: 1,
        size: 5 + Math.random() * 5,
        color: '#22c55e',
        shape: 'star',
        life: -delay,
        maxLife: 1.2,
        scaleStart: 0.5,
        scaleEnd: 0,
        alphaStart: 1,
        alphaEnd: 0,
        vr: (Math.random() - 0.5) * 5
      });
    }
    
    // Aura de curación
    this.particles.push({
      x, y,
      vx: 0, vy: 0,
      size: 30,
      color: '#4ade80',
      shape: 'ring',
      life: 0,
      maxLife: 0.8,
      scaleStart: 0.3,
      scaleEnd: 3,
      alphaStart: 0.6,
      alphaEnd: 0
    });
  },

  // Efecto de energía colocada
  energyPlaced(x, y) {
    this.init();
    
    // Rayos de energía
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * 100,
        vy: Math.sin(angle) * 100,
        drag: 4,
        size: 4,
        color: '#fbbf24',
        shape: 'spark',
        life: 0,
        maxLife: 0.4,
        alphaStart: 1,
        alphaEnd: 0,
        vr: 10
      });
    }
    
    // Pulso central
    this.particles.push({
      x, y,
      vx: 0, vy: 0,
      size: 15,
      color: '#f59e0b',
      life: 0,
      maxLife: 0.3,
      scaleStart: 0.5,
      scaleEnd: 2,
      alphaStart: 1,
      alphaEnd: 0
    });
  },

  // Efecto de trampa activada
  trapActivated(x, y) {
    this.init();
    
    // Destellos morados
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 150;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        drag: 3,
        size: 5 + Math.random() * 5,
        color: '#a855f7',
        shape: 'star',
        life: 0,
        maxLife: 0.5 + Math.random() * 0.3,
        scaleStart: 1,
        scaleEnd: 0,
        alphaStart: 1,
        alphaEnd: 0,
        vr: (Math.random() - 0.5) * 10
      });
    }
    
    // Aura mística
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x, y,
        vx: 0, vy: 0,
        size: 20 + i * 10,
        color: '#c084fc',
        shape: 'ring',
        life: -i * 0.1,
        maxLife: 0.6,
        scaleStart: 0.5,
        scaleEnd: 2.5,
        alphaStart: 0.5,
        alphaEnd: 0
      });
    }
  },

  // Efecto de héroe derrotado
  heroDefeated(x, y, isEnemy = true) {
    if (this.enabled === false) return;
    this.init();
    
    const color = isEnemy ? '#ffd700' : '#ef4444';
    
    // Gran explosión
    this.impactExplosion(x, y, color, 1.5);
    
    // Fragmentos de carta
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 150 + Math.random() * 200;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 100,
        ay: 400,
        drag: 1,
        size: 8 + Math.random() * 8,
        color: color,
        life: 0,
        maxLife: 1 + Math.random() * 0.5,
        scaleStart: 1,
        scaleEnd: 0,
        alphaStart: 1,
        alphaEnd: 0,
        vr: (Math.random() - 0.5) * 15,
        rotation: Math.random() * Math.PI * 2
      });
    }
  },

  // Efecto de victoria
  victoryBurst(x, y) {
    if (this.enabled === false) return;
    this.init();
    
    // Explosión dorada masiva
    for (let wave = 0; wave < 3; wave++) {
      setTimeout(() => {
        for (let i = 0; i < 30; i++) {
          const angle = (Math.PI * 2 / 30) * i;
          const speed = 200 + Math.random() * 150;
          this.particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            drag: 2,
            size: 8 + Math.random() * 6,
            color: '#ffd700',
            shape: 'star',
            life: 0,
            maxLife: 1.5,
            scaleStart: 1,
            scaleEnd: 0,
            alphaStart: 1,
            alphaEnd: 0,
            vr: (Math.random() - 0.5) * 8
          });
        }
      }, wave * 200);
    }
    
    // Confeti
    for (let i = 0; i < 50; i++) {
      const colors = ['#ffd700', '#ff6b35', '#22c55e', '#3b82f6', '#a855f7'];
      this.particles.push({
        x: x + (Math.random() - 0.5) * 200,
        y: y - 50,
        vx: (Math.random() - 0.5) * 200,
        vy: -200 - Math.random() * 200,
        ay: 300,
        drag: 0.5,
        size: 6 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0,
        maxLife: 2 + Math.random(),
        alphaStart: 1,
        alphaEnd: 0,
        vr: (Math.random() - 0.5) * 15
      });
    }
  },

  // Efecto de habilidad especial (genérico)
  abilityEffect(x, y, abilityId) {
    this.init();
    
    const effects = {
      petrificar: () => this.petrifyEffect(x, y),
      electrocutar: () => this.lightningEffect(x, y),
      quemar: () => this.fireEffect(x, y),
      paralizar: () => this.paralyzeEffect(x, y),
      renacer: () => this.phoenixEffect(x, y),
      envenenar: () => this.poisonEffect(x, y)
    };
    
    if (effects[abilityId]) {
      effects[abilityId]();
    } else {
      this.genericAbilityEffect(x, y);
    }
  },

  // Efecto de petrificación (Medusa)
  petrifyEffect(x, y) {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 40;
      this.particles.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 20,
        vy: 20 + Math.random() * 40,
        drag: 2,
        size: 4 + Math.random() * 4,
        color: '#6b7280',
        life: 0,
        maxLife: 1 + Math.random() * 0.5,
        alphaStart: 1,
        alphaEnd: 0
      });
    }
  },

  // Efecto de rayo (Thor)
  lightningEffect(x, y) {
    // Rayo principal
    for (let i = 0; i < 5; i++) {
      const startY = y - 200;
      for (let j = 0; j < 8; j++) {
        this.particles.push({
          x: x + (Math.random() - 0.5) * 30,
          y: startY + j * 25,
          vx: (Math.random() - 0.5) * 100,
          vy: 0,
          size: 6 - j * 0.5,
          color: '#60a5fa',
          life: -i * 0.05,
          maxLife: 0.3,
          alphaStart: 1,
          alphaEnd: 0
        });
      }
    }
    
    // Flash de impacto
    this.impactExplosion(x, y, '#3b82f6', 0.8);
  },

  // Efecto de fuego (Lucifer)
  fireEffect(x, y) {
    for (let i = 0; i < 25; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + Math.random() * 20,
        vx: (Math.random() - 0.5) * 60,
        vy: -60 - Math.random() * 100,
        drag: 1,
        size: 8 + Math.random() * 8,
        color: i % 3 === 0 ? '#f97316' : (i % 3 === 1 ? '#ef4444' : '#fbbf24'),
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4,
        scaleStart: 1,
        scaleEnd: 0,
        alphaStart: 1,
        alphaEnd: 0
      });
    }
  },

  // Efecto de parálisis (Zeus)
  paralyzeEffect(x, y) {
    for (let wave = 0; wave < 3; wave++) {
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i + wave * 0.2;
        this.particles.push({
          x, y,
          vx: Math.cos(angle) * 80,
          vy: Math.sin(angle) * 80,
          drag: 2,
          size: 4,
          color: '#fde047',
          shape: 'spark',
          life: -wave * 0.1,
          maxLife: 0.5,
          alphaStart: 1,
          alphaEnd: 0
        });
      }
    }
  },

  // Efecto de Fénix (renacer)
  phoenixEffect(x, y) {
    // Llamas ascendentes
    for (let i = 0; i < 40; i++) {
      const offsetX = (Math.random() - 0.5) * 80;
      this.particles.push({
        x: x + offsetX,
        y: y + 40,
        vx: offsetX * 0.5,
        vy: -100 - Math.random() * 150,
        drag: 1,
        size: 10 + Math.random() * 10,
        color: i % 2 === 0 ? '#f97316' : '#fbbf24',
        life: Math.random() * 0.3,
        maxLife: 1 + Math.random() * 0.5,
        scaleStart: 1,
        scaleEnd: 0,
        alphaStart: 1,
        alphaEnd: 0
      });
    }
    
    // Alas de fuego
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 15; i++) {
        const angle = (side > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.8;
        this.particles.push({
          x: x + side * 20,
          y: y,
          vx: Math.cos(angle) * (100 + Math.random() * 80),
          vy: -50 + Math.sin(angle) * 50,
          drag: 2,
          size: 8 + Math.random() * 6,
          color: '#ef4444',
          life: 0,
          maxLife: 0.6,
          alphaStart: 1,
          alphaEnd: 0
        });
      }
    }
  },

  // Efecto de veneno (Hydra)
  poisonEffect(x, y) {
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 50,
        y: y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 40,
        vy: -30 - Math.random() * 50,
        drag: 1.5,
        size: 6 + Math.random() * 6,
        color: i % 2 === 0 ? '#22c55e' : '#16a34a',
        life: 0,
        maxLife: 0.8 + Math.random() * 0.4,
        scaleStart: 1,
        scaleEnd: 0.3,
        alphaStart: 0.8,
        alphaEnd: 0
      });
    }
  },

  // Efecto genérico de habilidad
  genericAbilityEffect(x, y) {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 80;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        drag: 2,
        size: 5 + Math.random() * 5,
        color: '#e8c547',
        shape: 'star',
        life: 0,
        maxLife: 0.6 + Math.random() * 0.3,
        scaleStart: 1,
        scaleEnd: 0,
        alphaStart: 1,
        alphaEnd: 0,
        vr: (Math.random() - 0.5) * 8
      });
    }
  },

  // Efecto de carta robada del mazo
  cardDrawEffect(startX, startY, endX, endY) {
    this.init();
    
    // Trail de partículas siguiendo el movimiento
    const duration = 0.3;
    const steps = 10;
    
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const x = startX + (endX - startX) * t;
      const y = startY + (endY - startY) * t;
      
      setTimeout(() => {
        for (let j = 0; j < 3; j++) {
          this.particles.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 30,
            vy: (Math.random() - 0.5) * 30,
            drag: 3,
            size: 3 + Math.random() * 3,
            color: '#e8c547',
            life: 0,
            maxLife: 0.3,
            alphaStart: 0.8,
            alphaEnd: 0
          });
        }
      }, (duration * 1000 / steps) * i);
    }
  },

  // Partículas de ambiente (fondo del tablero)
  startAmbientParticles() {
    this.init();
    
    this.ambientEmitter = {
      time: 0,
      duration: Infinity,
      rate: 3,
      accumulator: 0,
      once: false,
      spawn: () => {
        const side = Math.random() < 0.5;
        return {
          x: side ? -10 : window.innerWidth + 10,
          y: Math.random() * window.innerHeight,
          vx: (side ? 1 : -1) * (20 + Math.random() * 30),
          vy: (Math.random() - 0.5) * 20,
          size: 2 + Math.random() * 3,
          color: '#e8c547',
          life: 0,
          maxLife: 8 + Math.random() * 4,
          alphaStart: 0,
          alpha: 0,
          _fadeIn: true
        };
      }
    };
    
    // Override update para fade in/out del ambiente
    const originalUpdate = this.update.bind(this);
    this.update = (dt) => {
      originalUpdate(dt);
      for (const p of this.particles) {
        if (p._fadeIn !== undefined) {
          const lifeRatio = p.life / p.maxLife;
          if (lifeRatio < 0.1) {
            p.alpha = lifeRatio * 10 * 0.3;
          } else if (lifeRatio > 0.9) {
            p.alpha = (1 - lifeRatio) * 10 * 0.3;
          } else {
            p.alpha = 0.3;
          }
        }
      }
    };
    
    this.emitters.push(this.ambientEmitter);
  },

  stopAmbientParticles() {
    const idx = this.emitters.indexOf(this.ambientEmitter);
    if (idx !== -1) this.emitters.splice(idx, 1);
  },

  // Limpiar todo
  clear() {
    this.particles = [];
    this.emitters = [];
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
};

// Inicializar automáticamente cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ParticleSystem.init());
} else {
  ParticleSystem.init();
}
