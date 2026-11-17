import { Component, Suspense, useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  Bounds,
  Center,
  ContactShadows,
  OrbitControls,
  useAnimations,
  useGLTF,
  useProgress,
} from '@react-three/drei'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'

function GltfModel({ url }) {
  const { scene, animations } = useGLTF(url)
  // Clonamos porque el objeto cacheado por useGLTF se comparte entre montajes
  const model = useMemo(() => cloneSkeleton(scene), [scene])
  const { actions, mixer } = useAnimations(animations, model)

  useEffect(() => {
    const clips = Object.values(actions)
    clips.forEach((action) => action.reset().play())
    return () => {
      clips.forEach((action) => action.stop())
      mixer.stopAllAction()
    }
  }, [actions, mixer])

  return <primitive object={model} />
}

/**
 * Atrapa los errores de carga del glTF (por ejemplo si falta el repo de
 * assets) para que no rompan todo el canvas.
 */
class ModelBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    this.props.onError?.(error)
  }

  render() {
    if (this.state.error) return null
    return this.props.children
  }
}

export default function ModelViewer({ modelUrl, label }) {
  const [failed, setFailed] = useState(false)
  const { active } = useProgress()

  useEffect(() => setFailed(false), [modelUrl])

  return (
    <>
      <div className="viewer">
        <Canvas
          camera={{ position: [2.5, 2, 3.5], fov: 45 }}
          shadows="percentage"
          dpr={[1, 2]}
        >
          <color attach="background" args={['#14161c']} />
          <hemisphereLight intensity={1.2} groundColor="#20232b" />
          <directionalLight
            position={[4, 6, 3]}
            intensity={2.5}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <Suspense fallback={null}>
            <ModelBoundary key={modelUrl} onError={() => setFailed(true)}>
              <Bounds fit clip observe margin={1.3}>
                <Center>
                  <GltfModel url={modelUrl} />
                </Center>
              </Bounds>
            </ModelBoundary>
            <ContactShadows
              position={[0, -0.01, 0]}
              opacity={0.45}
              scale={10}
              blur={2}
              far={4}
            />
          </Suspense>
          <OrbitControls makeDefault enablePan={false} />
        </Canvas>

        {failed ? (
          <div className="viewer-overlay error">
            No se pudo cargar el modelo.
            <br />
            ¿Está clonado <code>glTF-Sample-Assets</code>? (`npm run
            clone-assets`)
          </div>
        ) : (
          active && <div className="viewer-overlay">Cargando {label}…</div>
        )}
      </div>

      <p className="viewer-hint">
        Arrastrá para rotar · rueda del mouse para hacer zoom
      </p>
    </>
  )
}
