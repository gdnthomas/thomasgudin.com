import Slogan from "./components/slogan/Slogan";
import { SocialIcon } from "react-social-icons";

export default function Home() {
  return (
    <main className="bg-color-animate min-h-screen grid grid-cols-1 content-center">
      <div>
        <Slogan
          baseline="Bonjour, je suis"
          name="Thomas Gudin"
          qualifications={[
            "UX Dévelopeur",
            "Dresseur de loutres",
            "Pompier pour sites",
            "Chasseur de licornes",
            "Maker",
          ]}
        />
      </div>
      <div className="flex justify-center space-x-10 pt-10 ">
        <SocialIcon
          url="https://www.linkedin.com/in/thomas-gudin-66894414/"
          bgColor="#FFFFFF"
          fgColor="none"
        />
        <SocialIcon
          url="https://www.youtube.com/channel/UCxh_ztpKYXGYO9w9pXJ4DuQ"
          bgColor="#FFFFFF"
          fgColor="none"
        />
        <SocialIcon
          url="https://www.instagram.com/atelier.de.la.loutre/"
          bgColor="#FFFFFF"
          fgColor="none"
        />
        <SocialIcon
          url="https://github.com/gdnthomas"
          bgColor="#FFFFFF"
          fgColor="none"
        />
      </div>
    </main>
  );
}
