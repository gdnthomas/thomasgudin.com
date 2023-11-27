import Slogan from './components/slogan/Slogan'

export default function Home() {
  return (
    <main className="flex min-h-screen grid grid-cols-1 bg-blue content-center ">
      <div className="text-center">
        Bienvenue, je suis
        Thomas Gudin
        Dévelopeur
        <Slogan qualifications={["Dresseur de loutres", "Pompier pour sites"]} />
      </div>
    </main>
  )
}
