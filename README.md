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

## 📄 Licencia

Uso personal.

## Autoría, propiedad intelectual y condiciones de uso

© 2026 Rubén M. Rodríguez Chamorro. Todos los derechos reservados.

Esta aplicación, incluyendo su código fuente, estructura, diseño, lógica de funcionamiento,
interfaz, documentación y demás elementos que la componen, ha sido desarrollada íntegramente
por Rubén M. Rodríguez Chamorro como proyecto personal.

El código fuente se encuentra publicado con fines educativos, demostrativos y de consulta,
permitiendo a terceros estudiar su funcionamiento y conocer las tecnologías y técnicas
empleadas durante su desarrollo.

La publicación del código en este repositorio no implica la cesión de los derechos de
propiedad intelectual ni concede automáticamente autorización para copiar, modificar,
redistribuir, comercializar, publicar, incorporar o utilizar total o parcialmente este
proyecto en otros productos o servicios.

Queda expresamente prohibido utilizar este proyecto o cualquiera de sus componentes con
fines comerciales, fraudulentos, ilícitos o para cualquier actividad que pueda vulnerar
los derechos de terceros, salvo autorización expresa y por escrito del autor.

Asimismo, no está permitido presentar el código, diseño o desarrollo de esta aplicación
como propio, eliminar o alterar las referencias de autoría, ni redistribuir el proyecto
o versiones modificadas del mismo atribuyéndose su autoría.

### Exclusión de responsabilidad

La aplicación y su código fuente se proporcionan "tal cual" y exclusivamente con fines
informativos, educativos y de experimentación.

El autor no garantiza que el software esté libre de errores, interrupciones,
vulnerabilidades o fallos, ni que vaya a funcionar correctamente en todos los dispositivos,
navegadores, sistemas o configuraciones.

El autor no se responsabiliza de daños, pérdidas de datos, interrupciones del servicio,
errores, resultados incorrectos o cualquier otro perjuicio que pueda derivarse directa o
indirectamente del uso, modificación, ejecución o distribución del código.

En particular, cualquier información relacionada con alimentación, calorías, peso,
entrenamiento u otros datos relacionados con la salud debe considerarse meramente
orientativa y no constituye asesoramiento médico, nutricional, deportivo o profesional.

Cualquier persona que utilice, modifique o ejecute este código lo hace bajo su propia
responsabilidad y deberá comprobar por sí misma su funcionamiento y adecuación para el
uso que pretenda darle.

### Uso de servicios externos

La aplicación puede utilizar servicios, APIs, librerías, plataformas o recursos de
terceros. El funcionamiento, disponibilidad, condiciones de uso y políticas de dichos
servicios están sujetos a sus respectivos propietarios y proveedores.

El autor no se responsabiliza de cambios, interrupciones, limitaciones, costes,
errores o modificaciones realizadas por dichos servicios externos.

### Contacto y autorización

Cualquier uso que no esté expresamente permitido en este documento deberá contar con la
autorización previa y por escrito del autor.

Para solicitar autorización para utilizar, modificar, redistribuir o incorporar partes
de este proyecto en otro proyecto, puede contactarse con el autor a través de los medios
indicados en el perfil de GitHub.

El acceso al repositorio y la consulta de su contenido no implican la concesión de ningún
derecho adicional sobre el proyecto.

---

**Autor:** Rubén M. Rodríguez Chamorro  
**Proyecto:** Personal  
**Año:** 2026
