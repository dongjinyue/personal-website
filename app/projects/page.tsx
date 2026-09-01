import ProjectCard from "@/components/ProjectCard";

export default function ProjectsPage() {
  return (
    <main>
      <h1>我的项目</h1>

      <ProjectCard
        title="AI Workspace Agent"
        description="我的 AI 工作空间项目"
      />

      <ProjectCard
        title="Personal Website"
        description="我的个人网站"
      />
    </main>
  );
}