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
  apiKey: "AIzaSyATmaLZHpIqLk4q3Gg_lc_wMSviWbHtTqs",
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
const routes = ['food', 'weight', 'calendar', 'workouts', 'agenda', 'settings'];

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
});

// Flujo de Inicialización de la App
async function initApp() {
  const splashScreen = document.getElementById('splash-screen');
  
  // Mostrar splash screen al menos 800ms
  const splashPromise = new Promise(resolve => setTimeout(resolve, 800));

  auth.init(async (user) => {
    await splashPromise; // Esperamos el tiempo mínimo del splash

    if (user) {
      db.setUser(user.uid);
      
      // Guardar perfil del usuario en Firestore
      try {
        await db.saveUserProfile({
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        });
      } catch (e) {
        console.warn('No se pudo guardar el perfil:', e);
      }

      try {
        const onboardingComplete = await db.isOnboardingComplete();
        
        if (!onboardingComplete) {
          showOnboarding();
        } else {
          await showMainApp();
        }
      } catch (error) {
        console.error("Error validando el estado del onboarding:", error);
        // En caso de error, intentar mostrar la app igualmente
        await showMainApp();
      }
    } else {
      // Mostrar pantalla de login si no está autenticado
      hideAllScreens();
      const loginScreen = document.getElementById('login-screen');
      if (loginScreen) loginScreen.style.display = 'flex';
    }
    
    // Ocultar splash screen de forma suave
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
  if (mainApp) mainApp.style.display = 'flex';
  
  // Inicializar interfaz de usuario (gestos, ripple, scroll reveal)
  ui.init();
  
  // Inicializar todos los módulos de features
  try {
    settings = new Settings(db, ui, auth);
    await settings.init();

    foodTracker = new FoodTracker(db, ui);
    await foodTracker.init();
    // Pasar la referencia de settings a food para obtener la API key
    foodTracker.getApiKey = () => settings.getGeminiKey();

    weightTracker = new WeightTracker(db, ui);
    await weightTracker.init();

    hevyImporter = new HevyImporter(db, ui);
    await hevyImporter.init();

    calendar = new Calendar(db, ui);
    await calendar.init();

    agenda = new Agenda(db, ui);
    await agenda.init();
  } catch (error) {
    console.error('Error inicializando módulos:', error);
    ui.showToast('Error cargando la app. Recarga la página.', 'error');
  }
  
  // Actualizar el header con datos del usuario
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

  // Cargar vista inicial
  const initialView = window.location.hash.replace('#/', '') || 'food';
  navigateTo(routes.includes(initialView) ? initialView : 'food');
}

// Iniciar aplicación
initApp();

// Exportar elementos globales para comunicación entre módulos
window.app = { auth, db, ui, navigateTo };

