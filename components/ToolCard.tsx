type ToolCardProps = {
  name: string;
  description: string;
  url: string;
};

export default function ToolCard({
  name,
  description,
  url,
}: ToolCardProps) {
  return (
    <article>
      <h2>{name}</h2>
      <p>{description}</p>

      <a href={url} target="_blank" rel="noreferrer">
        打开工具
      </a>
    </article>
  );
}