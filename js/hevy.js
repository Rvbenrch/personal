export class HevyImporter {
  constructor(db, ui) {
    this.db = db;
    this.ui = ui;
    this.workouts = []; // Caché en memoria de entrenamientos
  }

  async init() {
    this.setupEventListeners();
    await this.loadWorkouts();
  }

  setupEventListeners() {
    const btnImport = document.querySelector('#btn-import-csv');
    const fileInput = document.querySelector('#csv-file-input');
    const searchInput = document.querySelector('#workout-search');

    if (btnImport && fileInput) {
      btnImport.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => this.filterWorkouts(e.target.value));
    }
  }

  async handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      this.ui.showToast('Leyendo archivo CSV...', 'info');
      
      const text = await file.text();
      const rows = this.parseCSV(text);
      const workouts = this.groupIntoWorkouts(rows);
      
      await this.importWorkouts(workouts);
      
    } catch (error) {
      console.error('Error al importar CSV:', error);
      this.ui.showToast('Error al procesar el archivo CSV', 'error');
    } finally {
      // Limpiar input de archivo para permitir subir el mismo archivo otra vez
      event.target.value = '';
    }
  }

  // Analiza el texto CSV manejando comillas para campos con comas
  parseCSV(csvText) {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length <= 1) return []; // Solo encabezado o vacío

    // 14 columnas: title, start_time, end_time, description, exercise_title, superset_id, 
    // exercise_notes, set_index, set_type, weight_lbs, reps, distance_miles, duration_seconds, rpe
    const headers = this.parseCSVLine(lines[0]).map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length !== headers.length) continue; // Saltar líneas inconsistentes

      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      data.push(row);
    }

    return data;
  }

  // Helper para leer cada línea respetando campos rodeados de comillas dobles
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes; // Toggle comillas
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current); // Último campo
    
    return result;
  }

  // Analiza la fecha generada por Hevy ("15 Jul 2026, 09:52")
  parseHevyDate(dateStr) {
    if (!dateStr) return new Date();
    
    // Limpiamos comas que puedan interferir en JS parse
    const cleanStr = dateStr.replace(',', '');
    const date = new Date(cleanStr);
    
    return isNaN(date.getTime()) ? new Date() : date;
  }

  // Agrupa filas sueltas en objetos Workout con Ejercicios y Series anidadas
  groupIntoWorkouts(rows) {
    const workoutsMap = new Map();

    rows.forEach(row => {
      // Clave unificadora: Nombre + Inicio del entreno
      const workoutKey = `${row.title}_${row.start_time}`;

      if (!workoutsMap.has(workoutKey)) {
        const startTimeDate = this.parseHevyDate(row.start_time);
        const endTimeDate = this.parseHevyDate(row.end_time);
        
        let durationMin = 0;
        if (startTimeDate && endTimeDate) {
          durationMin = Math.round((endTimeDate - startTimeDate) / 60000);
        }

        workoutsMap.set(workoutKey, {
          title: row.title,
          start_time: row.start_time,
          timestamp: startTimeDate.getTime(), // Para ordenamiento
          end_time: row.end_time,
          duration_min: durationMin,
          description: row.description || '',
          exercisesMap: new Map() // Se eliminará después
        });
      }

      const workout = workoutsMap.get(workoutKey);
      
      // Agrupar por Ejercicio
      const exerciseKey = row.exercise_title;
      if (!workout.exercisesMap.has(exerciseKey)) {
        workout.exercisesMap.set(exerciseKey, {
          title: row.exercise_title,
          notes: row.exercise_notes || '',
          superset_id: row.superset_id || null,
          sets: []
        });
      }

      const exercise = workout.exercisesMap.get(exerciseKey);

      // Conversión imperial -> métrico
      let weight_kg = 0;
      if (row.weight_lbs && row.weight_lbs !== '0') {
        weight_kg = parseFloat(row.weight_lbs) / 2.20462;
        weight_kg = Math.round(weight_kg * 10) / 10;
      }

      let distance_km = 0;
      if (row.distance_miles && row.distance_miles !== '0') {
        distance_km = parseFloat(row.distance_miles) * 1.60934;
        distance_km = Math.round(distance_km * 100) / 100;
      }

      // Añadir la serie (set)
      exercise.sets.push({
        index: parseInt(row.set_index) || exercise.sets.length + 1,
        type: row.set_type || 'normal', // normal, warmup, dropset, failure
        weight_kg: weight_kg,
        reps: parseInt(row.reps) || 0,
        distance_km: distance_km,
        duration_seconds: parseInt(row.duration_seconds) || 0,
        rpe: row.rpe || ''
      });
    });

    // Aplanar Maps de vuelta a Arrays limpios
    const result = Array.from(workoutsMap.values()).map(workout => {
      workout.exercises = Array.from(workout.exercisesMap.values());
      delete workout.exercisesMap;
      return workout;
    });

    return result;
  }

  async importWorkouts(workouts) {
    let imported = 0;
    let existing = 0;
    
    const progressEl = document.querySelector('#import-progress');
    if (progressEl) {
      progressEl.style.display = 'block';
      progressEl.value = 0;
      progressEl.max = workouts.length;
    }

    // Iteramos e insertamos
    for (let i = 0; i < workouts.length; i++) {
      const workout = workouts[i];
      
      // Deduplicar antes de persistir
      const exists = await this.db.workoutExists(workout.title, workout.timestamp);
      
      if (!exists) {
        await this.db.saveWorkout(workout);
        imported++;
      } else {
        existing++;
      }

      if (progressEl) progressEl.value = i + 1;
    }

    if (progressEl) progressEl.style.display = 'none';

    // Notificaciones de resumen
    this.ui.showToast(`${imported} entrenos importados, ${existing} ya existían`, 'success');
    this.ui.hapticFeedback('success');

    // Actualizar vista
    await this.loadWorkouts();
  }

  async loadWorkouts() {
    try {
      this.workouts = await this.db.getWorkouts();
      // Orden descendente (más nuevos primero)
      this.workouts.sort((a, b) => b.timestamp - a.timestamp);
      this.renderWorkouts(this.workouts);
    } catch (error) {
      console.error('Error al cargar entrenamientos:', error);
    }
  }

  renderWorkouts(workoutsToRender) {
    const listEl = document.querySelector('#workouts-list');
    if (!listEl) return;

    listEl.innerHTML = '';

    if (!workoutsToRender || workoutsToRender.length === 0) {
      listEl.innerHTML = '<div class="empty-state">No hay entrenamientos para mostrar. Importa un CSV de Hevy.</div>';
      return;
    }

    workoutsToRender.forEach(workout => {
      const dateStr = new Date(workout.timestamp).toLocaleDateString('es-ES', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
      });

      const card = document.createElement('div');
      card.className = 'workout-card';
      
      let html = `
        <div class="workout-header">
          <h3><strong>${workout.title}</strong></h3>
          <div class="workout-meta">
            <span class="date">${dateStr}</span>
            <span class="duration badge">${workout.duration_min} min</span>
          </div>
          ${workout.description ? `<p class="workout-desc">${workout.description}</p>` : ''}
        </div>
        <div class="exercises-list collapse">
      `;

      workout.exercises.forEach(ex => {
        html += `
          <div class="exercise-item">
            <div class="exercise-header">
              <h4>${ex.title}</h4>
              <span class="sets-summary">${ex.sets.length} series</span>
            </div>
            <div class="sets-list">
        `;

        ex.sets.forEach(set => {
          let typeClass = 'badge-normal';
          let typeLabel = set.index;
          
          if (set.type === 'warmup') { typeClass = 'badge-warmup'; typeLabel = 'W'; }
          else if (set.type === 'dropset') { typeClass = 'badge-dropset'; typeLabel = 'D'; }
          else if (set.type === 'failure') { typeClass = 'badge-failure'; typeLabel = 'F'; }

          html += `
            <div class="set-row">
              <span class="set-badge ${typeClass}">${typeLabel}</span>
          `;

          // Detectar cardio vs pesas
          if (set.distance_km > 0 || set.duration_seconds > 0) {
            const min = Math.floor(set.duration_seconds / 60);
            const sec = set.duration_seconds % 60;
            html += `<span class="set-details">${set.distance_km > 0 ? set.distance_km + ' km ' : ''}${min > 0 ? min + 'm ' + sec + 's' : ''}</span>`;
          } else {
            html += `<span class="set-details">${set.weight_kg} kg × ${set.reps} reps</span>`;
          }

          if (set.rpe) {
            html += `<span class="rpe-badge">RPE ${set.rpe}</span>`;
          }

          html += `</div>`;
        });

        html += `
            </div>
          </div>
        `;
      });

      html += `</div>`; // .exercises-list
      card.innerHTML = html;

      // Desplegar/contraer con click
      const headerEl = card.querySelector('.workout-header');
      const listContainer = card.querySelector('.exercises-list');
      headerEl.addEventListener('click', () => {
        listContainer.classList.toggle('collapse');
      });

      listEl.appendChild(card);
    });
  }

  filterWorkouts(query) {
    if (!query || query.trim() === '') {
      this.renderWorkouts(this.workouts);
      return;
    }

    const lowerQuery = query.toLowerCase();
    
    // Filtrar si coincide el título o el nombre de alguno de los ejercicios
    const filtered = this.workouts.filter(w => {
      if (w.title.toLowerCase().includes(lowerQuery)) return true;
      return w.exercises.some(ex => ex.title.toLowerCase().includes(lowerQuery));
    });

    this.renderWorkouts(filtered);
  }
}
