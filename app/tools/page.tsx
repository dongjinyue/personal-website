import ToolCard from "@/components/ToolCard";

export default function ToolsPage() {
  return (
    <main>
      <h1>工具集</h1>

      <ToolCard
        name="GitHub"
        description="代码托管平台"
        url="https://github.com"
      />

      <ToolCard
        name="ChatGPT"
        description="AI 助手"
        url="https://chatgpt.com"
      />
    </main>
  );
}