import Link from "next/link";

export default function Header() {
  return (
    <header>
      <nav>
        <Link href="/">首页</Link>
        <Link href="/projects">项目</Link>
        <Link href="/tools">工具集</Link>
      </nav>
    </header>
  );
}