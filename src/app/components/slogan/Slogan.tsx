import styles from "./Slogan.module.css";

export interface ISlogan {
  qualifications: Array<string>;
}

const Slogan: React.FC<ISlogan> = ({ qualifications }) => {
  const listItems = qualifications.map((qualif) => (
    <div key={qualif}>{qualif}</div>
  ));
  return <div className={styles.container}>{listItems}</div>;
};

export default Slogan;
