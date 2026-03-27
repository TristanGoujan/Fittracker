import Navbar from '../components/Navbar'

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold mb-2">Dashboard</h2>
        <p className="text-zinc-500">Les graphiques et stats arrivent au Jalon 4.</p>
      </main>
    </div>
  )
}
