import Sidebar from '@/components/Sidebar'

export default function HomeLayout({ children }) {
  return (
    <div className="min-h-screen bg-black flex">
      <Sidebar />
      <main className="ml-60 flex-1 min-h-screen p-8">
        {children}
      </main>
    </div>
  )
}
