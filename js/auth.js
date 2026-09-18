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
        if (userGreeting) userGreeting.textContent = `Hola, ${user.displayName?.split(' ')[0] || 'Usuario'}`;
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
      // Fallback a redirección si el popup fue bloqueado o estamos en entorno móvil restrictivo
      if (error.code === 'auth/popup-blocked' || /Mobi|Android/i.test(navigator.userAgent)) {
        try {
          await firebase.auth().signInWithRedirect(this.provider);
        } catch (redirectError) {
          console.error("Error al iniciar sesión con redirección:", redirectError);
        }
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
