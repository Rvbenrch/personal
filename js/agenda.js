export class Agenda {
  constructor(db, ui) {
    this.db = db;
    this.ui = ui;
    this.currentDate = new Date(); // Día mostrado en la agenda
    this.events = []; // Eventos del día seleccionado
    this.timeIndicatorInterval = null; // Intervalo para actualizar la línea de tiempo

    // Variables para el gesto táctil (swipe)
    this.touchStartX = 0;
    this.touchEndX = 0;

    // Días y meses en español
    this.dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    this.monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    // Altura base de cada hora en píxeles (60px = 60 minutos)
    this.HOUR_HEIGHT = 60;
    this.START_HOUR = 6; // Empieza a las 06:00
  }

  /**
   * Inicializa la vista de agenda
   */
  async init() {
    this.setupEventListeners();
    this.setupTimeline();
    this.startTimeIndicator();
    await this.loadDayEvents();
    this.updateDateLabel();
    this.scrollToCurrentTime();
  }

  /**
   * Configura los event listeners para la interfaz
   */
  setupEventListeners() {
    // Navegación de días
    const btnPrev = document.getElementById('btn-prev-day');
    const btnNext = document.getElementById('btn-next-day');
    const btnToday = document.getElementById('btn-agenda-today');

    if (btnPrev) btnPrev.addEventListener('click', () => this.changeDay(-1));
    if (btnNext) btnNext.addEventListener('click', () => this.changeDay(1));
    if (btnToday) btnToday.addEventListener('click', () => {
      this.currentDate = new Date();
      this.refreshDay();
    });

    // Swipe para cambiar de día
    const timelineContainer = document.getElementById('agenda-timeline-container');
    if (timelineContainer) {
      timelineContainer.addEventListener('touchstart', (e) => {
        this.touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });
      timelineContainer.addEventListener('touchend', (e) => {
        this.touchEndX = e.changedTouches[0].screenX;
        this.handleSwipe();
      }, { passive: true });
    }

    // Modal de eventos
    const btnAddEvent = document.getElementById('btn-add-event');
    const btnSaveEvent = document.getElementById('btn-save-event');
    const btnDeleteEvent = document.getElementById('btn-delete-event');

    if (btnAddEvent) btnAddEvent.addEventListener('click', () => this.openEventModal());
    if (btnSaveEvent) btnSaveEvent.addEventListener('click', () => this.saveEvent());
    if (btnDeleteEvent) btnDeleteEvent.addEventListener('click', () => this.deleteEvent());
  }

  /**
   * Maneja gestos táctiles para la navegación
   */
  handleSwipe() {
    const threshold = 50;
    if (this.touchStartX - this.touchEndX > threshold) {
      this.changeDay(1); // Swipe izquierda: siguiente día
    } else if (this.touchEndX - this.touchStartX > threshold) {
      this.changeDay(-1); // Swipe derecha: día anterior
    }
  }

  /**
   * Genera el DOM base para la línea de tiempo (timeline) de 06:00 a 23:00
   */
  setupTimeline() {
    const timeline = document.getElementById('agenda-timeline');
    if (!timeline) return;
    
    timeline.innerHTML = '';
    timeline.style.position = 'relative';

    for (let hour = this.START_HOUR; hour <= 23; hour++) {
      const slot = document.createElement('div');
      slot.className = 'time-slot flex relative border-b border-gray-100 dark:border-gray-800';
      slot.style.height = `${this.HOUR_HEIGHT}px`;
      
      // Etiqueta de la hora
      const label = document.createElement('div');
      label.className = 'w-16 text-xs text-gray-400 font-medium text-right pr-3 pt-2';
      label.textContent = `${String(hour).padStart(2, '0')}:00`;
      
      // Línea divisoria suave para los 30 mins (opcional mediante CSS o background)
      const gridLine = document.createElement('div');
      gridLine.className = 'flex-1 relative cursor-pointer active:bg-gray-50 dark:active:bg-gray-800';
      
      // Al hacer clic en un slot vacío, abrir el modal con la hora preseleccionada
      gridLine.addEventListener('click', () => {
        this.openEventModal({
          startTime: `${String(hour).padStart(2, '0')}:00`,
          date: this.formatDateISO(this.currentDate)
        });
      });

      slot.appendChild(label);
      slot.appendChild(gridLine);
      timeline.appendChild(slot);
    }
  }

  /**
   * Inicia o detiene el indicador de tiempo actual (la línea roja)
   */
  startTimeIndicator() {
    this.updateTimeIndicatorPosition();
    // Actualizar la posición cada minuto
    if (this.timeIndicatorInterval) clearInterval(this.timeIndicatorInterval);
    this.timeIndicatorInterval = setInterval(() => this.updateTimeIndicatorPosition(), 60000);
  }

  updateTimeIndicatorPosition() {
    const indicator = document.getElementById('current-time-indicator');
    if (!indicator) return;

    const today = new Date();
    const isToday = this.currentDate.toDateString() === today.toDateString();

    if (isToday) {
      const currentHour = today.getHours();
      const currentMinute = today.getMinutes();

      if (currentHour >= this.START_HOUR && currentHour <= 23) {
        indicator.style.display = 'block';
        // Calcular top: (hora - hora_inicio) * px_por_hora + (minutos / 60) * px_por_hora
        const topPos = ((currentHour - this.START_HOUR) * this.HOUR_HEIGHT) + ((currentMinute / 60) * this.HOUR_HEIGHT);
        indicator.style.top = `${topPos}px`;
      } else {
        indicator.style.display = 'none';
      }
    } else {
      indicator.style.display = 'none';
    }
  }

  /**
   * Desplaza el contenedor al tiempo actual (si estamos en hoy)
   */
  scrollToCurrentTime() {
    const today = new Date();
    if (this.currentDate.toDateString() === today.toDateString() && today.getHours() >= this.START_HOUR) {
      const container = document.getElementById('agenda-timeline-container');
      if (container) {
        const topPos = (today.getHours() - this.START_HOUR) * this.HOUR_HEIGHT;
        // Ajustar para centrar la vista
        container.scrollTop = Math.max(0, topPos - 100);
      }
    }
  }

  /**
   * Cambia el día actual
   * @param {number} offset Días a sumar/restar
   */
  async changeDay(offset) {
    this.currentDate.setDate(this.currentDate.getDate() + offset);
    this.refreshDay();
  }

  async refreshDay() {
    this.updateDateLabel();
    this.updateTimeIndicatorPosition();
    await this.loadDayEvents();
  }

  updateDateLabel() {
    const label = document.getElementById('agenda-date-label');
    if (label) {
      const dayName = this.dayNames[this.currentDate.getDay()];
      const dayNum = this.currentDate.getDate();
      const monthName = this.monthNames[this.currentDate.getMonth()];
      label.textContent = `${dayName}, ${dayNum} de ${monthName}`;
    }
  }

  /**
   * Carga los eventos desde Firestore
   */
  async loadDayEvents() {
    const dateStr = this.formatDateISO(this.currentDate);
    try {
      if (this.db && typeof this.db.getEventsByDate === 'function') {
        this.events = await this.db.getEventsByDate(dateStr);
      } else {
        this.events = [];
      }
      this.renderEvents();
    } catch (error) {
      console.error("Error al cargar los eventos:", error);
      if (this.ui) this.ui.showToast('Error al cargar la agenda', 'error');
    }
  }

  /**
   * Renderiza los eventos en la línea de tiempo
   */
  renderEvents() {
    const container = document.getElementById('agenda-events');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Iterar sobre los eventos del día
    this.events.forEach(event => {
      // event debe tener startTime "HH:MM", endTime (opcional), color, title, type
      if (!event.startTime) return;

      const [hourStr, minStr] = event.startTime.split(':');
      const startHour = parseInt(hourStr, 10);
      const startMin = parseInt(minStr, 10);

      // Si el evento empieza antes de nuestra hora de inicio, no lo renderizamos o lo ajustamos
      if (startHour < this.START_HOUR) return;

      const topPos = ((startHour - this.START_HOUR) * this.HOUR_HEIGHT) + ((startMin / 60) * this.HOUR_HEIGHT);
      
      let durationMinutes = 60; // Por defecto 1 hora
      if (event.endTime) {
        const [endHourStr, endMinStr] = event.endTime.split(':');
        const endHour = parseInt(endHourStr, 10);
        const endMin = parseInt(endMinStr, 10);
        durationMinutes = (endHour - startHour) * 60 + (endMin - startMin);
      }
      
      // Asegurar un mínimo de altura visual
      if (durationMinutes < 15) durationMinutes = 30;
      const heightPx = (durationMinutes / 60) * this.HOUR_HEIGHT;
      const color = event.color || '#4ecdc4'; // Color por defecto

      const eventBlock = document.createElement('div');
      eventBlock.className = 'absolute right-2 rounded-md shadow-sm overflow-hidden cursor-pointer transition-transform active:scale-95';
      
      // Dejar espacio para la columna de horas (w-16 = 64px) + margen
      eventBlock.style.left = '70px';
      eventBlock.style.top = `${topPos}px`;
      eventBlock.style.height = `${heightPx}px`;
      eventBlock.style.backgroundColor = this.hexToRgba(color, 0.15); // Fondo transparente
      eventBlock.style.borderLeft = `4px solid ${color}`; // Borde izquierdo colorido
      
      // Si es recordatorio, estilo diferente (pastilla pequeña)
      if (event.type === 'reminder') {
        eventBlock.style.height = '30px'; // Fijo para recordatorios
        eventBlock.style.borderRadius = '15px';
        eventBlock.innerHTML = `
          <div class="px-2 h-full flex items-center gap-1 text-xs font-medium truncate" style="color: ${color}">
            <span class="text-sm">🔔</span> ${event.title}
          </div>
        `;
      } else {
        // Evento normal
        eventBlock.innerHTML = `
          <div class="px-2 py-1 h-full flex flex-col">
            <span class="text-xs font-bold truncate" style="color: ${color}">${event.title}</span>
            ${heightPx > 30 ? `<span class="text-[10px] text-gray-500 truncate">${event.startTime} - ${event.endTime || ''}</span>` : ''}
          </div>
        `;
      }

      // Al hacer clic, abrimos el modal de edición
      eventBlock.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openEventModal(event);
      });

      container.appendChild(eventBlock);
    });
  }

  /**
   * Abre el modal para crear o editar un evento
   * @param {Object} eventData Datos del evento a editar, o null para crear
   */
  openEventModal(eventData = null) {
    const modal = document.getElementById('event-modal');
    if (!modal) return;

    // Reset de form
    const inputId = document.getElementById('event-id');
    const inputTitle = document.getElementById('event-title');
    const inputDate = document.getElementById('event-date');
    const inputStart = document.getElementById('event-start-time');
    const inputEnd = document.getElementById('event-end-time');
    const inputDesc = document.getElementById('event-description');
    const btnDelete = document.getElementById('btn-delete-event');

    if (inputId) inputId.value = eventData && eventData.id ? eventData.id : '';
    if (inputTitle) inputTitle.value = eventData && eventData.title ? eventData.title : '';
    if (inputDate) inputDate.value = eventData && eventData.date ? eventData.date : this.formatDateISO(this.currentDate);
    if (inputStart) inputStart.value = eventData && eventData.startTime ? eventData.startTime : '09:00';
    if (inputEnd) inputEnd.value = eventData && eventData.endTime ? eventData.endTime : '';
    if (inputDesc) inputDesc.value = eventData && eventData.description ? eventData.description : '';

    // Seleccionar color
    const targetColor = eventData && eventData.color ? eventData.color : '#00d4aa';
    const colorRadios = document.querySelectorAll('input[name="event-color"]');
    colorRadios.forEach(radio => {
      radio.checked = (radio.value === targetColor);
    });

    // Tipo de evento
    const targetType = eventData && eventData.type ? eventData.type : 'event';
    const typeRadios = document.querySelectorAll('input[name="event-type"]');
    typeRadios.forEach(radio => {
      radio.checked = (radio.value === targetType);
    });

    // Mostrar/ocultar botón de eliminar
    if (btnDelete) {
      btnDelete.style.display = (eventData && eventData.id) ? 'inline-block' : 'none';
    }

    modal.classList.remove('hidden');
    // Forzar un reflow antes de animar
    void modal.offsetWidth;
    modal.classList.add('opacity-100'); // Asume clases de tailwind para fade-in
  }

  /**
   * Cierra el modal de evento
   */
  closeEventModal() {
    const modal = document.getElementById('event-modal');
    if (modal) {
      modal.classList.remove('opacity-100');
      setTimeout(() => {
        modal.classList.add('hidden');
      }, 300); // Esperar a la transición
    }
  }

  /**
   * Guarda o actualiza el evento en Firestore
   */
  async saveEvent() {
    const id = document.getElementById('event-id')?.value;
    const title = document.getElementById('event-title')?.value.trim();
    const date = document.getElementById('event-date')?.value;
    const startTime = document.getElementById('event-start-time')?.value;
    let endTime = document.getElementById('event-end-time')?.value;
    const description = document.getElementById('event-description')?.value;
    
    // Obtener radio checkeado
    const colorRadio = document.querySelector('input[name="event-color"]:checked');
    const color = colorRadio ? colorRadio.value : '#00d4aa';
    
    const typeRadio = document.querySelector('input[name="event-type"]:checked');
    const type = typeRadio ? typeRadio.value : 'event';

    if (!title || !startTime) {
      if (this.ui) this.ui.showToast('El título y hora de inicio son requeridos', 'warning');
      return;
    }

    // Calcular endTime por defecto (1 hora más) si no se especifica
    if (!endTime && type !== 'reminder') {
      const [sh, sm] = startTime.split(':');
      const endHour = parseInt(sh, 10) + 1;
      endTime = `${String(endHour).padStart(2, '0')}:${sm}`;
    }

    const eventData = {
      title,
      date,
      startTime,
      endTime: type === 'reminder' ? null : endTime,
      description,
      color,
      type
    };

    try {
      if (id) {
        // Actualizar
        if (this.db) await this.db.updateEvent(id, eventData);
        if (this.ui) this.ui.showToast('Evento actualizado', 'success');
      } else {
        // Crear nuevo
        if (this.db) await this.db.saveEvent(eventData);
        if (this.ui) this.ui.showToast('Evento creado', 'success');
      }
      
      this.closeEventModal();
      
      // Si el evento guardado es para el día actual mostrado, recargar
      if (date === this.formatDateISO(this.currentDate)) {
        this.loadDayEvents();
      }
    } catch (error) {
      console.error("Error al guardar evento:", error);
      if (this.ui) this.ui.showToast('Error al guardar', 'error');
    }
  }

  /**
   * Elimina un evento
   */
  async deleteEvent() {
    const id = document.getElementById('event-id')?.value;
    if (!id) return;

    // Podríamos añadir un confirm dialog personalizado de UI si existe
    if (confirm('¿Estás seguro de que quieres eliminar este evento?')) {
      try {
        if (this.db) await this.db.deleteEvent(id);
        if (this.ui) this.ui.showToast('Evento eliminado', 'success');
        
        this.closeEventModal();
        this.loadDayEvents();
      } catch (error) {
        console.error("Error al eliminar evento:", error);
        if (this.ui) this.ui.showToast('Error al eliminar', 'error');
      }
    }
  }

  /**
   * Utilidad para convertir Date a YYYY-MM-DD
   */
  formatDateISO(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Utilidad para convertir HEX a RGBA con opacidad
   */
  hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
