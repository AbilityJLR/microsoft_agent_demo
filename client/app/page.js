import ExcelUpload from './components/ExcelUpload';
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>Excel Data Processor</h1>
          <p className={styles.subtitle}>
            Upload and analyze your Excel files with AI-powered insights
          </p>
        </div>
        
        <ExcelUpload />
      </main>
    </div>
  );
}
