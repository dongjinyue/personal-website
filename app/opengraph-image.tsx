import { ImageResponse } from "next/og";

export const alt = "MY SPACE：AI 新闻、项目与知识笔记";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** 分享图只使用内置字体和品牌文字，生成时不依赖外部图片或字体服务。 */
export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: "70px 80px", background: "#f8f9fc", color: "#172036", borderTop: "12px solid #0752ef" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#637089" }}>
        <span>dongjinyue.cn</span><span>AI / PROJECTS / KNOWLEDGE</span>
      </div>
      <div style={{ display: "flex", fontSize: 112, fontWeight: 700, letterSpacing: "-6px", color: "#0752ef" }}>MY SPACE</div>
      <div style={{ display: "flex", width: "100%", height: 2, background: "#dce2eb" }} />
    </div>,
    size,
  );
}
