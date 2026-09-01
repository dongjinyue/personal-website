import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>我的个人网站</h1>
      <p>这里整理我的项目和常用工具。</p>

      <nav>
        <Link href="/">首页</Link>
        <Link href="/projects">项目</Link>
        <Link href="/tools">工具集</Link>
      </nav>
    </main>
  );
}