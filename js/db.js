export class DB {
  constructor() {
    this.db = firebase.firestore();
    this.uid = null;
  }
  
  setUser(uid) { 
    this.uid = uid; 
  }

  localKey(name) {
    return `mi-app-personal:${this.uid || 'guest'}:${name}`;
  }

  readLocal(name, fallback = []) {
    try {
      const value = localStorage.getItem(this.localKey(name));
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.warn(`No se pudo leer el respaldo local de ${name}:`, error);
      return fallback;
    }
  }

  writeLocal(name, value) {
    localStorage.setItem(this.localKey(name), JSON.stringify(value));
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
      const current = this.readLocal('settings', {});
      this.writeLocal('settings', { ...current, ...settings });
    }
  }
  
  async getSettings() {
    try {
      const doc = await this.userDoc().get();
      return doc.exists ? doc.data().settings || {} : {};
    } catch (e) {
      console.error("Error obteniendo ajustes:", e);
      return this.readLocal('settings', {});
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
      const meals = this.readLocal('meals', []);
      const id = `local-${Date.now()}`;
      this.writeLocal('meals', [...meals, { ...mealData, id }]);
      return id;
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
      return this.readLocal('meals', []).filter(meal => meal.date === date);
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
      this.writeLocal('meals', this.readLocal('meals', []).filter(meal => meal.id !== mealId));
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
      const weights = this.readLocal('weights', {});
      weights[date] = { weight: parseFloat(weight), date, timestamp: new Date().toISOString() };
      this.writeLocal('weights', weights);
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
      return Object.values(this.readLocal('weights', {}))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-limit);
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
      const workouts = this.readLocal('workouts', []);
      const id = `local-${Date.now()}`;
      this.writeLocal('workouts', [...workouts, { ...workoutData, id }]);
      return id;
    }
  }
  
  async getWorkouts(limit = 50) {
    try {
      const snapshot = await this.userCollection('workouts')
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("Error obteniendo entrenamientos:", e);
      return this.readLocal('workouts', [])
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    }
  }
  
  async getWorkoutsByDateRange(startDate, endDate) {
    try {
      const snapshot = await this.userCollection('workouts')
        .where('timestamp', '>=', startDate)
        .where('timestamp', '<=', endDate)
        .orderBy('timestamp', 'desc')
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
      console.error("Error obteniendo entrenamientos en rango:", e);
      throw e;
    }
  }
  
  async workoutExists(title, timestamp) {
    try {
      const snapshot = await this.userCollection('workouts')
        .where('title', '==', title)
        .where('timestamp', '==', timestamp)
        .limit(1)
        .get();
      return !snapshot.empty;
    } catch (e) {
      console.error("Error comprobando si existe el entrenamiento:", e);
      return this.readLocal('workouts', []).some(workout => workout.title === title && workout.timestamp === timestamp);
    }
  }
  
  // === EVENTOS DE AGENDA ===
  
  async saveEvent(eventData) {
    const localId = eventData.id || `local-${Date.now()}`;
    const localEvent = { ...eventData, id: localId };

    try {
      const remoteEvent = {
        ...eventData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      const writePromise = this.userCollection('events').add(remoteEvent);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Tiempo de espera agotado guardando evento')), 5000);
      });
      const docRef = await Promise.race([writePromise, timeoutPromise]);
      this.writeLocal('events', [...this.readLocal('events', []), { ...localEvent, id: docRef.id }]);
      return docRef.id;
    } catch (e) {
      console.error("Error guardando evento:", e);
      const events = this.readLocal('events', []);
      this.writeLocal('events', [...events, localEvent]);
      return localId;
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
      return this.readLocal('events', []).filter(event => event.date === date);
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
      return this.readLocal('events', [])
        .filter(event => event.date >= startDate && event.date <= endDate);
    }
  }
  
  async updateEvent(eventId, data) {
    try {
      data.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
      await this.userCollection('events').doc(eventId).update(data);
    } catch (e) {
      console.error("Error actualizando evento:", e);
      const events = this.readLocal('events', []);
      this.writeLocal('events', events.map(event => event.id === eventId ? { ...event, ...data } : event));
    }
  }
  
  async deleteEvent(eventId) {
    try {
      await this.userCollection('events').doc(eventId).delete();
    } catch (e) {
      console.error("Error eliminando evento:", e);
      this.writeLocal('events', this.readLocal('events', []).filter(event => event.id !== eventId));
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
