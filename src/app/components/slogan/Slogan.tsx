import styles from "./Slogan.module.css";

export interface ISlogan {
  qualifications: Array<string>;
}

const Slogan: React.FC<ISlogan> = ({ qualifications }) => {

  return (
  <div className={styles.container}>{qualifications}</div>
  );
};

export default Slogan;
