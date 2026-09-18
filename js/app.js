import { Auth } from './auth.js';
import { DB } from './db.js';
import { UI } from './ui.js';
import { FoodTracker } from './food.js';
import { WeightTracker } from './weight.js';
import { Calendar } from './calendar.js';
import { HevyImporter } from './hevy.js';
import { Agenda } from './agenda.js';
import { Settings } from './settings.js';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyATmaLZHpIqlk4q3Gg_lc_wMSviWbHtTqs",
  authDomain: "app-personal-dd2d0.firebaseapp.com",
  databaseURL: "https://app-personal-dd2d0-default-rtdb.firebaseio.com",
  projectId: "app-personal-dd2d0",
  storageBucket: "app-personal-dd2d0.firebasestorage.app",
  messagingSenderId: "768190342362",
  appId: "1:768190342362:web:c451ad3156214f588231e3"
};

// Inicializar Firebase si no se ha hecho ya (al estar por CDN puede que ya esté global)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Instanciar los módulos principales
const auth = new Auth();
const db = new DB();
const ui = new UI();

// Referencias para módulos posteriores
let foodTracker, weightTracker, calendar, hevyImporter, agenda, settings;

// Navegación (SPA Router)
const routes = ['home', 'food', 'weight', 'calendar', 'workouts', 'agenda', 'settings'];

function navigateTo(viewName) {
  if (!routes.includes(viewName)) return;

  const performNavigation = () => {
    // Ocultar todas las vistas
    document.querySelectorAll('.view').forEach(view => {
      view.classList.remove('active');
      view.style.display = 'none';
    });

    // Mostrar la vista objetivo
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) {
      targetView.classList.add('active');
      targetView.style.display = 'block';
    }

    // Actualizar el estado de la navegación inferior
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.view === viewName) {
        item.classList.add('active');
      }
    });

    // Mover el indicador visual (pill)
    const indicator = document.querySelector('.nav-indicator');
    const activeItem = document.querySelector(`.nav-item[data-view="${viewName}"]`);
    if (indicator && activeItem) {
      indicator.style.transform = `translateX(${activeItem.offsetLeft}px)`;
    }

    // Inicialización específica de la vista
    if (viewName === 'weight' && typeof weightTracker !== 'undefined' && weightTracker.refreshChart) {
      weightTracker.refreshChart();
    }
    
    // Feedback háptico
    ui.haptic('light');
    
    // Actualizar hash para routing
    window.location.hash = `/${viewName}`;
    ui.currentView = viewName;
  };

  // Usar la View Transitions API si está soportada
  if (document.startViewTransition) {
    document.startViewTransition(() => performNavigation());
  } else {
    performNavigation();
  }
}

// Escuchar cambios en el hash (por ejemplo, botones atrás/adelante del navegador)
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.replace('#/', '');
  if (routes.includes(hash) && ui.currentView !== hash) {
    navigateTo(hash);
  }
});

// Manejadores de clics en la navegación inferior
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(item.dataset.view);
    });
  });

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-view]');
    if (target && !target.classList.contains('nav-item')) {
      event.preventDefault();
      navigateTo(target.dataset.view);
    }
  });
});

// Función auxiliar para poner timeout a las promesas
const withTimeout = (promise, ms) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
  ]);
};

// Flujo de Inicialización de la App
async function initApp() {
  const splashScreen = document.getElementById('splash-screen');
  const splashPromise = new Promise(resolve => setTimeout(resolve, 800));

  auth.init(async (user) => {
    await splashPromise;

    if (user) {
      db.setUser(user.uid);
      
      // Mostrar feedback de carga en el botón
      const btnLogin = document.getElementById('btn-google-login');
      if (btnLogin) btnLogin.innerHTML = 'Cargando tu perfil...';

      // Guardar perfil (con timeout de 3 segundos por si Firestore cuelga)
      try {
        await withTimeout(db.saveUserProfile({
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        }), 3000);
      } catch (e) {
        console.warn('Timeout o error guardando perfil. ¿Está Firestore creado?', e);
      }

      try {
        const onboardingComplete = await withTimeout(db.isOnboardingComplete(), 3000);
        if (!onboardingComplete) {
          showOnboarding();
        } else {
          await showMainApp();
        }
      } catch (error) {
        console.error("Timeout leyendo estado onboarding, forzando app principal:", error);
        await showMainApp();
      }
    } else {
      hideAllScreens();
      const loginScreen = document.getElementById('login-screen');
      if (loginScreen) {
        loginScreen.style.display = 'flex';
        const btnLogin = document.getElementById('btn-google-login');
        if (btnLogin) btnLogin.innerHTML = '<svg class="google-icon" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> Continuar con Google';
      }
    }
    
    if (splashScreen) {
      splashScreen.style.opacity = '0';
      splashScreen.style.transition = 'opacity 0.3s ease';
      setTimeout(() => splashScreen.style.display = 'none', 300);
    }
  });

  // Registro del Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('Service Worker no registrado:', err);
    });
  }
}

// Ocultar todas las pantallas
function hideAllScreens() {
  ['splash-screen', 'login-screen', 'onboarding-screen', 'app-main'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

// Mostrar onboarding
function showOnboarding() {
  hideAllScreens();
  const onboardingScreen = document.getElementById('onboarding-screen');
  if (onboardingScreen) onboardingScreen.style.display = 'flex';

  // Configurar navegación del onboarding
  let currentSlide = 0;
  const slides = document.querySelectorAll('.onboarding-slide');
  const dots = document.querySelectorAll('.onboarding-dots .dot, .onboarding-dot');

  function showSlide(index) {
    slides.forEach((s, i) => {
      s.style.display = i === index ? 'flex' : 'none';
      s.classList.toggle('active', i === index);
    });
    dots.forEach((d, i) => d.classList.toggle('active', i === index));
    currentSlide = index;
  }

  // Swipe en onboarding
  if (onboardingScreen) {
    let startX = 0;
    onboardingScreen.addEventListener('touchstart', e => { startX = e.touches[0].clientX; });
    onboardingScreen.addEventListener('touchend', e => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        if (diff > 0 && currentSlide < slides.length - 1) showSlide(currentSlide + 1);
        else if (diff < 0 && currentSlide > 0) showSlide(currentSlide - 1);
      }
    });
  }

  showSlide(0);

  // Botón "Empezar" y "Saltar" completan el onboarding
  const btnStart = document.getElementById('btn-start-app');
  const btnSkip = document.getElementById('btn-skip-onboarding');
  
  const completeOnboarding = async () => {
    try {
      await db.setOnboardingComplete();
    } catch (e) {
      console.warn('Error guardando onboarding:', e);
    }
    await showMainApp();
  };

  if (btnStart) btnStart.addEventListener('click', completeOnboarding);
  if (btnSkip) btnSkip.addEventListener('click', completeOnboarding);
}

// Mostrar app principal e inicializar todos los módulos
async function showMainApp() {
  hideAllScreens();
  const mainApp = document.getElementById('app-main');
  if (mainApp) mainApp.style.display = 'block'; // CAMBIADO de flex a block
  
  // Inicializar interfaz de usuario (gestos, ripple, scroll reveal)
  ui.init();
  
  // Crear los módulos y cargar sus datos en segundo plano para no bloquear la app.
  settings = new Settings(db, ui, auth);
  foodTracker = new FoodTracker(db, ui);
  foodTracker.getApiKey = () => settings.getGeminiKey();
  weightTracker = new WeightTracker(db, ui);
  hevyImporter = new HevyImporter(db, ui);
  calendar = new Calendar(db, ui);
  agenda = new Agenda(db, ui);
  window.appAgenda = agenda;

  Promise.allSettled([
    settings.init(),
    foodTracker.init(),
    weightTracker.init(),
    hevyImporter.init(),
    calendar.init(),
    agenda.init()
  ]).then(results => {
    const failed = results.filter(result => result.status === 'rejected');
    if (failed.length) {
      console.error('Algunos módulos no pudieron sincronizarse:', failed);
      ui.showToast('Modo sin conexión: tus datos se guardarán en este dispositivo', 'info', 5000);
    }
  });
  
  // Actualizar el header con datos del usuario y fecha actual
  const user = auth.getUser();
  if (user) {
    const avatar = document.getElementById('user-avatar');
    const greeting = document.getElementById('user-greeting');
    if (avatar && user.photoURL) avatar.src = user.photoURL;
    if (greeting) {
      const hour = new Date().getHours();
      let saludo = 'Buenas noches';
      if (hour >= 6 && hour < 13) saludo = 'Buenos días';
      else if (hour >= 13 && hour < 21) saludo = 'Buenas tardes';
      greeting.textContent = `${saludo}, ${user.displayName?.split(' ')[0] || 'Usuario'}`;
    }
  }

  // Poner fecha de hoy
  const dateStr = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const dateEl = document.getElementById('current-date');
  if (dateEl) {
    dateEl.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  }

  // Cargar vista inicial
  const initialView = window.location.hash.replace('#/', '') || 'home';
  navigateTo(routes.includes(initialView) ? initialView : 'home');
}

// Iniciar aplicación
initApp();

// Exportar elementos globales para comunicación entre módulos
window.app = { auth, db, ui, navigateTo };

