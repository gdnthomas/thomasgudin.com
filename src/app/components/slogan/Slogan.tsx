"use client";
import React, { useState, useEffect } from "react";
import styles from "./Slogan.module.css";

export interface ISlogan {
  qualifications: Array<string | null>;
  name: string;
  baseline: string;
}

const Slogan: React.FC<ISlogan> = ({ qualifications, name, baseline }) => {
  const [currentQualification, setCurrentQualification] = useState<
    string | null
  >(null);

  useEffect(() => {
    // Utiliser un effet pour mettre à jour le texte de qualification à chaque rendu
    const intervalId = setInterval(() => {
      // Obtenir l'index actuel
      const currentIndex = qualifications.indexOf(currentQualification);
      // Calculer le prochain index
      const nextIndex = (currentIndex + 1) % qualifications.length;
      // Mettre à jour l'état local avec le prochain texte de qualification
      setCurrentQualification(qualifications[nextIndex]);
    }, 2000);

    // Nettoyer l'intervalle lors du démontage du composant
    return () => clearInterval(intervalId);
  }, [currentQualification, qualifications]);

  return (
    <div className="flex-col text-center">
      <p className={styles.top}>{baseline}</p>
      <p className={styles.name}>{name}</p>
      <p className={styles.metier}>{currentQualification}</p>
    </div>
  );
};
export default Slogan;
