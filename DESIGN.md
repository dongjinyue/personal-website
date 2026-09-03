---
version: alpha
name: "MY SPACE"
description: "面向个人长期使用的项目、工具与学习入口，强调清晰、克制和可靠。"
colors:
  background: "#f8f9fc"
  surface: "#ffffff"
  foreground: "#172036"
  muted: "#637089"
  line: "#dce2eb"
  accent: "#5d63e7"
  accent-soft: "#eef0ff"
  danger: "#a31e31"
typography:
  sans:
    fontFamily: "Inter, PingFang SC, Microsoft YaHei, sans-serif"
  display:
    fontFamily: "Noto Serif SC, Songti SC, STSong, serif"
  utility:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
rounded:
  sm: "0.5rem"
  DEFAULT: "1rem"
  pill: "999px"
spacing:
  page-gutter-desktop: "24px"
  page-gutter-mobile: "14px"
  content-width: "1180px"
components:
  button:
    minHeight: "2.75rem"
  field:
    radius: "0.5rem"
  panel:
    maxWidth: "36rem"
---

# MY SPACE Design System

## Overview

界面以“个人工作台中的索引卡与轨道图”为视觉参照：公开页面可以通过轨道图表达个人空间，认证和后台页面则保持安静、直接。受众是网站本人和公开访客；界面语言为简体中文，代码中的少量英文标签只承担栏目索引作用。公开路由偏品牌表达，`/login` 与 `/admin` 属于产品界面，可靠性和任务清晰度优先。

视觉记忆点是首页圆形轨道；认证流程不复制装饰，避免让安全操作看起来像营销落地页。避免霓虹暗色后台、重阴影卡片和无意义渐变。运行时颜色以 `app/globals.css` 的 CSS 变量为唯一实现来源，本文件记录这些现有值和使用理由，不生成第二套令牌。

## Colors

浅灰蓝 `background` 承载页面，白色 `surface` 区分内容面；深蓝灰 `foreground` 与 `muted` 建立文字层级。紫色 `accent` 用于品牌强调、主要操作和焦点，`danger` 只用于需要纠正的错误文字。高对比模式服从系统颜色。

## Typography

正文和表单使用覆盖中英文的无衬线字体栈；标题可使用宋体风格展示字体；英文栏目标签和技术性短文本使用等宽字体。中文正文保持舒展行高，不使用斜体表达语义。

## Layout

公开内容最大宽度为 1180px，桌面和移动端分别保留 24px、14px 水平边距。认证面板最大宽度 36rem，窄屏始终保留 1rem 外边距。后台桌面端采用 14rem 导航与弹性内容列，760px 以下转为上方换行导航；页面保持自然滚动，只有数据表格拥有局部横向滚动。加载或错误消息预留高度，防止按钮和字段跳动。

## Elevation & Depth

层级主要依靠背景色和 1px 边框，不在静态认证面板使用阴影。首页交互卡片悬停时允许轻微抬升，后台常规内容不沿用该动效。

## Shapes

表单控件使用 0.5rem 圆角，面板使用 1rem 圆角；品牌行动按钮和轨道采用胶囊或圆形。轮廓保持简洁，不叠加多重描边。

## Components

按钮需要默认、悬停、按下、键盘焦点、禁用和等待状态。认证字段使用真实标签、浏览器自动填充语义和可见焦点；错误在表单内以文字展示，并通过状态区域通知辅助技术。后台导航使用真实链接并通过 `aria-current` 表达当前位置，刷新使用原生按钮；工具列表使用服务端分页，明确当前范围、总数、排序和时区。

工具的新建和编辑共用一份表单；保存成功回到列表第一页，取消返回来源页，失败保留输入。离开脏表单时，显式站内链接、刷新和退出共用未保存确认。永久删除使用应用内模态框、数据库版本条件和服务端重新计数；没有回收站或虚假撤销。所有后台查询与写入操作独立验证管理员，不以布局或导航可见性代替权限检查。

图标沿用细描边 SVG，并在有歧义时保留文字标签。动效只反馈悬停和按下，`prefers-reduced-motion`（减少动态效果偏好）下取消过渡。界面文案使用直接的动作词和可恢复的错误提示，不暴露密码、Cookie 或令牌。

## Do's and Don'ts

- **Do:** 复用全局颜色变量、字体层级和可见焦点样式。
- **Do:** 在读取后台内容之前完成服务端授权检查。
- **Don't:** 用装饰或动画削弱登录、退出等安全操作的清晰度。
- **Don't:** 仅靠颜色、查询字符串或客户端字段表达权限结果。
