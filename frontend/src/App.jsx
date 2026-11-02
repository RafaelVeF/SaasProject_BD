import Auth from './components/Auth'
import './App.css'

function App() {
  return (
    <main className="app-main">
      <header className="app-header">
        <div className="brand">
          <span className="brand-dot"></span>
          <h1>SaaS Platform</h1>
        </div>
      </header>
      <div className="app-content">
        <Auth />
      </div>
    </main>
  )
}

export default App
