# 🏋️ Mi App Personal

Aplicación web personal para registro de comidas con IA, seguimiento de peso, importación de entrenamientos desde Hevy, calendario unificado y agenda diaria.

## 🚀 Demo

**[https://rvbenrch.github.io/personal/](https://rvbenrch.github.io/personal/)**

## ✨ Funcionalidades

| Función | Descripción |
|---------|-------------|
| 🍽️ **Comidas** | Registra comidas con foto (cámara) o audio (voz). La IA (Gemini) analiza calorías y macronutrientes automáticamente |
| ⚖️ **Peso** | Registro diario de peso con gráfica de evolución |
| 📅 **Calendario** | Vista mensual con indicadores de comidas y entrenamientos |
| 💪 **Entrenos** | Importa tu historial de entrenamientos desde Hevy (CSV) |
| 📒 **Agenda** | Planificador diario con eventos y recordatorios |
| 🔐 **Auth** | Login con Google. Datos sincronizados entre dispositivos |

## 🛠️ Stack Tecnológico

- **Frontend**: HTML5 + CSS3 + Vanilla JavaScript (ES Modules)
- **Backend**: Firebase (Authentication + Cloud Firestore)
- **IA**: Google Gemini 2.0 Flash API
- **Voz**: Web Speech API
- **Gráficas**: Chart.js
- **PWA**: Instalable como app nativa

## ⚙️ Configuración Inicial

### 1. Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto
3. Activa **Authentication** → Sign-in method → Google
4. Crea una base de datos **Firestore** en modo producción
5. Añade `rvbenrch.github.io` como dominio autorizado en Authentication → Settings
6. Copia la configuración del proyecto y pégala en `js/app.js`:

```javascript
const firebaseConfig = {
  apiKey: 'TU_API_KEY',
  authDomain: 'TU_PROYECTO.firebaseapp.com',
  projectId: 'TU_PROYECTO_ID',
  storageBucket: 'TU_PROYECTO.appspot.com',
  messagingSenderId: 'TU_SENDER_ID',
  appId: 'TU_APP_ID'
};
```

7. Publica las reglas versionadas de `firestore.rules` en Firestore. Puedes hacerlo desde Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase use app-personal-dd2d0
firebase deploy --only firestore:rules
```

Las reglas impiden que un usuario autenticado lea o escriba datos bajo el `uid` de otra persona. No uses Firestore en modo abierto.

Como referencia, el archivo contiene:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 2. Gemini API Key

1. Ve a [Google AI Studio](https://aistudio.google.com/)
2. Click en "Get API key" → "Create API key in new project"
3. Copia la clave (formato `AIzaSy...`)
4. Introdúcela en la app: Configuración → API Key de Gemini

**Importante:** la integración actual llama a Gemini desde el navegador, por lo que esa clave puede ser inspeccionada por el usuario. Para producción, mueve la llamada a Gemini a una Cloud Function o servidor propio y aplica restricciones/cuotas a la clave. Las reglas de Firestore no protegen una clave de Gemini.

### 3. GitHub Pages

1. Ve a Settings del repositorio → Pages
2. Source: Deploy from a branch
3. Branch: `main` / `root`
4. La app estará en `https://rvbenrch.github.io/personal/`

## 📱 Uso

### Registrar comida
1. 📷 **Foto**: Pulsa el botón de cámara, haz una foto → la IA analiza calorías
2. 🎤 **Voz**: Pulsa el micrófono y describe tu comida → la IA estima calorías

### Registrar peso
1. Introduce tu peso en kg
2. Pulsa "Registrar"
3. La gráfica se actualiza automáticamente

### Importar entrenamientos de Hevy
1. En Hevy App → Ajustes → Exportar datos → Descarga `workout_data.csv`
2. En la app → 💪 Entrenos → "Importar CSV de Hevy"
3. Selecciona el archivo → ¡Listo!

## 📂 Estructura del Proyecto

```
├── index.html          # SPA entry point
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker
├── css/
│   ├── main.css        # Variables, tema, layout
│   ├── components.css  # Componentes reutilizables
│   ├── views.css       # Estilos por vista
│   └── animations.css  # Animaciones y transiciones
├── js/
│   ├── app.js          # Router, inicialización
│   ├── auth.js         # Firebase Auth
│   ├── db.js           # Firestore CRUD
│   ├── ui.js           # UI utilities, gestos
│   ├── food.js         # Tracking comidas + Gemini
│   ├── weight.js       # Tracking peso + Chart.js
│   ├── calendar.js     # Calendario mensual
│   ├── hevy.js         # Parser CSV Hevy
│   ├── agenda.js       # Agenda diaria
│   └── settings.js     # Configuración
└── assets/
    └── icons/          # Iconos PWA
```

## 💰 Coste

**0 €** — Todo funciona con planes gratuitos:
- Firebase: 1 GB Firestore, 50K lecturas/día
- Gemini: 1.500 peticiones/día
- GitHub Pages: hosting ilimitado

## 📄 Licencia

Uso personal.
