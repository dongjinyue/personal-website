import HeaderNavigation from "@/components/HeaderNavigation";
import type { KnowledgeNavigationGroup } from "@/lib/knowledge/repository";
import styles from "./Header.module.css";

type Props = {
  showAdmin: boolean;
  projects: Array<{ name: string; slug: string }>;
  tools: Array<{ name: string; url: string; category: string }>;
  categories: string[];
  knowledgeGroups: KnowledgeNavigationGroup[];
};

export default function Header({ showAdmin, projects, tools, categories, knowledgeGroups }: Props) {
  return (
    <header className={styles.header}>
      <HeaderNavigation showAdmin={showAdmin} projects={projects} tools={tools}
        categories={categories} knowledgeGroups={knowledgeGroups} />
    </header>
  );
}
