/**
 * Módulo de Configuración (Settings)
 * Gestiona el perfil del usuario, la clave de API de Gemini, preferencias visuales y exportación de datos.
 */
export class Settings {
  constructor(db, ui, auth) {
    this.db = db;
    this.ui = ui;
    this.auth = auth;
  }

  /**
   * Inicializa el módulo de configuración
   */
  async init() {
    try {
      this.setupEventListeners();
      await this.loadSettings();
      this.updateProfileUI();
    } catch (error) {
      console.error('Error al inicializar la configuración:', error);
      this.ui.showToast('Error al cargar la configuración', 'error');
    }
  }

  /**
   * Configura los listeners de los elementos de la interfaz
   */
  setupEventListeners() {
    // Probar y guardar clave de Gemini
    const btnTestGemini = document.getElementById('btn-test-gemini');
    if (btnTestGemini) {
      btnTestGemini.addEventListener('click', () => this.testGeminiKey());
    }

    // Toggle de tema
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('change', (e) => {
        const theme = e.target.checked ? 'light' : 'dark';
        this.applyTheme(theme);
        this.saveSettings('theme', theme);
      });
    }

    // Exportar datos
    const btnExport = document.getElementById('btn-export-data');
    if (btnExport) {
      btnExport.addEventListener('click', () => this.exportData());
    }

    // Cerrar sesión
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => this.handleLogout());
    }
  }

  /**
   * Carga la configuración guardada desde Firestore
   */
  async loadSettings() {
    try {
      const settings = await this.db.getSettings();
      if (settings) {
        // Cargar clave de Gemini
        const geminiInput = document.getElementById('gemini-key-input');
        if (settings.geminiApiKey && geminiInput) {
          geminiInput.value = settings.geminiApiKey;
        }

        // Cargar y aplicar tema
        if (settings.theme === 'light') {
          this.applyTheme('light');
          const themeToggle = document.getElementById('theme-toggle');
          if (themeToggle) themeToggle.checked = true;
        } else {
          this.applyTheme('dark');
        }
      }
    } catch (error) {
      console.error('Error al cargar configuraciones:', error);
      throw error;
    }
  }

  /**
   * Guarda una configuración en Firestore
   * @param {string} key - Clave de configuración
   * @param {any} value - Valor a guardar
   */
  async saveSettings(key, value) {
    try {
      await this.db.updateSettings({ [key]: value });
      this.ui.showToast('Configuración guardada', 'success');
    } catch (error) {
      console.error(`Error al guardar configuración [${key}]:`, error);
      this.ui.showToast('Error al guardar configuración', 'error');
    }
  }

  /**
   * Actualiza la interfaz del perfil con los datos del usuario logueado
   */
  updateProfileUI() {
    const user = this.auth.getUser();
    if (!user) return;

    const profileImage = document.getElementById('profile-avatar');
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');

    if (profileImage && user.photoURL) {
      profileImage.src = user.photoURL;
    }
    
    if (profileName && user.displayName) {
      profileName.textContent = user.displayName;
    }
    
    if (profileEmail && user.email) {
      profileEmail.textContent = user.email;
    }
  }

  /**
   * Prueba la clave de la API de Gemini realizando una petición simple
   */
  async testGeminiKey() {
    const keyInput = document.getElementById('gemini-key-input');
    if (!keyInput) return;
    
    const apiKey = keyInput.value.trim();
    if (!apiKey) {
      this.ui.showToast('Ingresa una clave de API', 'error');
      return;
    }

    try {
      this.ui.showToast('Probando conexión con Gemini...', 'info');
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: "Responde solo con la palabra CONECTADO"
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 10
          }
        })
      });

      if (!response.ok) {
        throw new Error('Respuesta inválida de la API');
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

      if (text.includes('CONECTADO')) {
        this.ui.showToast('Gemini conectado ✅', 'success');
        // Guardar la clave automáticamente si es válida
        await this.saveSettings('geminiApiKey', apiKey);
      } else {
        throw new Error('Respuesta inesperada');
      }

    } catch (error) {
      console.error('Error probando clave Gemini:', error);
      this.ui.showToast('Error: clave inválida', 'error');
    }
  }

  /**
   * Aplica la clase del tema seleccionado
   * @param {string} theme - 'light' o 'dark'
   */
  applyTheme(theme) {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }

  /**
   * Exporta todos los datos del usuario a un archivo JSON
   */
  async exportData() {
    try {
      this.ui.showToast('Preparando exportación...', 'info');
      
      const data = await this.db.exportAllData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const date = new Date().toISOString().split('T')[0];
      const filename = `mi_app_personal_backup_${date}.json`;
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      this.ui.showToast('Datos exportados ✅', 'success');
    } catch (error) {
      console.error('Error al exportar datos:', error);
      this.ui.showToast('Error al exportar datos', 'error');
    }
  }

  /**
   * Gestiona el cierre de sesión con confirmación
   */
  async handleLogout() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      try {
        await this.auth.logout();
        // Redirigir o limpiar la UI será manejado por el observador en Auth
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
        this.ui.showToast('Error al cerrar sesión', 'error');
      }
    }
  }

  /**
   * Retorna la clave de Gemini para uso de otros módulos
   * @returns {Promise<string|null>}
   */
  async getGeminiKey() {
    try {
      const settings = await this.db.getSettings();
      return settings?.geminiApiKey || null;
    } catch (error) {
      console.error('Error al obtener la clave de Gemini:', error);
      return null;
    }
  }
}
