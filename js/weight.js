export class WeightTracker {
  constructor(db, ui) {
    this.db = db;
    this.ui = ui;
    this.chart = null; // Instancia de Chart.js
    this.weightData = []; // Caché del historial de peso
  }

  async init() {
    this.setupEventListeners();
    await this.loadWeightHistory();
    this.updateStats();
  }

  setupEventListeners() {
    const btnSave = document.querySelector('#btn-save-weight');
    if (btnSave) {
      btnSave.addEventListener('click', () => this.saveWeight());
    }
  }

  async saveWeight() {
    const input = document.querySelector('#weight-input');
    if (!input) return;

    const weight = parseFloat(input.value);

    // Validación: debe ser un número entre 30 y 300 kg
    if (isNaN(weight) || weight < 30 || weight > 300) {
      this.ui.showToast('Por favor, introduce un peso válido (30-300 kg)', 'error');
      return;
    }

    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // Formato YYYY-MM-DD

    try {
      // Guardar en la base de datos (Firestore)
      await this.db.saveWeight(dateStr, weight);

      // Feedback de éxito
      this.ui.showToast('Peso registrado ✅', 'success');
      this.ui.hapticFeedback('success');

      input.value = ''; // Limpiar el campo

      // Recargar el historial y actualizar la UI
      await this.loadWeightHistory();
      this.updateStats();
      this.updateChart();

      // Celebración si hay 7 o más días consecutivos registrados (simplificado a contar datos)
      if (this.weightData.length >= 7) {
        if (typeof this.ui.celebrate === 'function') {
            this.ui.celebrate();
        }
      }

    } catch (error) {
      console.error('Error al guardar el peso:', error);
      this.ui.showToast('Error al guardar el peso', 'error');
    }
  }

  async loadWeightHistory() {
    try {
      // Cargar los últimos 90 días por defecto
      this.weightData = await this.db.getWeightHistory(90);
      
      // Ordenar por fecha de forma ascendente para mostrar correctamente en el gráfico
      this.weightData.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      this.updateChart();
    } catch (error) {
      console.error('Error al cargar historial de peso:', error);
    }
  }

  updateStats() {
    if (!this.weightData || this.weightData.length === 0) return;

    const weights = this.weightData.map(d => d.weight);
    
    // Peso actual es el último registrado
    const currentWeight = weights[weights.length - 1];
    
    // Encontrar mínimos y máximos en el historial
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);

    // Animar el número del peso actual con CountUp
    const currentEl = document.querySelector('#current-weight');
    if (currentEl && typeof this.ui.animateCountUp === 'function') {
      this.ui.animateCountUp(currentEl, currentWeight, 1);
    } else if (currentEl) {
      currentEl.textContent = `${currentWeight.toFixed(1)} kg`;
    }

    const minEl = document.querySelector('#min-weight');
    if (minEl) minEl.textContent = `${minWeight.toFixed(1)} kg`;

    const maxEl = document.querySelector('#max-weight');
    if (maxEl) maxEl.textContent = `${maxWeight.toFixed(1)} kg`;

    this.calculateWeeklyChange(currentWeight);
  }

  calculateWeeklyChange(currentWeight) {
    const weeklyChangeEl = document.querySelector('#weekly-change');
    if (!weeklyChangeEl) return;

    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    let pastWeight = currentWeight; // Valor por defecto
    
    // Buscar el registro de peso más cercano a hace 7 días
    for (let i = this.weightData.length - 1; i >= 0; i--) {
      const recordDate = new Date(this.weightData[i].date);
      if (recordDate <= sevenDaysAgo) {
        pastWeight = this.weightData[i].weight;
        break;
      }
    }

    const diff = currentWeight - pastWeight;
    const absDiff = Math.abs(diff).toFixed(1);

    // Mostrar colores semánticos: verde (éxito) si baja, rojo (alerta) si sube
    if (diff < 0) {
      weeklyChangeEl.innerHTML = `↓ ${absDiff} kg`;
      weeklyChangeEl.style.color = 'var(--success, #00d4aa)';
    } else if (diff > 0) {
      weeklyChangeEl.innerHTML = `↑ ${absDiff} kg`;
      weeklyChangeEl.style.color = 'var(--danger, #ff4d4d)';
    } else {
      weeklyChangeEl.innerHTML = `- 0.0 kg`;
      weeklyChangeEl.style.color = 'var(--text-secondary, #a1a1aa)';
    }
  }

  updateChart() {
    const canvas = document.querySelector('#weight-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    // Limpiar el gráfico existente antes de crear uno nuevo
    if (this.chart) {
      this.chart.destroy();
    }

    if (!this.weightData || this.weightData.length === 0) {
      return;
    }

    const labels = this.weightData.map(d => this.formatDate(d.date));
    const data = this.weightData.map(d => d.weight);

    const ctx = canvas.getContext('2d');

    // Gradiente sutil para el área bajo la curva (30% de opacidad a transparente)
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 212, 170, 0.3)'); 
    gradient.addColorStop(1, 'rgba(0, 212, 170, 0)');   

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Peso (kg)',
          data: data,
          borderColor: '#00d4aa', // Color de acento
          backgroundColor: gradient,
          fill: true,
          pointBackgroundColor: '#00d4aa',
          pointBorderColor: '#131320', // Borde oscuro
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointHoverBorderColor: '#ffffff', // Hover state
          pointHoverBorderWidth: 2,
          tension: 0.4, // Curvatura suave
          borderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // Permite adaptarse al contenedor
        animation: {
          x: { duration: 1000, from: 0 },
          y: { duration: 1000, from: 0 }
        },
        interaction: {
          intersect: false,
          mode: 'index',
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(28, 28, 50, 0.9)',
            titleColor: '#ffffff',
            bodyColor: '#00d4aa',
            borderColor: '#2e2e48',
            borderWidth: 1,
            padding: 10,
            displayColors: false,
            callbacks: {
              label: (context) => `${context.parsed.y} kg`
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: '#1c1c32',
              drawBorder: false,
            },
            ticks: {
              color: '#6b6b80',
              maxRotation: 45,
              minRotation: 0
            }
          },
          y: {
            grid: {
              color: '#1c1c32',
              drawBorder: false,
            },
            ticks: {
              color: '#6b6b80',
              stepSize: 1
            },
            // Margen para que la gráfica no toque el borde del canvas
            suggestedMin: Math.min(...data) - 2,
            suggestedMax: Math.max(...data) + 2
          }
        }
      }
    });
  }

  // Formato ej. "14 Sep"
  formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }
}
