import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  ArMarkerControls,
  ArToolkitContext,
  ArToolkitSource,
} from '@ar-js-org/ar.js/three.js/build/ar-threex.mjs'
import { DEFAULT_MODEL, MODELS } from '../models.js'

// AR.js necesita saber dónde están camera_para.dat y patt.hiro
const BASE_URL = `${import.meta.env.BASE_URL}ar/`

/**
 * Carga un glTF, lo centra en el origen y lo escala a ~1.2 unidades
 * para que se vea bien sobre el marcador sin importar el tamaño original.
 */
async function loadNormalizedModel(url) {
  const gltf = await new GLTFLoader().loadAsync(url)
  const model = gltf.scene

  const box = new THREE.Box3().setFromObject(model)
  const size = new THREE.Vector3()
  const center = new THREE.Vector3()
  box.getSize(size)
  box.getCenter(center)

  const maxSize = Math.max(size.x, size.y, size.z) || 1
  const scale = 1.2 / maxSize
  model.scale.setScalar(scale)
  model.position.copy(center).multiplyScalar(-scale)
  model.position.y += (size.y * scale) / 2

  const pivot = new THREE.Group()
  pivot.add(model)

  let mixer = null
  if (gltf.animations?.length) {
    mixer = new THREE.AnimationMixer(model)
    gltf.animations.forEach((clip) => mixer.clipAction(clip).play())
  }

  return { pivot, mixer }
}

export default function ARScene({
  modelUrl = DEFAULT_MODEL,
  onModelChange,
}) {
  const containerRef = useRef(null)
  const arRef = useRef(null)
  const startingRef = useRef(false)
  const [running, setRunning] = useState(false)
  const [starting, setStarting] = useState(false)
  const [status, setStatus] = useState('')
  const active = running || starting

  function stopAR() {
    const ar = arRef.current
    if (!ar) {
      startingRef.current = false
      setStarting(false)
      return
    }
    arRef.current = null

    cancelAnimationFrame(ar.raf)
    window.removeEventListener('resize', ar.onResize)

    try {
      ar.context?.dispose?.()
      ar.source?.dispose?.()
    } catch {
      // si AR.js ya liberó los recursos, no hacemos nada
    }

    ar.renderer?.dispose()
    ar.renderer?.domElement?.remove()
    ar.source?.domElement?.remove()

    setRunning(false)
    setStarting(false)
    setStatus('')
  }

  useEffect(() => stopAR, [])

  useEffect(() => {
    const ar = arRef.current
    if (!running || !ar || ar.modelUrl === modelUrl) return undefined

    let cancelled = false
    setStatus('Cargando modelo 3D…')

    loadNormalizedModel(modelUrl)
      .then((model) => {
        if (cancelled || arRef.current !== ar) {
          model.mixer?.stopAllAction()
          return
        }

        if (ar.pivot) {
          ar.markerRoot.remove(ar.pivot)
          ar.mixer?.stopAllAction()
        }

        ar.markerRoot.add(model.pivot)
        ar.pivot = model.pivot
        ar.mixer = model.mixer
        ar.modelUrl = modelUrl
        setStatus('Apuntá la cámara al marcador Hiro para ver el modelo 3D.')
      })
      .catch((error) => {
        if (!cancelled && arRef.current === ar) {
          setStatus(`No se pudo cargar el modelo: ${error.message}`)
        }
      })

    return () => {
      cancelled = true
    }
  }, [modelUrl, running])

  async function startAR() {
    const container = containerRef.current
    if (!container || arRef.current || startingRef.current) return
    startingRef.current = true
    setStarting(true)

    setStatus('Pidiendo permiso de cámara…')

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setClearColor(new THREE.Color('lightgrey'), 0)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    )
    scene.add(camera)

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2.5))
    const dirLight = new THREE.DirectionalLight(0xffffff, 3)
    dirLight.position.set(1, 2, 1)
    scene.add(dirLight)

    const markerRoot = new THREE.Group()
    scene.add(markerRoot)

    const source = new ArToolkitSource({
      sourceType: 'webcam',
      displayWidth: window.innerWidth,
      displayHeight: window.innerHeight,
    })

    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('No se pudo acceder a la cámara (timeout).')),
          20000,
        )
        source.init(
          () => {
            clearTimeout(timeout)
            resolve()
          },
          (error) => {
            clearTimeout(timeout)
            reject(new Error(error?.message || 'getUserMedia falló.'))
          },
        )
      })
    } catch (error) {
      renderer.dispose()
      startingRef.current = false
      setStarting(false)
      setStatus(
        `Error: ${error.message} Revisá los permisos de cámara y que la página se abra en https o localhost.`,
      )
      return
    }

    Object.assign(source.domElement.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      zIndex: '0',
    })
    container.appendChild(source.domElement)
    source.domElement.play?.().catch(() => {})

    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.inset = '0'
    renderer.domElement.style.zIndex = '1'
    container.appendChild(renderer.domElement)

    const context = new ArToolkitContext({
      cameraParametersUrl: `${BASE_URL}data/camera_para.dat`,
      detectionMode: 'mono',
      maxDetectionRate: 60,
      canvasWidth: 480,
      canvasHeight: 360,
    })

    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('AR.js no pudo inicializar la calibración de cámara.')),
          15000,
        )
        context.init(() => {
          clearTimeout(timeout)
          camera.projectionMatrix.copy(context.getProjectionMatrix())
          resolve()
        })
      })
    } catch (error) {
      renderer.dispose()
      renderer.domElement.remove()
      source.domElement.remove()
      startingRef.current = false
      setStarting(false)
      setStatus(`Error: ${error.message}`)
      return
    }

    // Marcador Hiro (marcador por defecto de AR.js)
    new ArMarkerControls(context, markerRoot, {
      type: 'pattern',
      patternUrl: `${BASE_URL}data/patt.hiro`,
      changeMatrixMode: 'modelViewMatrix',
      minConfidence: 0.6,
    })

    setStatus('Cargando modelo glTF…')
    let mixer = null
    let pivot = null
    let modelStatus = 'Apuntá la cámara al marcador Hiro para ver el modelo 3D.'
    try {
      const model = await loadNormalizedModel(modelUrl)
      mixer = model.mixer
      pivot = model.pivot
      markerRoot.add(pivot)
    } catch (error) {
      modelStatus = `No se pudo cargar el modelo: ${error.message}`
    }

    const onResize = () => {
      source.onResizeElement()
      source.copyElementSizeTo(renderer.domElement)
      if (context.arController) {
        source.copyElementSizeTo(context.arController.canvas)
      }
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    arRef.current = {
      source,
      context,
      renderer,
      scene,
      camera,
      markerRoot,
      pivot,
      mixer,
      modelUrl,
      lastTime: performance.now(),
      raf: 0,
      onResize,
    }

    const animate = () => {
      const ar = arRef.current
      if (!ar) return
      ar.raf = requestAnimationFrame(animate)

      const now = performance.now()
      ar.mixer?.update((now - ar.lastTime) / 1000)
      ar.lastTime = now

      ar.context.update(ar.source.domElement)
      // El marcador sólo se ve cuando la cámara está calibrada
      ar.scene.visible = ar.camera.visible
      ar.renderer.render(ar.scene, ar.camera)
    }
    animate()

    startingRef.current = false
    setRunning(true)
    setStarting(false)
    setStatus(modelStatus)
  }

  return (
    <div className="ar-demo">
      <div className={active ? 'viewer-toolbar is-active' : 'viewer-toolbar'}>
        {!active && <p className="hint">Elige un modelo y apunta al marcador Hiro.</p>}
        <div className="toolbar-actions">
          <label className="ar-model-picker">
            <span>Modelo</span>
            <select
              aria-label="Modelo 3D para AR"
              value={modelUrl}
              onChange={(event) => onModelChange?.(event.target.value)}
            >
              {MODELS.map((model) => (
                <option key={model.url} value={model.url}>
                  {model.label}
                </option>
              ))}
            </select>
          </label>
          {active ? (
            <button
              type="button"
              onClick={stopAR}
              disabled={starting}
              aria-live="polite"
            >
              {starting ? 'Iniciando…' : 'Detener AR'}
            </button>
          ) : (
            <button type="button" onClick={startAR}>
              Iniciar AR
            </button>
          )}
        </div>
      </div>

      {status &&
        (!active || status.startsWith('Error:') || status.startsWith('No se pudo')) && (
          <p className="status">{status}</p>
        )}

      <div
        ref={containerRef}
        className={active ? 'ar-stage is-running' : 'ar-stage'}
      />
    </div>
  )
}
