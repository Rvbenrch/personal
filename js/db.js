export class DB {
  constructor() {
    this.db = firebase.firestore();
    this.uid = null;
  }
  
  setUser(uid) { 
    this.uid = uid; 
  }
  
  // Helper para obtener la referencia al documento del usuario
  userDoc() { 
    if (!this.uid) throw new Error("No hay usuario autenticado.");
    return this.db.collection('users').doc(this.uid); 
  }
  
  // Helper para colecciones anidadas del usuario
  userCollection(name) { 
    return this.userDoc().collection(name); 
  }
  
  // === PERFIL DE USUARIO ===
  
  async saveUserProfile(data) {
    try {
      await this.userDoc().set(data, { merge: true });
    } catch (e) {
      console.error("Error guardando el perfil:", e);
      throw e;
    }
  }
  
  async getUserProfile() {
    try {
      const doc = await this.userDoc().get();
      return doc.exists ? doc.data() : null;
    } catch (e) {
      console.error("Error obteniendo el perfil:", e);
      throw e;
    }
  }
  
  async updateSettings(settings) {
    try {
      await this.userDoc().set({ settings }, { merge: true });
    } catch (e) {
      console.error("Error actualizando ajustes:", e);
      throw e;
    }
  }
  
  async getSettings() {
    try {
      const doc = await this.userDoc().get();
      return doc.exists ? doc.data().settings || {} : {};
    } catch (e) {
      console.error("Error obteniendo ajustes:", e);
      throw e;
    }
  }
  
  // === COMIDAS ===
  
  async saveMeal(mealData) {
    try {
      mealData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      const docRef = await this.userCollection('meals').add(mealData);
      return docRef.id;
    } catch (e) {
      console.error("Error guardando comida:", e);
      throw e;
    }
  }
  
  async getMealsByDate(date) {
    try {
      const snapshot = await this.userCollection('meals')
        .where('date', '==', date)
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("Error obteniendo comidas del día:", e);
      throw e;
    }
  }
  
  async getMealsInRange(startDate, endDate) {
    try {
      const snapshot = await this.userCollection('meals')
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("Error obteniendo comidas en rango:", e);
      throw e;
    }
  }
  
  async deleteMeal(mealId) {
    try {
      await this.userCollection('meals').doc(mealId).delete();
    } catch (e) {
      console.error("Error eliminando comida:", e);
      throw e;
    }
  }
  
  // === PESO ===
  
  async saveWeight(date, weight) {
    try {
      await this.userCollection('weights').doc(date).set({
        weight: parseFloat(weight),
        date: date,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (e) {
      console.error("Error guardando peso:", e);
      throw e;
    }
  }
  
  async getWeightHistory(limit = 90) {
    try {
      const snapshot = await this.userCollection('weights')
        .orderBy('date', 'desc')
        .limit(limit)
        .get();
      // Invertimos para devolver orden cronológico ascendente (ideal para gráficos)
      return snapshot.docs.map(doc => doc.data()).reverse();
    } catch (e) {
      console.error("Error obteniendo historial de peso:", e);
      throw e;
    }
  }
  
  async getLatestWeight() {
    try {
      const snapshot = await this.userCollection('weights')
        .orderBy('date', 'desc')
        .limit(1)
        .get();
      return !snapshot.empty ? snapshot.docs[0].data() : null;
    } catch (e) {
      console.error("Error obteniendo el último peso:", e);
      throw e;
    }
  }
  
  // === ENTRENAMIENTOS (Hevy) ===
  
  async saveWorkout(workoutData) {
    try {
      workoutData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      const docRef = await this.userCollection('workouts').add(workoutData);
      return docRef.id;
    } catch (e) {
      console.error("Error guardando entrenamiento:", e);
      throw e;
    }
  }
  
  async getWorkouts(limit = 50) {
    try {
      const snapshot = await this.userCollection('workouts')
        .orderBy('startTime', 'desc')
        .limit(limit)
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("Error obteniendo entrenamientos:", e);
      throw e;
    }
  }
  
  async getWorkoutsByDateRange(startDate, endDate) {
    try {
      const snapshot = await this.userCollection('workouts')
        .where('startTime', '>=', startDate)
        .where('startTime', '<=', endDate)
        .orderBy('startTime', 'desc')
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("Error obteniendo entrenamientos en rango:", e);
      throw e;
    }
  }
  
  async workoutExists(title, startTime) {
    try {
      const snapshot = await this.userCollection('workouts')
        .where('title', '==', title)
        .where('startTime', '==', startTime)
        .limit(1)
        .get();
      return !snapshot.empty;
    } catch (e) {
      console.error("Error comprobando si existe el entrenamiento:", e);
      throw e;
    }
  }
  
  // === EVENTOS DE AGENDA ===
  
  async saveEvent(eventData) {
    try {
      eventData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      const docRef = await this.userCollection('events').add(eventData);
      return docRef.id;
    } catch (e) {
      console.error("Error guardando evento:", e);
      throw e;
    }
  }
  
  async getEventsByDate(date) {
    try {
      const snapshot = await this.userCollection('events')
        .where('date', '==', date)
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("Error obteniendo eventos del día:", e);
      throw e;
    }
  }
  
  async getEventsInRange(startDate, endDate) {
    try {
      const snapshot = await this.userCollection('events')
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("Error obteniendo eventos en rango:", e);
      throw e;
    }
  }
  
  async updateEvent(eventId, data) {
    try {
      data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      await this.userCollection('events').doc(eventId).update(data);
    } catch (e) {
      console.error("Error actualizando evento:", e);
      throw e;
    }
  }
  
  async deleteEvent(eventId) {
    try {
      await this.userCollection('events').doc(eventId).delete();
    } catch (e) {
      console.error("Error eliminando evento:", e);
      throw e;
    }
  }
  
  // === ONBOARDING ===
  
  async isOnboardingComplete() {
    try {
      const doc = await this.userDoc().get();
      return doc.exists && doc.data().onboardingComplete === true;
    } catch (e) {
      console.error("Error consultando estado de onboarding:", e);
      throw e;
    }
  }
  
  async setOnboardingComplete() {
    try {
      await this.userDoc().set({ onboardingComplete: true }, { merge: true });
    } catch (e) {
      console.error("Error guardando estado de onboarding:", e);
      throw e;
    }
  }
  
  // === EXPORTAR ===
  
  async exportAllData() {
    try {
      const profile = await this.getUserProfile();
      
      const mealsSnap = await this.userCollection('meals').get();
      const meals = mealsSnap.docs.map(d => d.data());
      
      const weightsSnap = await this.userCollection('weights').get();
      const weights = weightsSnap.docs.map(d => d.data());
      
      const workoutsSnap = await this.userCollection('workouts').get();
      const workouts = workoutsSnap.docs.map(d => d.data());
      
      const eventsSnap = await this.userCollection('events').get();
      const events = eventsSnap.docs.map(d => d.data());
      
      const allData = {
        profile,
        meals,
        weights,
        workouts,
        events,
        exportDate: new Date().toISOString()
      };
      
      return JSON.stringify(allData, null, 2);
    } catch (e) {
      console.error("Error exportando datos:", e);
      throw e;
    }
  }
}
