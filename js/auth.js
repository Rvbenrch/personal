export class Auth {
  constructor() {
    this.user = null;
    this.provider = new firebase.auth.GoogleAuthProvider();
    this.onAuthChanged = null;
  }
  
  init(onAuthChanged) {
    this.onAuthChanged = onAuthChanged;
    
    // Suscribirse a cambios en el estado de autenticación
    firebase.auth().onAuthStateChanged((user) => {
      this.user = user;
      
      // Actualizar UI básica
      const userAvatar = document.getElementById('user-avatar');
      const userGreeting = document.getElementById('user-greeting');
      
      if (user) {
        if (userAvatar) userAvatar.src = user.photoURL || 'default-avatar.png';
        if (userGreeting) {
          const hour = new Date().getHours();
          const greeting = hour >= 6 && hour < 13 ? 'Buenos días' : hour < 21 ? 'Buenas tardes' : 'Buenas noches';
          userGreeting.textContent = `${greeting}, ${user.displayName?.split(' ')[0] || 'Usuario'}`;
        }
      }
      
      // Ejecutar callback
      if (typeof this.onAuthChanged === 'function') {
        this.onAuthChanged(user);
      }
    });

    // Manejador del botón de login
    const btnLogin = document.getElementById('btn-google-login');
    if (btnLogin) {
      btnLogin.addEventListener('click', () => this.login());
    }

    // Manejador del botón de logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => this.logout());
    }
  }
  
  async login() {
    try {
      // Intentamos primero con un popup (comportamiento habitual)
      await firebase.auth().signInWithPopup(this.provider);
    } catch (error) {
      console.error("Error al iniciar sesión con popup:", error);
      // En móvil los navegadores bloquean popups con códigos variados; la redirección es el flujo fiable.
      if (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ||
          ['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(error.code)) {
        try {
          await firebase.auth().signInWithRedirect(this.provider);
        } catch (redirectError) {
          console.error("Error al iniciar sesión con redirección:", redirectError);
          alert('No se pudo iniciar sesión. Comprueba que rvbenrch.github.io está autorizado en Firebase Authentication.');
        }
      } else {
        alert('No se pudo iniciar sesión con Google. Revisa el dominio autorizado en Firebase.');
      }
    }
  }
  
  async logout() {
    try {
      await firebase.auth().signOut();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  }
  
  getUser() { 
    return this.user; 
  }
  
  getUid() { 
    return this.user?.uid; 
  }
}
