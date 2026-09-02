type ToolCardProps = {
  name: string;
  description: string;
  url: string;
  headingLevel?: "h2" | "h3";
};

export default function ToolCard({
  name,
  description,
  url,
  headingLevel = "h2",
}: ToolCardProps) {
  // 与 ProjectCard 保持一致，方便父页面维护正确的标题层级。
  const Heading = headingLevel;

  return (
    <article>
      <Heading>{name}</Heading>
      <p>{description}</p>

      <a href={url} target="_blank" rel="noreferrer">
        打开工具
      </a>
    </article>
  );
}
