import HeaderNavigation from "@/components/HeaderNavigation";
import styles from "./Header.module.css";

type Props = {
  showAdmin: boolean;
  tools: Array<{ name: string; url: string; category: string }>;
  categories: string[];
};

export default function Header({ showAdmin, tools, categories }: Props) {
  return (
    <header className={styles.header}>
      <HeaderNavigation showAdmin={showAdmin} tools={tools}
        categories={categories} />
    </header>
  );
}
