# Clase 14 · React + three.js + AR.js

Proyecto de realidad aumentada con **React + Vite**, **three.js**, **react-three-fiber**
y **AR.js**, usando los modelos del repositorio
[KhronosGroup/glTF-Sample-Assets](https://github.com/KhronosGroup/glTF-Sample-Assets).

## Qué incluye

- **Realidad aumentada (AR.js)**: marcador **Hiro** + modelo glTF cargado con `GLTFLoader`.
- **Visor 3D (R3F)**: escena de react-three-fiber con `OrbitControls`, sombras y animaciones glTF.
- Selector de modelo (cubo, Fox animado, Damaged Helmet, Avocado, Boom Box).
- `glTF-Sample-Assets` clonado completo dentro del proyecto.

## Requisitos

- Node.js 20+ (probado con Node 24)
- Git
- Una webcam (para la parte de AR)

## Puesta en marcha

```bash
npm install        # ya ejecutado
npm run dev        # https://localhost:5173
```

El servidor arranca con **HTTPS autofirmado** (plugin `@vitejs/plugin-basic-ssl`)
porque los navegadores sólo permiten usar la cámara en `https` o `localhost`.
La primera vez el navegador va a mostrar una advertencia de certificado:
elegí *Avanzado → Continuar*.

### Proyectar el modelo 3D con la cámara

1. Ejecutá `npm run dev` y abrí `https://localhost:5173` en la laptop. También
   podés abrir la dirección de red que imprime Vite desde otro dispositivo.
2. Elegí un modelo y presioná **Iniciar AR**; aceptá el permiso para usar la cámara.
3. Imprimí el marcador **Hiro** o mostralo en la pantalla de otro dispositivo y
   apuntá la cámara hacia él:
   - [Imagen del marcador](https://ar-js-org.github.io/AR.js/data/images/HIRO.jpg)
   - Archivo local: `public/ar/data/patt.hiro`
4. Cuando la cámara reconozca el marcador, el modelo 3D aparecerá encima. Para
   terminar, presioná **Detener AR**.

La cámara debe estar habilitada y la página debe abrirse desde `https` o
`localhost`. Si la cámara no inicia, revisá el permiso del navegador y cerrá
otras aplicaciones que la estén usando.
El cubo se selecciona inicialmente y el procesamiento de cámara está ajustado
para una detección más rápida del marcador.

## Repo de modelos (glTF-Sample-Assets)

Se clonó completo en `./glTF-Sample-Assets` (con `--depth 1` para no bajar todo el
historial). Si lo borraste, se recupera con:

```bash
npm run clone-assets
```

Los modelos se referencian por ruta, por ejemplo:

```js
'/glTF-Sample-Assets/Models/Fox/glTF-Binary/Fox.glb'
```

> **Importante:** el servidor de desarrollo de Vite sirve cualquier archivo que esté
> dentro del proyecto, así que en `npm run dev` las rutas funcionan. En un `npm run build`
> esos archivos **no** se copian a `dist/`. Si necesitás publicarlo, copiá a `public/`
> sólo los modelos que uses (o importalos con `import url from '...?url'`).
>
> El repo está en `.gitignore` porque pesa varios GB.

## Estructura

```
clase 14/
├─ glTF-Sample-Assets/          # repo de Khronos (modelos .gltf/.glb)
├─ public/ar/data/
│  ├─ camera_para.dat           # calibración de cámara para AR.js
│  └─ patt.hiro                 # marcador Hiro
├─ src/
│  ├─ App.jsx                   # tabs AR / visor y selector de modelo
│  ├─ App.css
│  ├─ ar/ARScene.jsx            # AR.js + three.js (cámara, marcador, glTF)
│  └─ components/ModelViewer.jsx# visor con react-three-fiber
└─ vite.config.js               # HTTPS + dedupe de three
```

## Notas técnicas

- **Una sola copia de three**: `@ar-js-org/ar.js` trae su propio `three`; se fuerza el
  dedupe en `vite.config.js` para evitar dos instancias.
- **Sin `StrictMode`**: en desarrollo monta los efectos dos veces y AR.js abriría la
  cámara dos veces.
- **`glTF-Sample-Assets`** se clona con `core.longpaths=true` por las rutas largas de
  algunos modelos en Windows.
- `npm install` reporta vulnerabilidades en dependencias de AR.js (`aframe`, etc.);
  son del paquete de terceros y no afectan el funcionamiento del proyecto.

## Partes importantes del código

- **`src/App.jsx`** controla la pantalla seleccionada (realidad aumentada o visor 3D)
  y mantiene el modelo elegido. Comparte ese modelo con la escena AR y el visor.
- **`src/models.js`** contiene el catálogo de modelos y sus rutas. El cubo es la
  opción inicial.
- **`src/ar/ARScene.jsx`** solicita acceso a la cámara, inicializa AR.js, configura
  el marcador Hiro y dibuja el modelo 3D sobre él. También permite reemplazar el
  modelo desde el selector sin detener la cámara.
- **`loadNormalizedModel`**, en `src/ar/ARScene.jsx`, centra y escala los modelos
  para que se vean sobre el marcador.
- **`src/components/ModelViewer.jsx`** muestra el modelo en una escena 3D que se
  puede explorar con el mouse.
- **`vite.config.js`** configura HTTPS local para permitir el acceso del navegador
  a la cámara.

### Explicación breve para presentar el proyecto

> La interfaz está hecha en React. AR.js utiliza la cámara para reconocer el
> marcador Hiro; cuando lo detecta, Three.js dibuja sobre él el modelo 3D elegido.
> Los modelos se cargan desde un catálogo y se pueden cambiar sin apagar la cámara.
> También hay un visor 3D para explorar los modelos por separado.

La escena superpone el modelo en la imagen de la cámara; no proyecta la imagen en
una pared mediante un proyector físico.
