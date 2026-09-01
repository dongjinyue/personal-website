type ProjectCardProps = {
  title: string;
  description: string;
};

export default function ProjectCard({
  title,
  description,
}: ProjectCardProps) {
  return (
    <article>
      <h2>{title}</h2>
      <p>{description}</p>
    </article>
  );
}