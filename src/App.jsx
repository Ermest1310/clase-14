import { useState } from 'react'
import ARScene from './ar/ARScene.jsx'
import ModelViewer from './components/ModelViewer.jsx'
import { DEFAULT_MODEL, MODELS } from './models.js'
import './App.css'

export default function App() {
  const [tab, setTab] = useState('ar')
  const [modelUrl, setModelUrl] = useState(DEFAULT_MODEL)
  const model = MODELS.find((item) => item.url === modelUrl) ?? MODELS[0]

  return (
    <div className="app">
      <header className="app-header">
        <h1>Realidad aumentada</h1>

        {tab === 'viewer' && (
          <label className="model-picker">
            Modelo 3D
            <select
              value={model.url}
              onChange={(event) => setModelUrl(event.target.value)}
            >
              {MODELS.map((item) => (
                <option key={item.url} value={item.url}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      <nav className="tabs" aria-label="Modo de visualización">
        <button
          type="button"
          className={tab === 'ar' ? 'tab is-active' : 'tab'}
          aria-pressed={tab === 'ar'}
          onClick={() => setTab('ar')}
        >
          Proyectar con cámara
        </button>
        <button
          type="button"
          className={tab === 'viewer' ? 'tab is-active' : 'tab'}
          aria-pressed={tab === 'viewer'}
          onClick={() => setTab('viewer')}
        >
          Explorar modelo 3D
        </button>
      </nav>

      <main className="app-main">
        {tab === 'ar' ? (
          <ARScene modelUrl={model.url} onModelChange={setModelUrl} />
        ) : (
          <ModelViewer modelUrl={model.url} label={model.label} />
        )}
      </main>
    </div>
  )
}
