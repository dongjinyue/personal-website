import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { KnowledgeMarkdown } from "../../components/knowledge/KnowledgeMarkdown";
import { getDetailForViewer } from "../../lib/knowledge/access";
import type { KnowledgeNoteSource } from "../../lib/knowledge/types";

type Input = {
  source: KnowledgeNoteSource;
  targets: KnowledgeNoteSource[];
  showBrokenLinkWarnings: boolean;
};

const input = JSON.parse(readFileSync(0, "utf8")) as Input;
const viewer = input.showBrokenLinkWarnings
  ? { role: "admin" as const, userId: "test-admin" }
  : { role: "guest" as const };
const detail = getDetailForViewer(input.source.slug, viewer, [input.source, ...input.targets]);
if (!detail) throw new Error("测试笔记不可见");
const html = renderToStaticMarkup(
  createElement(KnowledgeMarkdown, {
    note: detail,
    relations: {
      outgoingBySlug: new Map([[detail.slug, detail.outgoing.map((item) => item.slug)]]),
      backlinksBySlug: new Map([[detail.slug, detail.backlinks.map((item) => item.slug)]]),
      brokenBySlug: new Map([[detail.slug, detail.broken.map((item) => item.slug)]]),
    },
    showBrokenLinkWarnings: input.showBrokenLinkWarnings,
  }),
);

process.stdout.write(html);
