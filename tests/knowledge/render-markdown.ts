import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { KnowledgeMarkdown } from "../../components/knowledge/KnowledgeMarkdown";
import { buildKnowledgeRelations } from "../../lib/knowledge/relations";
import type { KnowledgeNoteSource } from "../../lib/knowledge/types";

type Input = {
  source: KnowledgeNoteSource;
  targets: KnowledgeNoteSource[];
  showBrokenLinkWarnings: boolean;
};

const input = JSON.parse(readFileSync(0, "utf8")) as Input;
const html = renderToStaticMarkup(
  createElement(KnowledgeMarkdown, {
    note: input.source,
    relations: buildKnowledgeRelations([input.source, ...input.targets]),
    showBrokenLinkWarnings: input.showBrokenLinkWarnings,
  }),
);

process.stdout.write(html);
