import { Activity } from 'lucide-react'

export default function LoadingScreen({ label = 'Loading MediQueue' }) {
  return (
    <div className="loading-screen">
      <div className="brand-mark brand-mark--large">
        <Activity size={28} strokeWidth={2.4} />
      </div>
      <p>{label}</p>
      <span className="loading-line" />
    </div>
  )
}
