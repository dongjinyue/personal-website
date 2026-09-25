/** 从 notes/ 后的目录路径推导分类；嵌套笔记使用一级子目录作为细分分类。 */
function categoryDirectories(path: string): string[] {
  const segments = path.split(/[\\/]+/).filter(Boolean);
  const notesIndex = segments.indexOf("notes");
  if (notesIndex < 0) return [];

  const directories = segments.slice(notesIndex + 1);
  const lastSegment = directories.at(-1);
  if (lastSegment === ".gitkeep" || lastSegment?.toLowerCase().endsWith(".md")) {
    directories.pop();
  }
  return directories;
}

function categoryLabel(directories: readonly string[]): string {
  const root = directories[0];
  if (!root) return "";

  // 路径仍保持 notes/ai/...；只把网站上显示的分类名称规范成大写 AI。
  const subcategory = directories[1];
  if (root.toLocaleLowerCase("en-US") === "ai") {
    return subcategory ? `AI · ${subcategory}` : "AI";
  }

  // 其他知识主题仍按 notes/ 下的一级目录分类，不因内部整理目录而拆散。
  return root;
}

/** 笔记和空目录标记使用同一套目录规则，以保证筛选分类一致。 */
export function categoryFromPath(path: string): string {
  return categoryLabel(categoryDirectories(path));
}

/** 从 Git 跟踪的笔记和 .gitkeep 文件汇总分类，并隐藏仅用于收纳子类的父目录。 */
export function categoriesFromPaths(paths: readonly string[]): string[] {
  const markdownPaths = paths.filter((path) => path.toLowerCase().endsWith(".md"));
  const markerPaths = paths.filter((path) => path.split(/[\\/]+/).at(-1) === ".gitkeep");
  const categories = new Set(
    markdownPaths.map(categoryFromPath).filter((category) => category.length > 0),
  );

  for (const markerPath of markerPaths) {
    const markerDirectories = categoryDirectories(markerPath);
    const category = categoryLabel(markerDirectories);
    if (!category || categories.has(category)) continue;

    const hasDescendant = paths.some((candidatePath) => {
      if (candidatePath === markerPath) return false;
      const candidateDirectories = categoryDirectories(candidatePath);
      return candidateDirectories.length > markerDirectories.length
        && markerDirectories.every((segment, index) => candidateDirectories[index] === segment);
    });

    if (!hasDescendant) categories.add(category);
  }

  return [...categories].sort((left, right) => left.localeCompare(right, "zh-Hans-CN"));
}
