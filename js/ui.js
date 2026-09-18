export class UI {
  constructor() {
    this.currentView = 'food';
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.routes = ['food', 'weight', 'calendar', 'workouts', 'agenda', 'settings'];
  }
  
  init() {
    this.initGestures();
    this.initRippleEffect();
    this.initScrollReveal();
    this.initCardTilt();
  }
  
  // === TOASTS ===
  showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Paleta de colores base
    const bgColors = {
      success: '#4ecdc4',
      error: '#ff6b6b',
      info: '#333'
    };

    toast.style.cssText = `
      background: ${bgColors[type] || bgColors.info};
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-size: 14px;
      font-weight: 500;
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      position: relative;
      overflow: hidden;
      min-width: 200px;
      text-align: center;
    `;
    
    // Barra de progreso animada
    const progress = document.createElement('div');
    progress.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      background: rgba(255,255,255,0.7);
      width: 100%;
      transition: width ${duration}ms linear;
    `;
    
    toast.textContent = message;
    toast.appendChild(progress);
    container.appendChild(toast);
    
    // Vibración
    this.haptic(type === 'error' ? 'error' : type === 'success' ? 'success' : 'light');
    
    // Animación de entrada
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
      requestAnimationFrame(() => {
        progress.style.width = '0%';
      });
    });
    
    // Autocierre
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-20px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
  
  // === HAPTIC FEEDBACK ===
  haptic(type = 'light') {
    if (!navigator.vibrate) return;
    
    const patterns = {
      light: [10],
      medium: [20],
      success: [10, 50, 20],
      error: [30, 30, 30]
    };
    
    navigator.vibrate(patterns[type] || patterns.light);
  }
  
  // === CONFETTI ===
  async celebrate() {
    try {
      if (!window.confetti) {
        // Cargar script dinámicamente si no está presente
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
        document.head.appendChild(script);
        await new Promise((resolve) => script.onload = resolve);
      }
      
      const duration = 2500;
      const end = Date.now() + duration;
      const colors = ['#4ecdc4', '#ffe66d', '#ff6b6b']; 

      (function frame() {
        window.confetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors
        });
        window.confetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
      
      this.haptic('success');
    } catch (e) {
      console.error("Error al mostrar confeti:", e);
    }
  }
  
  // === GESTURES ===
  initGestures() {
    const container = document.getElementById('views-container') || document.body;
    
    container.addEventListener('touchstart', (e) => {
      this.touchStartX = e.changedTouches[0].screenX;
      this.touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    
    container.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].screenX;
      const touchEndY = e.changedTouches[0].screenY;
      
      const deltaX = touchEndX - this.touchStartX;
      const deltaY = Math.abs(touchEndY - this.touchStartY);
      
      // Umbral de 50px y prioridad al eje X
      if (Math.abs(deltaX) > 50 && deltaY < 50) {
        const currentIndex = this.routes.indexOf(this.currentView);
        if (currentIndex === -1) return;
        
        if (deltaX > 0 && currentIndex > 0) {
          // Swipe derecha: vista anterior
          window.app?.navigateTo(this.routes[currentIndex - 1]);
        } else if (deltaX < 0 && currentIndex < this.routes.length - 1) {
          // Swipe izquierda: vista siguiente
          window.app?.navigateTo(this.routes[currentIndex + 1]);
        }
      }
    }, { passive: true });
  }
  
  // === RIPPLE EFFECT ===
  initRippleEffect() {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('.btn, .nav-item');
      if (!target) return;
      
      const rect = target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.cssText = `
        position: absolute;
        background: rgba(255, 255, 255, 0.4);
        border-radius: 50%;
        pointer-events: none;
        width: 100px;
        height: 100px;
        left: ${x - 50}px;
        top: ${y - 50}px;
        transform: scale(0);
        animation: rippleAnim 0.6s linear;
      `;
      
      // Aseguramos overflow hidden
      const computedStyle = window.getComputedStyle(target);
      if (computedStyle.position === 'static') {
        target.style.position = 'relative';
      }
      target.style.overflow = 'hidden';
      
      // Keyframes
      if (!document.getElementById('ripple-styles')) {
        const style = document.createElement('style');
        style.id = 'ripple-styles';
        style.textContent = `@keyframes rippleAnim { to { transform: scale(4); opacity: 0; } }`;
        document.head.appendChild(style);
      }
      
      target.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  }
  
  // === SCROLL REVEAL ===
  initScrollReveal() {
    if (!('IntersectionObserver' in window)) return;
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('revealed');
          }, index * 100); // Efecto cascada
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    
    document.querySelectorAll('.reveal-item').forEach(el => observer.observe(el));
  }
  
  // === 3D CARD TILT ===
  initCardTilt() {
    // Solo escritorio (no touch)
    if (window.matchMedia('(pointer: coarse)').matches) return;
    
    document.querySelectorAll('.glass-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = ((y - centerY) / centerY) * -6; 
        const rotateY = ((x - centerX) / centerX) * 6;
        
        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        card.style.transition = 'none';
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(800px) rotateX(0) rotateY(0)';
        card.style.transition = 'transform 0.5s ease';
      });
    });
  }
  
  // === LOADING STATES ===
  showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.setAttribute('data-original-html', container.innerHTML);
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:15px;padding:20px;">
        <div style="height:24px;width:50%;border-radius:4px;background:linear-gradient(90deg,#eee,#f5f5f5,#eee);background-size:200% 100%;animation:pulse 1.5s infinite"></div>
        <div style="height:80px;width:100%;border-radius:12px;background:linear-gradient(90deg,#eee,#f5f5f5,#eee);background-size:200% 100%;animation:pulse 1.5s infinite"></div>
      </div>
    `;
    
    if (!document.getElementById('loading-styles')) {
      const style = document.createElement('style');
      style.id = 'loading-styles';
      style.textContent = `@keyframes pulse { 0% {background-position:200% 0;} 100% {background-position:-200% 0;} }`;
      document.head.appendChild(style);
    }
  }
  
  hideLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container && container.hasAttribute('data-original-html')) {
      container.innerHTML = container.getAttribute('data-original-html');
      container.removeAttribute('data-original-html');
    }
  }
  
  // === MODAL ===
  showModal(contentHTML) {
    let container = document.getElementById('modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'modal-container';
      container.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
        z-index: 1000; display: flex; align-items: center; justify-content: center;
        opacity: 0; transition: opacity 0.3s ease;
      `;
      
      const modal = document.createElement('div');
      modal.id = 'modal-body';
      modal.className = 'glass-card';
      modal.style.cssText = `
        background: white; border-radius: 16px; padding: 24px;
        width: 90%; max-width: 450px; max-height: 90vh; overflow-y: auto;
        transform: scale(0.9); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      `;
      
      container.appendChild(modal);
      document.body.appendChild(container);
      
      // Cerrar al click fuera
      container.addEventListener('click', (e) => {
        if (e.target === container) this.hideModal();
      });
      // Cerrar con Escape
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.hideModal();
      });
    }
    
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
      <button onclick="window.app.ui.hideModal()" style="position:absolute;top:15px;right:15px;background:none;border:none;font-size:24px;cursor:pointer;color:#666">&times;</button>
      ${contentHTML}
    `;
    
    container.style.display = 'flex';
    void container.offsetWidth; // Force reflow
    container.style.opacity = '1';
    modalBody.style.transform = 'scale(1)';
  }
  
  hideModal() {
    const container = document.getElementById('modal-container');
    const modalBody = document.getElementById('modal-body');
    if (container && modalBody) {
      container.style.opacity = '0';
      modalBody.style.transform = 'scale(0.9)';
      setTimeout(() => container.style.display = 'none', 300);
    }
  }
  
  // === COUNTUP ANIMATION ===
  animateNumber(element, target, duration = 1000, decimals = 0) {
    if (!element) return;
    
    const startText = element.textContent.replace(/[^0-9.-]+/g, "");
    const start = parseFloat(startText) || 0;
    const change = target - start;
    const startTime = performance.now();
    
    // Ease-out
    const easeOutExpo = (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const currentVal = start + (change * easeOutExpo(progress));
      element.textContent = this.formatNumber(currentVal, decimals);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        element.textContent = this.formatNumber(target, decimals);
      }
    };
    
    requestAnimationFrame(animate);
  }
  
  // === SLIDE PANEL ===
  showPanel(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    
    panel.style.display = 'block';
    panel.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    
    let overlay = document.getElementById('panel-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'panel-overlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99;opacity:0;transition:opacity 0.3s;display:none;';
      document.body.appendChild(overlay);
      overlay.addEventListener('click', () => this.hidePanel(panelId));
    }
    
    overlay.style.display = 'block';
    
    requestAnimationFrame(() => {
      panel.style.transform = 'translateY(-100%)';
      overlay.style.opacity = '1';
    });
  }
  
  hidePanel(panelId) {
    const panel = document.getElementById(panelId);
    const overlay = document.getElementById('panel-overlay');
    
    if (panel) {
      panel.style.transform = 'translateY(0)';
      setTimeout(() => panel.style.display = 'none', 400);
    }
    
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.style.display = 'none', 300);
    }
  }
  
  // === FORMAT HELPERS ===
  formatDate(date, format = 'short') {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const locale = 'es-ES';
    if (format === 'short') {
      return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
    } else if (format === 'long') {
      return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    } else if (format === 'iso') {
      return d.toISOString().split('T')[0];
    }
    return d.toLocaleDateString(locale);
  }
  
  formatTime(timeString) {
    const d = new Date(timeString);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    return timeString;
  }
  
  formatNumber(num, decimals = 0) {
    return Number(num).toLocaleString('es-ES', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }
  
  // === MACRO RING SVG ===
  createMacroRings(protein, carbs, fat, calories, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Valores de ejemplo para el máximo diario (se deberían leer de los settings)
    const goals = { protein: 150, carbs: 200, fat: 70 };
    
    const size = 180;
    const center = size / 2;
    
    const rings = [
      { name: 'carbs', color: '#ffe66d', radius: 75, val: carbs, max: goals.carbs },
      { name: 'protein', color: '#4ecdc4', radius: 60, val: protein, max: goals.protein },
      { name: 'fat', color: '#ff6b6b', radius: 45, val: fat, max: goals.fat }
    ];
    
    const getDashOffset = (val, max, circumference) => {
      const pct = Math.min(val / max, 1);
      return circumference - (pct * circumference);
    };
    
    let svg = `<svg width="100%" height="100%" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);">`;
    
    rings.forEach(ring => {
      const circumference = 2 * Math.PI * ring.radius;
      const offset = getDashOffset(ring.val, ring.max, circumference);
      
      // Fondo del anillo
      svg += `<circle cx="${center}" cy="${center}" r="${ring.radius}" fill="none" stroke="${ring.color}" stroke-width="10" opacity="0.2" />`;
      // Progreso
      svg += `<circle cx="${center}" cy="${center}" r="${ring.radius}" fill="none" stroke="${ring.color}" stroke-width="10" 
               stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}" stroke-linecap="round" 
               style="transition: stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1);" 
               class="macro-ring" data-offset="${offset}" />`;
    });
    
    svg += `</svg>`;
    
    const centerHTML = `
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;">
        <div style="font-size:22px;font-weight:bold;" id="${containerId}-cals">0</div>
        <div style="font-size:12px;opacity:0.7;">Kcal</div>
      </div>
    `;
    
    container.style.position = 'relative';
    container.style.width = `${size}px`;
    container.style.height = `${size}px`;
    container.style.margin = '0 auto';
    container.innerHTML = svg + centerHTML;
    
    // Animar
    requestAnimationFrame(() => {
      container.querySelectorAll('.macro-ring').forEach(circle => {
        circle.style.strokeDashoffset = circle.getAttribute('data-offset');
      });
      this.animateNumber(document.getElementById(`${containerId}-cals`), calories, 1500, 0);
    });
  }
}
