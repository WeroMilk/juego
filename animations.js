/**
 * Dioses en Guerra - Sistema de Animaciones Premium
 * Animaciones nivel Pokemon Pocket / Riot Games
 */

const Animations = {
  // Estado del sistema
  screenShaking: false,
  floatingNumbers: [],
  
  // ==========================================
  // SCREEN SHAKE - Impacto visual dramático
  // ==========================================
  
  screenShake(intensity = 10, duration = 300, decay = true) {
    if (this.screenShaking) return;
    this.screenShaking = true;
    
    const gameScreen = document.getElementById('game-screen');
    if (!gameScreen) {
      this.screenShaking = false;
      return;
    }
    
    const startTime = performance.now();
    const originalTransform = gameScreen.style.transform;
    
    const shake = () => {
      const elapsed = performance.now() - startTime;
      if (elapsed >= duration) {
        gameScreen.style.transform = originalTransform;
        this.screenShaking = false;
        return;
      }
      
      const progress = elapsed / duration;
      const currentIntensity = decay ? intensity * (1 - progress) : intensity;
      
      const offsetX = (Math.random() - 0.5) * 2 * currentIntensity;
      const offsetY = (Math.random() - 0.5) * 2 * currentIntensity;
      const rotation = (Math.random() - 0.5) * currentIntensity * 0.1;
      
      gameScreen.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg)`;
      
      requestAnimationFrame(shake);
    };
    
    requestAnimationFrame(shake);
  },

  // Shake moderado para momentos críticos (sin que tiemblé todo)
  heavyScreenShake() {
    this.screenShake(6, 250, true);
  },

  // Shake muy suave para feedback (casi imperceptible)
  lightScreenShake() {
    this.screenShake(2, 80, true);
  },

  // ==========================================
  // NÚMEROS FLOTANTES DE DAÑO
  // ==========================================
  
  showFloatingNumber(x, y, value, type = 'damage') {
    const container = document.getElementById('floating-numbers-container') || this.createFloatingContainer();
    
    const el = document.createElement('div');
    el.className = `floating-number floating-${type}`;
    
    // Diferentes estilos según tipo
    const styles = {
      damage: { prefix: '-', color: '#ef4444', scale: 1 },
      critical: { prefix: '-', color: '#ff0000', scale: 1.5, extra: 'CRÍTICO!' },
      heal: { prefix: '+', color: '#22c55e', scale: 1 },
      block: { prefix: '', color: '#f59e0b', scale: 0.9, extra: 'BLOQUEADO' },
      energy: { prefix: '+', color: '#fbbf24', scale: 0.8, suffix: '⚡' }
    };
    
    const style = styles[type] || styles.damage;
    
    el.innerHTML = `
      <span class="floating-value">${style.prefix}${value}${style.suffix || ''}</span>
      ${style.extra ? `<span class="floating-extra">${style.extra}</span>` : ''}
    `;
    
    el.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      color: ${style.color};
      font-family: 'Cinzel', Georgia, serif;
      font-size: ${24 * style.scale}px;
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(0,0,0,0.8), 0 0 20px ${style.color}40;
      pointer-events: none;
      z-index: 2000;
      transform: translate(-50%, -50%) scale(0);
      opacity: 0;
      white-space: nowrap;
      text-align: center;
    `;
    
    container.appendChild(el);
    
    // Animación de entrada
    requestAnimationFrame(() => {
      el.style.transition = 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)';
      el.style.transform = 'translate(-50%, -50%) scale(1.2)';
      el.style.opacity = '1';
      
      setTimeout(() => {
        el.style.transition = 'all 0.8s ease-out';
        el.style.transform = 'translate(-50%, -100%) scale(0.8)';
        el.style.opacity = '0';
        
        setTimeout(() => el.remove(), 800);
      }, 200);
    });
  },

  createFloatingContainer() {
    const container = document.createElement('div');
    container.id = 'floating-numbers-container';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 2000;
      overflow: hidden;
    `;
    document.body.appendChild(container);
    return container;
  },

  // ==========================================
  // ANIMACIONES DE CARTAS 3D
  // ==========================================
  
  // Efecto de volteo 3D de carta
  flipCard(element, callback) {
    if (!element) {
      if (callback) callback();
      return;
    }
    
    element.style.transition = 'transform 0.4s ease-in-out';
    element.style.transformStyle = 'preserve-3d';
    element.style.transform = 'rotateY(90deg) scale(0.9)';
    
    setTimeout(() => {
      if (callback) callback();
      element.style.transform = 'rotateY(0deg) scale(1)';
      
      setTimeout(() => {
        element.style.transition = '';
        element.style.transform = '';
      }, 400);
    }, 200);
  },

  // Carta siendo jugada (de mano al campo)
  cardPlayed(element, targetX, targetY, callback) {
    if (!element) {
      if (callback) callback();
      return;
    }
    
    const rect = element.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    
    // Clonar para animación
    const clone = element.cloneNode(true);
    clone.style.cssText = `
      position: fixed;
      left: ${startX}px;
      top: ${startY}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      transform: translate(-50%, -50%);
      z-index: 1500;
      pointer-events: none;
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      box-shadow: 0 10px 40px rgba(0,0,0,0.5), 0 0 30px rgba(232, 197, 71, 0.3);
    `;
    document.body.appendChild(clone);
    
    // Ocultar original temporalmente
    element.style.opacity = '0';
    
    requestAnimationFrame(() => {
      clone.style.left = targetX + 'px';
      clone.style.top = targetY + 'px';
      clone.style.transform = 'translate(-50%, -50%) scale(1.1) rotateZ(5deg)';
      
      setTimeout(() => {
        clone.style.transform = 'translate(-50%, -50%) scale(1) rotateZ(0deg)';
        
        setTimeout(() => {
          clone.remove();
          element.style.opacity = '';
          if (callback) callback();
        }, 200);
      }, 300);
    });
  },

  // Hover premium con perspectiva 3D
  setupCard3DHover(element) {
    if (!element) return;
    
    const handleMouseMove = (e) => {
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = (y - centerY) / centerY * -15;
      const rotateY = (x - centerX) / centerX * 15;
      
      element.style.transform = `perspective(500px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
      
      // Efecto de brillo siguiendo el cursor
      const shine = element.querySelector('.card-shine') || this.createShineElement(element);
      const shineX = (x / rect.width) * 100;
      const shineY = (y / rect.height) * 100;
      shine.style.background = `radial-gradient(circle at ${shineX}% ${shineY}%, rgba(255,255,255,0.3) 0%, transparent 50%)`;
    };
    
    const handleMouseLeave = () => {
      element.style.transform = '';
      const shine = element.querySelector('.card-shine');
      if (shine) shine.style.background = 'transparent';
    };
    
    element.style.transition = 'transform 0.15s ease-out';
    element.style.transformStyle = 'preserve-3d';
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);
    
    // Guardar referencia para cleanup
    element._hover3DHandlers = { handleMouseMove, handleMouseLeave };
  },

  createShineElement(parent) {
    const shine = document.createElement('div');
    shine.className = 'card-shine';
    shine.style.cssText = `
      position: absolute;
      inset: 0;
      border-radius: inherit;
      pointer-events: none;
      z-index: 10;
    `;
    parent.style.position = 'relative';
    parent.appendChild(shine);
    return shine;
  },

  // ==========================================
  // ANIMACIONES DE ATAQUE
  // ==========================================
  
  // Ataque con lunge (embestida) hacia el objetivo
  attackLunge(attackerEl, defenderEl, callback) {
    if (!attackerEl || !defenderEl) {
      if (callback) callback();
      return;
    }
    
    const attackerRect = attackerEl.getBoundingClientRect();
    const defenderRect = defenderEl.getBoundingClientRect();
    
    // Calcular dirección del ataque
    const dx = defenderRect.left - attackerRect.left;
    const dy = defenderRect.top - attackerRect.top;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const lungeDistance = Math.min(distance * 0.4, 80);
    const lungeX = (dx / distance) * lungeDistance;
    const lungeY = (dy / distance) * lungeDistance;
    
    // Fase 1: Preparación (retroceso)
    attackerEl.style.transition = 'transform 0.15s ease-out';
    attackerEl.style.transform = `translate(${-lungeX * 0.2}px, ${-lungeY * 0.2}px) scale(1.1)`;
    
    setTimeout(() => {
      // Fase 2: Lunge hacia adelante
      attackerEl.style.transition = 'transform 0.1s ease-in';
      attackerEl.style.transform = `translate(${lungeX}px, ${lungeY}px) scale(1.05)`;
      
      setTimeout(() => {
        // Impacto (shake suave para no hacer temblar toda la pantalla)
        this.screenShake(4, 120, true);
        
        // Obtener posición del centro del defensor
        const impactX = defenderRect.left + defenderRect.width / 2;
        const impactY = defenderRect.top + defenderRect.height / 2;
        
        // Partículas de impacto
        if (typeof ParticleSystem !== 'undefined') {
          ParticleSystem.impactExplosion(impactX, impactY, '#ff6b35', 1);
        }
        
        // Fase 3: Retorno
        attackerEl.style.transition = 'transform 0.2s ease-out';
        attackerEl.style.transform = '';
        
        if (callback) callback();
      }, 100);
    }, 150);
  },

  // Animación de recibir daño mejorada
  receiveDamage(element, damage, callback) {
    if (!element) {
      if (callback) callback();
      return;
    }
    
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Mostrar número de daño
    this.showFloatingNumber(centerX, centerY - 20, damage, damage >= 5 ? 'critical' : 'damage');
    
    // Efecto visual en el elemento
    element.classList.add('damage-flash');
    
    // Shake suave del elemento (solo la carta, sin exagerar)
    const originalTransform = element.style.transform;
    let shakeCount = 0;
    const maxShakes = 3;
    
    const doShake = () => {
      if (shakeCount >= maxShakes) {
        element.style.transform = originalTransform;
        element.classList.remove('damage-flash');
        if (callback) callback();
        return;
      }
      
      const intensity = 3 * (1 - shakeCount / maxShakes);
      const offsetX = (Math.random() - 0.5) * 2 * intensity;
      const offsetY = (Math.random() - 0.5) * 2 * intensity;
      element.style.transform = `${originalTransform} translate(${offsetX}px, ${offsetY}px)`;
      
      shakeCount++;
      requestAnimationFrame(() => setTimeout(doShake, 50));
    };
    
    doShake();
  },

  // ==========================================
  // ANIMACIONES DE ESTADO
  // ==========================================
  
  // Efecto de entrada de héroe
  heroEnter(element, callback) {
    if (!element) {
      if (callback) callback();
      return;
    }
    
    element.style.opacity = '0';
    element.style.transform = 'scale(0.5) rotateY(-180deg)';
    element.style.transition = 'none';
    
    requestAnimationFrame(() => {
      element.style.transition = 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
      element.style.opacity = '1';
      element.style.transform = 'scale(1) rotateY(0deg)';
      
      // Partículas de entrada
      const rect = element.getBoundingClientRect();
      if (typeof ParticleSystem !== 'undefined') {
        ParticleSystem.energyPlaced(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2
        );
      }
      
      setTimeout(() => {
        element.style.transition = '';
        element.style.transform = '';
        if (callback) callback();
      }, 500);
    });
  },

  // Efecto de muerte de héroe
  heroDeath(element, isEnemy = true, callback) {
    if (!element) {
      if (callback) callback();
      return;
    }
    
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Screen shake fuerte
    this.heavyScreenShake();
    
    // Partículas de derrota
    if (typeof ParticleSystem !== 'undefined') {
      ParticleSystem.heroDefeated(centerX, centerY, isEnemy);
    }
    
    // Flash blanco momentáneo
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      inset: 0;
      background: white;
      opacity: 0;
      pointer-events: none;
      z-index: 3000;
      transition: opacity 0.1s ease-out;
    `;
    document.body.appendChild(flash);
    
    requestAnimationFrame(() => {
      flash.style.opacity = '0.5';
      setTimeout(() => {
        flash.style.opacity = '0';
        setTimeout(() => flash.remove(), 100);
      }, 100);
    });
    
    // Animación del elemento
    element.style.transition = 'all 0.4s ease-in';
    element.style.transform = 'scale(1.2)';
    element.style.filter = 'brightness(2) saturate(0)';
    
    setTimeout(() => {
      element.style.transform = 'scale(0) rotate(180deg)';
      element.style.opacity = '0';
      
      setTimeout(() => {
        element.style.transition = '';
        element.style.transform = '';
        element.style.filter = '';
        element.style.opacity = '';
        if (callback) callback();
      }, 400);
    }, 200);
  },

  // ==========================================
  // ANIMACIONES DE TURNO
  // ==========================================
  
  // Indicador de inicio de turno
  turnStart(isPlayerTurn) {
    const indicator = document.createElement('div');
    indicator.className = 'turn-indicator-overlay';
    indicator.innerHTML = `
      <div class="turn-indicator-content">
        <span class="turn-indicator-text">${isPlayerTurn ? '¡TU TURNO!' : 'TURNO RIVAL'}</span>
      </div>
    `;
    indicator.style.cssText = `
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 100%);
      z-index: 2500;
      opacity: 0;
      pointer-events: none;
    `;
    
    const content = indicator.querySelector('.turn-indicator-content');
    content.style.cssText = `
      transform: scale(0.5);
      opacity: 0;
    `;
    
    const text = indicator.querySelector('.turn-indicator-text');
    text.style.cssText = `
      font-family: 'Cinzel Decorative', Georgia, serif;
      font-size: clamp(2rem, 6vw, 4rem);
      font-weight: 700;
      color: ${isPlayerTurn ? '#ffd700' : '#ef4444'};
      text-shadow: 0 4px 20px ${isPlayerTurn ? 'rgba(255, 215, 0, 0.5)' : 'rgba(239, 68, 68, 0.5)'}, 
                   0 2px 4px rgba(0,0,0,0.8);
      letter-spacing: 0.1em;
    `;
    
    document.body.appendChild(indicator);
    
    // Animación de entrada
    requestAnimationFrame(() => {
      indicator.style.transition = 'opacity 0.2s ease-out';
      indicator.style.opacity = '1';
      
      content.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
      content.style.transform = 'scale(1)';
      content.style.opacity = '1';
      
      // Partículas
      if (typeof ParticleSystem !== 'undefined') {
        const color = isPlayerTurn ? '#ffd700' : '#ef4444';
        for (let i = 0; i < 20; i++) {
          setTimeout(() => {
            ParticleSystem.particles.push({
              x: window.innerWidth / 2 + (Math.random() - 0.5) * 300,
              y: window.innerHeight / 2 + (Math.random() - 0.5) * 100,
              vx: (Math.random() - 0.5) * 200,
              vy: -100 - Math.random() * 100,
              drag: 2,
              size: 4 + Math.random() * 4,
              color: color,
              shape: 'star',
              life: 0,
              maxLife: 1,
              scaleStart: 1,
              scaleEnd: 0,
              alphaStart: 1,
              alphaEnd: 0,
              vr: (Math.random() - 0.5) * 10
            });
          }, i * 30);
        }
      }
      
      // Salida
      setTimeout(() => {
        indicator.style.transition = 'opacity 0.3s ease-in';
        indicator.style.opacity = '0';
        
        setTimeout(() => indicator.remove(), 300);
      }, 1200);
    });
  },

  // ==========================================
  // ANIMACIÓN DE VICTORIA/DERROTA
  // ==========================================
  
  victoryAnimation(callback) {
    // Partículas de victoria
    if (typeof ParticleSystem !== 'undefined') {
      ParticleSystem.victoryBurst(window.innerWidth / 2, window.innerHeight / 2);
    }
    
    // Slow motion effect momentáneo
    document.body.style.transition = 'filter 0.5s ease-out';
    document.body.style.filter = 'saturate(1.5) brightness(1.1)';
    
    setTimeout(() => {
      document.body.style.filter = '';
      setTimeout(() => {
        document.body.style.transition = '';
        if (callback) callback();
      }, 500);
    }, 2000);
  },

  defeatAnimation(callback) {
    // Efecto de desaturación
    document.body.style.transition = 'filter 1s ease-out';
    document.body.style.filter = 'saturate(0.3) brightness(0.7)';
    
    this.heavyScreenShake();
    
    setTimeout(() => {
      document.body.style.filter = '';
      setTimeout(() => {
        document.body.style.transition = '';
        if (callback) callback();
      }, 500);
    }, 2000);
  },

  // ==========================================
  // LÍNEAS DE VELOCIDAD (SPEED LINES)
  // ==========================================
  
  showSpeedLines(direction = 'horizontal', duration = 300) {
    const container = document.createElement('div');
    container.className = 'speed-lines-container';
    container.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 1500;
      overflow: hidden;
      opacity: 0;
    `;
    
    // Crear líneas
    const lineCount = 20;
    for (let i = 0; i < lineCount; i++) {
      const line = document.createElement('div');
      const isHorizontal = direction === 'horizontal';
      const pos = Math.random() * 100;
      const length = 100 + Math.random() * 200;
      const thickness = 1 + Math.random() * 3;
      
      line.style.cssText = `
        position: absolute;
        ${isHorizontal ? 'top' : 'left'}: ${pos}%;
        ${isHorizontal ? 'left' : 'top'}: -${length}px;
        ${isHorizontal ? 'width' : 'height'}: ${length}px;
        ${isHorizontal ? 'height' : 'width'}: ${thickness}px;
        background: linear-gradient(${isHorizontal ? '90deg' : '180deg'}, transparent, rgba(255,255,255,0.8), transparent);
        animation: speedLine ${duration}ms linear forwards;
        animation-delay: ${Math.random() * 100}ms;
      `;
      
      container.appendChild(line);
    }
    
    // Añadir keyframes si no existen
    if (!document.querySelector('#speed-line-styles')) {
      const style = document.createElement('style');
      style.id = 'speed-line-styles';
      style.textContent = `
        @keyframes speedLine {
          0% { transform: translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(calc(100vw + 300px)); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(container);
    
    requestAnimationFrame(() => {
      container.style.opacity = '1';
    });
    
    setTimeout(() => container.remove(), duration + 200);
  },

  // ==========================================
  // EFECTOS DE ZOOM DRAMÁTICO
  // ==========================================
  
  dramaticZoom(targetElement, callback) {
    if (!targetElement) {
      if (callback) callback();
      return;
    }
    
    const rect = targetElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const gameScreen = document.getElementById('game-screen');
    if (!gameScreen) {
      if (callback) callback();
      return;
    }
    
    const offsetX = window.innerWidth / 2 - centerX;
    const offsetY = window.innerHeight / 2 - centerY;
    
    // Zoom in
    gameScreen.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
    gameScreen.style.transformOrigin = `${centerX}px ${centerY}px`;
    gameScreen.style.transform = `scale(1.3) translate(${offsetX * 0.1}px, ${offsetY * 0.1}px)`;
    
    // Vignette effect
    const vignette = document.createElement('div');
    vignette.style.cssText = `
      position: fixed;
      inset: 0;
      background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%);
      pointer-events: none;
      z-index: 1400;
      opacity: 0;
      transition: opacity 0.3s ease-out;
    `;
    document.body.appendChild(vignette);
    
    requestAnimationFrame(() => {
      vignette.style.opacity = '1';
    });
    
    setTimeout(() => {
      // Zoom out
      gameScreen.style.transform = '';
      vignette.style.opacity = '0';
      
      setTimeout(() => {
        gameScreen.style.transition = '';
        gameScreen.style.transformOrigin = '';
        vignette.remove();
        if (callback) callback();
      }, 400);
    }, 800);
  },

  // ==========================================
  // UTILIDADES
  // ==========================================
  
  // Obtener centro de un elemento
  getElementCenter(element) {
    if (!element) return { x: 0, y: 0 };
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  },

  // Aplicar hover 3D a todas las cartas
  setupAllCards3D() {
    document.querySelectorAll('.hero-slot, .hand-slot, .hidden-slot').forEach(el => {
      this.setupCard3DHover(el);
    });
  },

  // Cleanup
  cleanup() {
    document.querySelectorAll('.hero-slot, .hand-slot, .hidden-slot').forEach(el => {
      if (el._hover3DHandlers) {
        el.removeEventListener('mousemove', el._hover3DHandlers.handleMouseMove);
        el.removeEventListener('mouseleave', el._hover3DHandlers.handleMouseLeave);
        delete el._hover3DHandlers;
      }
    });
  }
};

// Estilos adicionales para animaciones
const animationStyles = document.createElement('style');
animationStyles.textContent = `
  .damage-flash {
    animation: damageFlashAnim 0.3s ease-out;
  }
  
  @keyframes damageFlashAnim {
    0%, 100% { filter: brightness(1); }
    25% { filter: brightness(2) saturate(2); }
    50% { filter: brightness(0.8) hue-rotate(10deg); }
  }
  
  .card-shine {
    transition: background 0.1s ease-out;
  }
  
  .floating-number {
    animation: floatUp 1s ease-out forwards;
  }
  
  @keyframes floatUp {
    0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
    20% { transform: translate(-50%, -60%) scale(1.2); opacity: 1; }
    100% { transform: translate(-50%, -120%) scale(0.8); opacity: 0; }
  }
  
  .floating-extra {
    display: block;
    font-size: 0.6em;
    letter-spacing: 0.1em;
  }
`;
document.head.appendChild(animationStyles);
