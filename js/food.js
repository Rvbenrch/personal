/**
 * Módulo de seguimiento de alimentos con análisis por IA (Gemini).
 */

export class FoodTracker {
  constructor(db, ui) {
    this.db = db; // DB instance for Firestore operations
    this.ui = ui; // UI instance for toasts, haptic, etc.
    this.geminiApiKey = null;
    this.recognition = null; // Web Speech API
    this.isRecording = false;
    this.currentAnalysis = null; // holds Gemini response for editing
    this.selectedDate = new Date().toISOString().split('T')[0]; // Fecha actual
  }

  async init() {
    try {
      // Load Gemini API key from settings
      const settings = await this.db.getSettings();
      if (settings && settings.geminiApiKey) {
        this.geminiApiKey = settings.geminiApiKey;
      }

      this.setupEventListeners();
      this.initSpeechRecognition();
      await this.loadMeals(this.selectedDate);
    } catch (error) {
      console.error('Error inicializando FoodTracker:', error);
      this.ui.showToast('Error al inicializar el registro de alimentos', 'error');
    }
  }

  setupEventListeners() {
    // Cámara
    const btnCamera = document.getElementById('btn-food-camera');
    const imageInput = document.getElementById('food-image-input');
    
    if (btnCamera && imageInput) {
      btnCamera.addEventListener('click', () => {
        if (this.ui.haptic) this.ui.haptic('light');
        imageInput.click();
      });

      imageInput.addEventListener('change', (e) => this.handleImageSelection(e));
    }

    // Micrófono
    const btnMic = document.getElementById('btn-food-mic');
    if (btnMic) {
      btnMic.addEventListener('click', () => this.toggleVoiceRecording());
    }

    // Modal
    const modalSaveBtn = document.getElementById('btn-save-meal');
    const modalCancelBtn = document.getElementById('btn-cancel-meal');

    if (modalSaveBtn) {
      modalSaveBtn.addEventListener('click', () => this.saveMealFromModal());
    }

    if (modalCancelBtn) {
      modalCancelBtn.addEventListener('click', () => this.closeModal());
    }

    // Selector de fecha
    const dateInput = document.getElementById('food-date-input');
    if (dateInput) {
      dateInput.value = this.selectedDate;
      dateInput.addEventListener('change', (e) => {
        this.selectedDate = e.target.value;
        this.loadMeals(this.selectedDate);
      });
    }

    // Modal Inputs para recalcular totales
    const componentsContainer = document.querySelector('#analysis-components tbody');
    if (componentsContainer) {
      componentsContainer.addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT') {
           this.recalculateTotals();
        }
      });
    }
  }

  initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'es-ES';
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;

      this.recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        this.ui.showToast('Audio capturado, analizando...', 'info');
        await this.processTextWithGemini(transcript);
      };

      this.recognition.onerror = (event) => {
        console.error('Error de reconocimiento de voz:', event.error);
        this.ui.showToast('Error al capturar voz', 'error');
        this.stopRecording();
      };

      this.recognition.onend = () => {
        this.stopRecording();
      };
    } else {
      console.warn('Speech Recognition API no soportada en este navegador');
      const btnMic = document.getElementById('btn-food-mic');
      if (btnMic) {
        btnMic.disabled = true;
        btnMic.title = 'El reconocimiento de voz no está disponible en este navegador';
        btnMic.setAttribute('aria-disabled', 'true');
      }
    }
  }

  toggleVoiceRecording() {
    if (!this.recognition) {
      this.ui.showToast('El reconocimiento de voz no está disponible en este navegador', 'warning');
      return;
    }

    const btnMic = document.getElementById('btn-food-mic');
    
    if (this.isRecording) {
      this.recognition.stop();
      this.stopRecording();
    } else {
      if (this.ui.haptic) this.ui.haptic('medium');
      this.isRecording = true;
      if (btnMic) btnMic.classList.add('recording');
      this.recognition.start();
      this.ui.showToast('Escuchando...', 'info');
    }
  }

  stopRecording() {
    this.isRecording = false;
    const btnMic = document.getElementById('btn-food-mic');
    if (btnMic) btnMic.classList.remove('recording');
  }

  async handleImageSelection(event) {
    const file = event.target.files[0];
    if (!file) return;

    this.ui.showLoading('Analizando imagen...');
    try {
      let base64;
      if (file.size > 1024 * 1024) { // Si es mayor a 1MB
        base64 = await this.compressImage(file);
      } else {
        base64 = await this.fileToBase64(file);
      }
      
      this.showModal(); // Mostramos modal en estado de carga
      await this.processImageWithGemini(base64);
      
      // Mostrar preview de imagen
      const imgPreview = document.getElementById('food-preview-img');
      if (imgPreview) {
        imgPreview.src = `data:image/jpeg;base64,${base64}`;
        imgPreview.style.display = 'block';
      }

    } catch (error) {
      console.error('Error al procesar imagen:', error);
      this.ui.showToast('Error al analizar la imagen', 'error');
      this.closeModal();
    } finally {
      this.ui.hideLoading();
      // Resetear el input para permitir seleccionar la misma imagen otra vez si falla
      event.target.value = '';
    }
  }

  async compressImage(file, maxWidth = 1024) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        resolve(base64);
      };
      img.src = URL.createObjectURL(file);
    });
  }

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  async processImageWithGemini(base64) {
    try {
      const analysis = await this.analyzeWithGemini(base64, null);
      this.populateModalWithAnalysis(analysis);
    } catch (error) {
      throw error;
    }
  }

  async processTextWithGemini(text) {
    this.ui.showLoading('Analizando comida...');
    try {
      this.showModal();
      const analysis = await this.analyzeWithGemini(null, text);
      this.populateModalWithAnalysis(analysis);
      
      const imgPreview = document.getElementById('food-preview-img');
      if (imgPreview) imgPreview.style.display = 'none';

    } catch (error) {
      console.error('Error procesando texto:', error);
      this.ui.showToast('Error al analizar la comida', 'error');
      this.closeModal();
    } finally {
      this.ui.hideLoading();
    }
  }

  async analyzeWithGemini(imageBase64 = null, textDescription = null) {
    if (!this.geminiApiKey) {
      throw new Error('API Key de Gemini no configurada');
    }

    const apiKey = this.geminiApiKey;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    const prompt = `Eres un nutricionista deportivo experto.
Analiza ${imageBase64 ? 'esta imagen de comida' : 'esta descripción de comida: "' + textDescription + '"'} e identifica cada alimento.
Para cada uno estima el peso en gramos y calcula calorías y macronutrientes.
Incluye calorías ocultas (aceites de cocción, salsas, aderezos).
Responde SIEMPRE en español.
Devuelve SOLO JSON válido con esta estructura exacta:
{
  "dish_title": "Nombre descriptivo del plato",
  "meal_type": "desayuno|almuerzo|cena|snack",
  "components": [
    {
      "name": "Nombre del alimento",
      "weight_g": 150,
      "calories": 220,
      "protein_g": 25.0,
      "carbs_g": 0.0,
      "fat_g": 12.0,
      "confidence": "alta|media|baja"
    }
  ],
  "total_nutrition": {
    "calories": 520,
    "protein_g": 35.0,
    "carbs_g": 45.0,
    "fat_g": 18.0,
    "fiber_g": 5.0
  },
  "assumptions": ["Se estiman 10ml de aceite de oliva (+88 kcal)"]
}`;

    const parts = [{ text: prompt }];
    if (imageBase64) {
      parts.push({
        inline_data: {
          mime_type: 'image/jpeg',
          data: imageBase64
        }
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    let response;
    try {
      response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      }),
      signal: controller.signal
      });
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('El análisis ha tardado demasiado. Comprueba la conexión e inténtalo de nuevo.');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
    
    if (!response.ok) {
      throw new Error(`Error en API de Gemini: ${response.statusText}`);
    }

    const data = await response.json();
    try {
      const text = data.candidates[0].content.parts[0].text;
      return JSON.parse(text);
    } catch (e) {
      console.error('Error parseando JSON de Gemini:', e, data);
      throw new Error('Respuesta inválida de Gemini');
    }
  }

  showModal() {
    const modal = document.getElementById('food-analysis-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'block';
    }
  }

  closeModal() {
    const modal = document.getElementById('food-analysis-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
    this.currentAnalysis = null;
    
    const imgPreview = document.getElementById('food-preview-img');
    if (imgPreview) {
      imgPreview.src = '';
      imgPreview.style.display = 'none';
    }
  }

  populateModalWithAnalysis(analysis) {
    this.currentAnalysis = analysis;
    
    // Título
    const titleInput = document.getElementById('analysis-dish-title');
    if (titleInput) titleInput.textContent = analysis.dish_title || 'Comida analizada';

    // Tipo de comida
    const typeSelect = document.getElementById('meal-type-select');
    if (typeSelect) {
      // Auto-detectar por hora si Gemini no lo da bien
      let mealType = analysis.meal_type;
      if (!mealType || !['desayuno', 'almuerzo', 'cena', 'snack'].includes(mealType.toLowerCase())) {
         const hour = new Date().getHours();
         if (hour < 11) mealType = 'desayuno';
         else if (hour < 16) mealType = 'almuerzo';
         else if (hour < 20) mealType = 'snack';
         else mealType = 'cena';
      }
      typeSelect.value = mealType.toLowerCase();
    }

    // Componentes
    this.renderModalComponents(analysis.components || []);

    // Totales
    this.updateModalTotals(analysis.total_nutrition);

    // Suposiciones
    const assumptionsContainer = document.getElementById('modal-assumptions');
    if (assumptionsContainer) {
      assumptionsContainer.innerHTML = '';
      if (analysis.assumptions && analysis.assumptions.length > 0) {
        const ul = document.createElement('ul');
        analysis.assumptions.forEach(ass => {
          const li = document.createElement('li');
          li.textContent = ass;
          ul.appendChild(li);
        });
        assumptionsContainer.appendChild(ul);
      } else {
        assumptionsContainer.innerHTML = '<p>Sin notas adicionales.</p>';
      }
    }
  }

  renderModalComponents(components) {
    const container = document.querySelector('#analysis-components tbody');
    if (!container) return;

    container.innerHTML = '';
    
    components.forEach((comp, index) => {
      const row = document.createElement('div');
      row.className = 'component-row';
      row.dataset.index = index;
      
      row.innerHTML = `
        <td><input type="text" class="comp-name text-input" value="${comp.name || ''}" data-field="name" /></td>
        <td><input type="number" class="comp-weight text-input" value="${comp.weight_g || 0}" data-field="weight_g" /></td>
        <td><input type="number" class="comp-kcal text-input" value="${comp.calories || 0}" data-field="calories" /></td>
        <td><button type="button" class="btn-remove-comp btn-icon" data-index="${index}" aria-label="Eliminar ingrediente">✕</button></td>
      `;
      container.appendChild(row);
    });

    // Eventos para eliminar componente
    container.querySelectorAll('.btn-remove-comp').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = e.target.dataset.index;
        this.currentAnalysis.components.splice(index, 1);
        this.renderModalComponents(this.currentAnalysis.components);
        this.recalculateTotals();
      });
    });

    // Actualizar currentAnalysis en cada cambio de input
    container.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', (e) => {
        const row = e.target.closest('.component-row');
        const index = row.dataset.index;
        const field = e.target.dataset.field;
        let value = e.target.value;
        
        if (e.target.type === 'number') {
          value = parseFloat(value) || 0;
        }
        
        this.currentAnalysis.components[index][field] = value;
        this.recalculateTotals();
      });
    });
  }

  recalculateTotals() {
    if (!this.currentAnalysis || !this.currentAnalysis.components) return;

    const totals = {
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0
    };

    this.currentAnalysis.components.forEach(comp => {
      totals.calories += (parseFloat(comp.calories) || 0);
      totals.protein_g += (parseFloat(comp.protein_g) || 0);
      totals.carbs_g += (parseFloat(comp.carbs_g) || 0);
      totals.fat_g += (parseFloat(comp.fat_g) || 0);
    });

    // Redondear a 1 decimal
    totals.calories = Math.round(totals.calories);
    totals.protein_g = parseFloat(totals.protein_g.toFixed(1));
    totals.carbs_g = parseFloat(totals.carbs_g.toFixed(1));
    totals.fat_g = parseFloat(totals.fat_g.toFixed(1));

    this.currentAnalysis.total_nutrition = totals;
    this.updateModalTotals(totals);
  }

  updateModalTotals(totals) {
    if (!totals) return;
    
    const elements = {
      kcal: document.getElementById('analysis-total-kcal'),
      prot: document.getElementById('analysis-total-pro'),
      carb: document.getElementById('analysis-total-car'),
      fat: document.getElementById('analysis-total-fat')
    };

    if (elements.kcal) elements.kcal.textContent = `${totals.calories} kcal`;
    if (elements.prot) elements.prot.textContent = `${totals.protein_g}g`;
    if (elements.carb) elements.carb.textContent = `${totals.carbs_g}g`;
    if (elements.fat) elements.fat.textContent = `${totals.fat_g}g`;
  }

  async saveMealFromModal() {
    if (!this.currentAnalysis) return;

    this.ui.showLoading('Guardando...');
    try {
      const titleInput = document.getElementById('analysis-dish-title');
      const typeSelect = document.getElementById('meal-type-select');
      
      const mealData = {
        title: titleInput ? titleInput.textContent : this.currentAnalysis.dish_title,
        type: typeSelect ? typeSelect.value : this.currentAnalysis.meal_type,
        components: this.currentAnalysis.components,
        totals: this.currentAnalysis.total_nutrition,
        date: this.selectedDate,
        timestamp: new Date().toISOString()
      };

      await this.db.saveMeal(mealData);
      
      this.ui.showToast('Comida guardada con éxito', 'success');
      if (this.ui.haptic) this.ui.haptic('success');
      this.closeModal();
      
      // Recargar la lista
      await this.loadMeals(this.selectedDate);
    } catch (error) {
      console.error('Error guardando comida:', error);
      this.ui.showToast('Error al guardar la comida', 'error');
    } finally {
      this.ui.hideLoading();
    }
  }

  async loadMeals(dateStr) {
    const listContainer = document.getElementById('meals-list');
    if (!listContainer) return;

    listContainer.innerHTML = '<div class="loading-spinner">Cargando...</div>';

    try {
      const meals = await this.db.getMealsByDate(dateStr);
      this.renderMealsList(meals);
      this.updateDailySummary(meals);
    } catch (error) {
      console.error('Error cargando comidas:', error);
      listContainer.innerHTML = '<p class="error-msg">Error al cargar las comidas.</p>';
    }
  }

  renderMealsList(meals) {
    const listContainer = document.getElementById('meals-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    if (!meals || meals.length === 0) {
      listContainer.innerHTML = '<div class="empty-state">No hay comidas registradas para este día.</div>';
      return;
    }

    const typeIcons = {
      desayuno: '🌅',
      almuerzo: '🌞',
      cena: '🌙',
      snack: '🍿'
    };

    meals.forEach(meal => {
      const card = document.createElement('div');
      card.className = 'meal-card';
      
      const timeStr = meal.timestamp ? new Date(meal.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
      const icon = typeIcons[meal.type] || '🍽️';

      card.innerHTML = `
        <div class="meal-card-header">
          <span class="meal-icon">${icon}</span>
          <div class="meal-info">
            <h4>${meal.title}</h4>
            <span class="meal-time">${timeStr}</span>
          </div>
          <div class="meal-totals">
            <span class="meal-kcal">${meal.totals.calories} kcal</span>
          </div>
          <button class="btn-delete-meal" data-id="${meal.id}" aria-label="Eliminar comida">🗑️</button>
        </div>
        <div class="meal-macros-mini">
          <span>P: ${meal.totals.protein_g}g</span>
          <span>C: ${meal.totals.carbs_g}g</span>
          <span>G: ${meal.totals.fat_g}g</span>
        </div>
      `;

      listContainer.appendChild(card);
    });

    // Eliminar comida
    listContainer.querySelectorAll('.btn-delete-meal').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (confirm('¿Seguro que deseas eliminar esta comida?')) {
          const id = e.currentTarget.dataset.id;
          await this.deleteMeal(id);
        }
      });
    });
  }

  async deleteMeal(id) {
    try {
      this.ui.showLoading('Eliminando...');
      await this.db.deleteMeal(id);
      this.ui.showToast('Comida eliminada', 'success');
      if (this.ui.haptic) this.ui.haptic('medium');
      await this.loadMeals(this.selectedDate);
    } catch (error) {
      console.error('Error al eliminar:', error);
      this.ui.showToast('Error al eliminar', 'error');
    } finally {
      this.ui.hideLoading();
    }
  }

  updateDailySummary(meals) {
    let totalKcal = 0, totalProt = 0, totalCarb = 0, totalFat = 0;

    meals.forEach(m => {
      if (m.totals) {
        totalKcal += m.totals.calories || 0;
        totalProt += m.totals.protein_g || 0;
        totalCarb += m.totals.carbs_g || 0;
        totalFat += m.totals.fat_g || 0;
      }
    });

    const values = {
      '#total-calories': `${Math.round(totalKcal)}`,
      '#val-protein': `${Math.round(totalProt)}`,
      '#val-carbs': `${Math.round(totalCarb)}`,
      '#val-fat': `${Math.round(totalFat)}`
    };
    Object.entries(values).forEach(([selector, value]) => {
      const element = document.querySelector(selector);
      if (element) element.textContent = value;
    });
  }
}
