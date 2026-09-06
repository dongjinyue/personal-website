"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./NewsHome.module.css";

// 演示数据与未来的采集数据隔离，不伪造新闻来源、发布时间或自动更新状态。
const articles = [
  { id: "multimodal", category: "模型动态", title: "多模态模型的新进展", description: "从读懂文字，到理解图像与声音。关注不同模态如何协同工作，以及它们能解决哪些真实问题。", detail: "未来简报将在这里整理模型发布的原始来源、能力变化与使用限制，帮助读者区分产品演示和实际可用的能力。", kind: "media" },
  { id: "coding", category: "AI 产品", title: "AI 编程工具更新观察", description: "代码补全、项目理解、调试与审查：从开发者的日常流程出发，记录编程助手值得关注的变化。", detail: "这里将保留官方发布说明链接。当前文字只用于展示阅读布局，不代表某款产品已发布新功能。", kind: "code" },
  { id: "opensource", category: "开发技术", title: "开源模型与开发者生态", description: "从模型权重到推理工具，关注开源生态中的实用资源，让新的想法更容易走向动手实践。", detail: "后续内容会注明项目地址、许可证和运行条件，避免将开放权重与完全开源混为一谈。", kind: "network" },
  { id: "agents", category: "行业观察", title: "智能体应用有哪些新方向", description: "当 AI 从回答问题走向执行任务，工作流、工具调用与人工确认如何配合，是更值得观察的部分。", detail: "这一栏目将关注可验证的真实案例，以及隐私、权限和可靠性方面的边界，而不只记录宣传中的效率数字。", kind: "agent" },
  { id: "local", category: "开发技术", title: "把 AI 放在本地运行", description: "探索本地推理的使用场景：硬件需求、响应速度与数据隐私，是选择工具时需要一起考虑的问题。", detail: "后续简报会为实践资源注明适用环境和原始出处。当前是版式示例，不包含未经验证的性能数据。", kind: "code" },
  { id: "reading", category: "行业观察", title: "读 AI 新闻，也保留自己的判断", description: "先看原始来源，再看测试条件。把发布事实、作者观点与尚未证实的消息分开，建立自己的信息节奏。", detail: "每日采集功能接入后，新闻会附带来源与采集时间；自动生成的摘要也应清楚标识，方便回到原文核对。", kind: "media" },
] as const;
const categories = ["全部", "模型动态", "AI 产品", "开发技术", "行业观察"];

// 矢量插画预留固定比例，避免图片加载造成列表跳动。
function Illustration({ kind }: { kind: string }) {
  return <div className={`${styles.illustration} ${styles[kind] ?? ""}`} aria-hidden="true">
    <svg viewBox="0 0 320 170" fill="none">
      <path d="M-20 140C75 30 90 190 175 75S275 90 345 0M-20 155C75 45 90 205 175 90S275 105 345 15M-20 125C75 15 90 175 175 60S275 75 345-15" stroke="currentColor" opacity=".25" />
      {kind === "code" ? <><path d="M35 30h90M35 43h60M47 56h110M47 69h80M35 82h65M47 95h85M35 108h110M47 121h60M35 134h90" stroke="#448dfc" strokeWidth="3" opacity=".5" /><rect x="170" y="42" width="100" height="86" rx="16" fill="#0863c6" fillOpacity=".4" stroke="#63bdff" /><path d="m205 68-16 17 16 17m31-34 16 17-16 17m-12-42-10 52" stroke="#b9ebff" strokeWidth="4" /></> : kind === "network" ? <><path d="m160 85-80-43m80 43 85-43m-85 43-90 46m90-46 95 46m-95-46V22m0 63v66" stroke="#a099ff" strokeWidth="2" />{[[80,42],[245,42],[70,131],[255,131],[160,22],[160,151]].map(([cx,cy])=><circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="9" fill="#a69aff" stroke="#6e59ff" strokeWidth="6" />)}<path d="m160 53 30 17v34l-30 17-30-17V70Z" fill="#8b8bff" stroke="#d6d5ff" /><path d="m130 70 30 18 30-18m-30 18v33" stroke="#d6d5ff" /></> : kind === "agent" ? <><circle cx="160" cy="88" r="53" fill="#fff" fillOpacity=".45" stroke="#fff" /><rect x="123" y="62" width="74" height="51" rx="23" fill="#247aff" stroke="white" strokeWidth="4" /><circle cx="145" cy="85" r="5" fill="white" /><circle cx="176" cy="85" r="5" fill="white" /><path d="M150 101h21m-11-42V46" stroke="white" strokeWidth="3" /><circle cx="160" cy="43" r="5" fill="#247aff" /><rect x="35" y="36" width="62" height="35" rx="9" fill="white" /><path d="M47 48h38M47 58h25" stroke="#adcfff" strokeWidth="4" /><rect x="226" y="94" width="60" height="36" rx="9" fill="white" /></> : <>{[52,125,198].map((x,i)=><g key={x}><rect x={x} y={48+i*5} width="63" height="65" rx="12" fill="#7cb4ff" fillOpacity=".3" stroke="#a7d3ff" />{i===0?<path d="m62 96 15-19 10 12 8-8 11 15Z" fill="#e0f3ff" />:i===1?<path d="m149 67 21 17-21 17Z" fill="#e0f3ff" />:<path d="M211 75h36m-18 0v29" stroke="#e0f3ff" strokeWidth="5" />}</g>)}</>}
    </svg>
  </div>;
}

export default function NewsHome({ expanded = false }: { expanded?: boolean }) {
  const [category, setCategory] = useState("全部");
  const filtered = articles.filter((item) => category === "全部" || item.category === category);
  const visible = expanded ? filtered : filtered.slice(0, 4);

  return <main className={styles.page}>
    <section className={styles.brief} aria-label="示例简报">
      <div className={styles.date}><strong>09.06</strong><span>设计示例<br /><b>AI 每日简报</b></span></div>
      <div className={styles.highlights}><p><span>✦</span>理解技术变化，发现值得关注的新方向。</p><p><span>↗</span>每天几分钟，让信息成为自己的积累。</p></div>
      <div className={styles.report} aria-hidden="true"><span>AI</span><i /><i /><i /><b>✦</b></div>
    </section>
    <div className={styles.columns}>
      <section className={styles.feed} aria-labelledby="news-title">
        <div className={styles.heading}><h1 id="news-title">AI 新闻</h1><span>示例内容 · 非实时新闻</span></div>
        <div className={styles.filters} aria-label="新闻分类">{categories.map((item)=><button key={item} type="button" aria-pressed={item===category} onClick={()=>setCategory(item)}>{item}</button>)}</div>
        <p className={styles.srOnly} role="status">当前分类：{category}，显示 {visible.length} 条示例</p>
        <div>{visible.map((item)=><article className={styles.article} id={item.id} key={item.id}>
          <span className={styles.category}>{item.category}</span>
          <div className={styles.copy}><h2>{item.title}</h2><p>{item.description}</p><details><summary>阅读示例 <span aria-hidden="true">↗</span></summary><p>{item.detail}</p></details><span className={styles.demo}>栏目预览 · 示例选题</span></div>
          <Illustration kind={item.kind} />
        </article>)}</div>
        {!expanded && <Link className={styles.more} href="/news">查看更多新闻 <span aria-hidden="true">→</span></Link>}
        {expanded && <p className={styles.end}>已展示全部 {visible.length} 条示例内容</p>}
      </section>
      <aside className={styles.sidebar} aria-label="简报补充信息">
        <section className={styles.sideCard}>
          <h2>今日关注 <span className={styles.hot}>✦</span></h2>
          <p className={styles.sideNote}>示例选题</p>
          <ol className={styles.ranking}>
            {articles.slice(0,5).map((item,index)=><li key={item.id}>
              <span>{index+1}</span>
              {/* 清除当前筛选，确保关注列表的目标文章没有被隐藏。 */}
              <Link href={`/news#${item.id}`} onClick={() => setCategory("全部")}>{item.title}</Link>
            </li>)}
          </ol>
        </section>
        <section className={styles.sideCard}><h2>关于这里</h2><div className={styles.about}><div className={styles.avatar} aria-hidden="true">M<span>SPACE</span></div><p>一个持续生长的个人空间。<br />关注 AI 的新变化，记录学习与实践，在信息之外，留一点自己的思考。</p></div><p className={styles.signature}>持续学习 · 认真记录 · 分享发现</p></section>
        <section className={styles.sideCard}><h2>往期简报</h2><div className={styles.archive}><span aria-hidden="true">▤</span><h3>从第一期开始积累</h3><p>每日新闻采集尚未接入。<br />正式发布后，这里将按日期归档。</p></div><Link className={styles.archiveLink} href="/news">浏览示例内容 →</Link></section>
        <p className={styles.notice}>新闻与关注列表均为示例，不代表当天实际资讯。</p>
      </aside>
    </div>
  </main>;
}
