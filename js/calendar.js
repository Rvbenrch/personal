export class Calendar {
  constructor(db, ui) {
    this.db = db;
    this.ui = ui;
    this.currentDate = new Date(); // Mes mostrado actualmente
    this.selectedDate = null; // Fecha seleccionada para ver detalles
    this.filterWorkouts = true; // Filtro de entrenamientos
    this.filterMeals = true; // Filtro de comidas
    this.mealsData = {}; // { 'YYYY-MM-DD': [meals] }
    this.workoutsData = {}; // { 'YYYY-MM-DD': [workouts] }
    this.eventsData = {}; // { 'YYYY-MM-DD': [events] }

    // Variables para seguimiento de gestos táctiles (swipe)
    this.touchStartX = 0;
    this.touchEndX = 0;

    // Nombres de los meses en español
    this.monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
  }

  /**
   * Inicializa el calendario
   */
  async init() {
    this.setupEventListeners();
    window.addEventListener('calendar-events-updated', () => {
      this.loadMonthData().then(() => this.renderCalendar());
    });
    await this.loadMonthData();
    this.renderCalendar();
  }

  /**
   * Configura los event listeners de navegación, filtros y swipe
   */
  setupEventListeners() {
    // Navegación de mes
    const btnPrev = document.getElementById('btn-prev-month');
    const btnNext = document.getElementById('btn-next-month');
    if (btnPrev) btnPrev.addEventListener('click', () => this.changeMonth(-1));
    if (btnNext) btnNext.addEventListener('click', () => this.changeMonth(1));

    // Filtros
    const btnFilterWorkouts = document.getElementById('btn-filter-workouts');
    if (btnFilterWorkouts) {
      btnFilterWorkouts.addEventListener('click', (e) => {
        this.filterWorkouts = !this.filterWorkouts;
        e.currentTarget.classList.toggle('active', this.filterWorkouts);
        this.renderCalendar(); // Re-renderizar para actualizar los puntos
      });
    }

    const btnFilterMeals = document.getElementById('btn-filter-meals');
    if (btnFilterMeals) {
      btnFilterMeals.addEventListener('click', (e) => {
        this.filterMeals = !this.filterMeals;
        e.currentTarget.classList.toggle('active', this.filterMeals);
        this.renderCalendar();
      });
    }

    const btnAddEvent = document.getElementById('btn-calendar-add-event');
    if (btnAddEvent) {
      btnAddEvent.addEventListener('click', () => {
        const date = this.selectedDate || this.formatDateISO(new Date());
        window.appAgenda?.openEventModal({ date });
      });
    }

    // Panel de detalles del día
    const closePanel = document.getElementById('btn-close-day-detail');
    if (closePanel) {
      closePanel.addEventListener('click', () => {
        const panel = document.getElementById('day-detail-panel');
        if (panel) panel.classList.remove('active');
        this.selectedDate = null;
        this.renderCalendar();
      });
    }

    // Gesto de Swipe para cambiar de mes
    const grid = document.getElementById('calendar-grid');
    if (grid) {
      grid.addEventListener('touchstart', (e) => {
        this.touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });
      grid.addEventListener('touchend', (e) => {
        this.touchEndX = e.changedTouches[0].screenX;
        this.handleSwipe();
      }, { passive: true });
    }
  }

  /**
   * Maneja el gesto de swipe en la cuadrícula del calendario
   */
  handleSwipe() {
    const threshold = 50; // Distancia mínima para considerar un swipe
    if (this.touchStartX - this.touchEndX > threshold) {
      // Swipe hacia la izquierda: mes siguiente
      this.changeMonth(1);
    } else if (this.touchEndX - this.touchStartX > threshold) {
      // Swipe hacia la derecha: mes anterior
      this.changeMonth(-1);
    }
  }

  /**
   * Cambia el mes actual y recarga los datos
   * @param {number} offset -1 para mes anterior, 1 para mes siguiente
   */
  async changeMonth(offset) {
    this.currentDate.setMonth(this.currentDate.getMonth() + offset);
    await this.loadMonthData();
    this.renderCalendar();
  }

  /**
   * Carga los datos de comidas y entrenamientos para el mes actual
   */
  async loadMonthData() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    // Primer día del mes actual
    const startDateObj = new Date(year, month, 1);
    // Último día del mes actual
    const endDateObj = new Date(year, month + 1, 0);

    const startDate = this.formatDateISO(startDateObj);
    const endDate = this.formatDateISO(endDateObj);

    try {
      // Obtener datos desde Firestore a través de la clase DB
      if (this.db && typeof this.db.getMealsInRange === 'function') {
        const meals = await this.db.getMealsInRange(startDate, endDate);
        this.mealsData = this.groupByDate(meals);
      } else {
        this.mealsData = {}; // Fallback si no hay DB
      }

      if (this.db && typeof this.db.getWorkoutsByDateRange === 'function') {
        const workouts = await this.db.getWorkoutsByDateRange(startDate, endDate);
        this.workoutsData = this.groupByDate(workouts);
      } else {
        this.workoutsData = {}; // Fallback si no hay DB
      }

      if (this.db && typeof this.db.getEventsInRange === 'function') {
        const events = await this.db.getEventsInRange(startDate, endDate);
        this.eventsData = this.groupByDate(events);
      } else {
        this.eventsData = {};
      }
    } catch (error) {
      console.error("Error al cargar los datos del mes:", error);
      if (this.ui) this.ui.showToast('Error al cargar el calendario', 'error');
    }
  }

  /**
   * Agrupa un arreglo de objetos por su propiedad date (YYYY-MM-DD)
   * @param {Array} data Arreglo de registros (comidas o entrenamientos)
   * @returns {Object} Objeto agrupado por fecha
   */
  groupByDate(data) {
    if (!data || !Array.isArray(data)) return {};
    return data.reduce((acc, item) => {
      // Asume que item.date existe y tiene formato "YYYY-MM-DD" u otro que se pueda extraer
      const dateStr = item.date.length > 10 ? item.date.substring(0, 10) : item.date;
      if (!acc[dateStr]) {
        acc[dateStr] = [];
      }
      acc[dateStr].push(item);
      return acc;
    }, {});
  }

  /**
   * Formatea un objeto Date a string YYYY-MM-DD
   * @param {Date} dateObj 
   * @returns {string} Fecha en formato ISO
   */
  formatDateISO(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Renderiza el encabezado y la cuadrícula del calendario
   */
  renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const label = document.getElementById('calendar-month-label');
    
    if (!grid) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    // Actualizar etiqueta del mes (ej: "Septiembre 2026")
    if (label) {
      label.textContent = `${this.monthNames[month]} ${year}`;
    }

    grid.innerHTML = '';

    // Cálculos de días
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    
    // Obtener el día de la semana para el 1er día (0 = Domingo, 1 = Lunes, ...)
    let startDay = firstDayOfMonth.getDay();
    // Ajustar para que Lunes sea 0 y Domingo sea 6
    startDay = startDay === 0 ? 6 : startDay - 1;

    const today = new Date();
    const todayStr = this.formatDateISO(today);

    // Renderizar 42 celdas (6 semanas completas para cubrir todos los casos)
    for (let i = 0; i < 42; i++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-cell';
      
      const dayNumStr = i - startDay + 1;
      let cellDateObj;
      let isCurrentMonth = true;

      // Calcular la fecha exacta para la celda actual (incluso si está fuera del mes)
      if (i < startDay) {
        // Días del mes anterior
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        const prevMonthDay = prevMonthLastDay - startDay + i + 1;
        cell.textContent = prevMonthDay;
        cell.classList.add('outside-month');
        cellDateObj = new Date(year, month - 1, prevMonthDay);
        isCurrentMonth = false;
      } else if (dayNumStr > daysInMonth) {
        // Días del mes siguiente
        const nextMonthDay = dayNumStr - daysInMonth;
        cell.textContent = nextMonthDay;
        cell.classList.add('outside-month');
        cellDateObj = new Date(year, month + 1, nextMonthDay);
        isCurrentMonth = false;
      } else {
        // Días del mes actual
        cell.textContent = dayNumStr;
        cellDateObj = new Date(year, month, dayNumStr);
      }

      const cellDateStr = this.formatDateISO(cellDateObj);

      // Envolver el texto en un span para aplicar estilos consistentes
      const numSpan = document.createElement('span');
      numSpan.className = 'calendar-number';
      numSpan.textContent = cell.textContent;
      cell.textContent = ''; // Limpiamos texto para usar el span
      cell.appendChild(numSpan);

      // Estilo para el día de hoy
      if (cellDateStr === todayStr) {
        cell.classList.add('today');
      }

      // Estilo para el día seleccionado
      if (this.selectedDate === cellDateStr) {
        cell.classList.add('active');
      }

      // Indicadores (puntos de comidas y entrenamientos)
      const hasMeals = this.mealsData[cellDateStr] && this.mealsData[cellDateStr].length > 0;
      const hasWorkouts = this.workoutsData[cellDateStr] && this.workoutsData[cellDateStr].length > 0;
      const hasEvents = this.eventsData[cellDateStr] && this.eventsData[cellDateStr].length > 0;

      const dotsContainer = document.createElement('div');
      dotsContainer.className = 'day-dots';

      if (hasMeals && this.filterMeals) {
        const mealDot = document.createElement('span');
        mealDot.className = 'day-dot meal-dot';
        dotsContainer.appendChild(mealDot);
      }

      if (hasWorkouts && this.filterWorkouts) {
        const workoutDot = document.createElement('span');
        workoutDot.className = 'day-dot workout-dot';
        dotsContainer.appendChild(workoutDot);
      }

      if (hasEvents) {
        const eventDot = document.createElement('span');
        eventDot.className = 'day-dot event-dot';
        dotsContainer.appendChild(eventDot);
      }

      if (dotsContainer.children.length > 0) {
        cell.appendChild(dotsContainer);
      }

      // Evento de clic en la celda
      cell.addEventListener('click', () => {
        this.selectedDate = cellDateStr;
        this.renderCalendar(); // Actualiza la vista para mostrar selección
        this.showDayDetail(cellDateObj, hasMeals, hasWorkouts, hasEvents);
      });

      grid.appendChild(cell);
    }
  }

  /**
   * Muestra el panel inferior con los detalles del día seleccionado
   */
  showDayDetail(dateObj, hasMeals, hasWorkouts, hasEvents) {
    const panel = document.getElementById('day-detail-panel');
    const header = document.getElementById('panel-date-title');
    const content = document.getElementById('day-detail-content');
    
    if (!panel || !header || !content) return;

    const dateStr = this.formatDateISO(dateObj);
    const day = dateObj.getDate();
    const monthName = this.monthNames[dateObj.getMonth()];
    
    // Título del panel
    header.textContent = `${day} de ${monthName}`;
    content.innerHTML = ''; // Limpiar el contenido anterior

    let contentHTML = '';

    // Si no hay datos
    if (!hasMeals && !hasWorkouts && !hasEvents) {
      contentHTML = `<p class="text-gray-500 text-center py-4">No hay registros para este día.</p>`;
    } else {
      // Mostrar comidas
      if (hasMeals) {
        contentHTML += `
          <div class="mb-4">
            <h4 class="font-bold text-green-600 mb-2 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-green-500"></span> Comidas
            </h4>
            <ul class="space-y-2">
        `;
        this.mealsData[dateStr].forEach(meal => {
          contentHTML += `
            <li class="bg-gray-50 dark:bg-gray-800 p-2 rounded flex justify-between text-sm">
              <span>${meal.name || 'Comida'}</span>
              <span class="font-medium">${meal.calories || 0} kcal</span>
            </li>
          `;
        });
        contentHTML += `</ul></div>`;
      }

      // Mostrar entrenamientos
      if (hasWorkouts) {
        contentHTML += `
          <div>
            <h4 class="font-bold text-blue-600 mb-2 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-blue-500"></span> Entrenamientos
            </h4>
            <ul class="space-y-2">
        `;
        this.workoutsData[dateStr].forEach(workout => {
          contentHTML += `
            <li class="bg-gray-50 dark:bg-gray-800 p-2 rounded flex justify-between text-sm">
              <span>${workout.title || 'Entrenamiento'}</span>
              <span class="font-medium">${workout.duration ? workout.duration + ' min' : ''}</span>
            </li>
          `;
        });
        contentHTML += `</ul></div>`;
      }

      if (hasEvents) {
        contentHTML += `
          <div class="calendar-detail-events">
            <h4 class="calendar-detail-title"><span class="day-dot event-dot"></span> Agenda</h4>
            <ul class="calendar-detail-list">
        `;
        this.eventsData[dateStr].forEach(event => {
          contentHTML += `
            <li class="calendar-detail-item">
              <span>${event.title || 'Evento'}</span>
              <span>${event.startTime || ''}</span>
            </li>
          `;
        });
        contentHTML += `</ul></div>`;
      }
    }

    content.innerHTML = contentHTML;
    // Mostrar el panel (deslizándose desde abajo mediante CSS)
    panel.classList.add('active');
  }
}
