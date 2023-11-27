import Slogan from './components/slogan/Slogan'

export default function Home() {
  return (
    <main className="flex min-h-screen grid grid-cols-1 bg-blue content-center ">
      <div className="text-center">
        <p>Bienvenue, je suis</p>
        <p>Thomas Gudin</p>
        <p>UX Dévelopeur</p>
        <Slogan qualifications={["Dresseur de loutres", "Pompier pour sites", "Chasseur de licornes", "Maker"]} />
      </div>
    </main>
  )
}
