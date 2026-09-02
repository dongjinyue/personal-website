-- Day 9 SQL 基础练习。
-- 当前文件用于学习关系型数据库语法，Day 10 再由 Prisma 管理真实结构。

-- SQLite 默认可能不检查外键；显式开启后，引用和级联删除约束才会生效。
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tools (
  -- 文本主键稳定且唯一地标识每一个工具。
  id TEXT PRIMARY KEY,
  -- 名称是页面展示的核心信息，不允许为空。
  name TEXT NOT NULL,
  -- 简介用于帮助用户理解工具用途，不允许为空。
  description TEXT NOT NULL,
  -- 每个工具都必须具有可访问的外部地址，并防止重复收录同一地址。
  url TEXT NOT NULL UNIQUE,
  -- CHECK 把分类限制在项目已支持的四种合法值内。
  category TEXT NOT NULL
    CHECK (category IN ('AI', '开发', '学习', '效率')),
  -- SQLite 用 0 和 1 表示布尔值；默认 0，并拒绝其他整数。
  is_favorite INTEGER NOT NULL DEFAULT 0
    CHECK (is_favorite IN (0, 1)),
  -- 创建时间用于审计记录何时产生，不允许为空。
  created_at TEXT NOT NULL,
  -- 更新时间用于判断记录最后一次变化，不允许为空。
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  -- 自增整数主键由数据库生成，调用方无需计算标识。
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- 标签必须有名称且不能重名，便于可靠复用。
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS tool_tags (
  -- 两个外键都不能为空，否则这条关联没有意义。
  tool_id TEXT NOT NULL,
  tag_id INTEGER NOT NULL,
  -- 复合主键阻止同一工具重复关联同一标签。
  PRIMARY KEY (tool_id, tag_id),
  -- 删除工具时只清理关联行，不会删除仍可复用的标签。
  FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE,
  -- 删除标签时清理所有指向它的工具关联行。
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- category 经常作为筛选条件；索引可加快数据量增大后的分类查询。
CREATE INDEX IF NOT EXISTS idx_tools_category ON tools(category);

-- 插入四个真实工具。重复执行本练习会触发主键或 URL 唯一约束，这是预期行为。
INSERT INTO tools (
  id, name, description, url, category,
  is_favorite, created_at, updated_at
) VALUES
  (
    'github', 'GitHub', '用于保存代码、管理版本和协作开发。',
    'https://github.com', '开发', 1,
    '2026-09-02T00:00:00.000Z', '2026-09-02T00:00:00.000Z'
  ),
  (
    'chatgpt', 'ChatGPT', '用于学习、思考和辅助项目开发。',
    'https://chatgpt.com', 'AI', 1,
    '2026-09-02T00:00:00.000Z', '2026-09-02T00:00:00.000Z'
  ),
  (
    'mdn', 'MDN Web Docs', '用于查询 Web 平台技术文档。',
    'https://developer.mozilla.org', '学习', 0,
    '2026-09-02T00:00:00.000Z', '2026-09-02T00:00:00.000Z'
  ),
  (
    'typescript-playground', 'TypeScript Playground', '用于在线编写并检查 TypeScript 代码。',
    'https://www.typescriptlang.org/play', '开发', 0,
    '2026-09-02T00:00:00.000Z', '2026-09-02T00:00:00.000Z'
  );

-- 标签名称受 UNIQUE 约束保护，不能重复。
INSERT INTO tags (name) VALUES
  ('代码'),
  ('Git'),
  ('AI'),
  ('学习'),
  ('TypeScript');

-- 使用子查询按标签名称取得 id，避免依赖自增 id 的具体数字。
INSERT INTO tool_tags (tool_id, tag_id)
SELECT 'github', id FROM tags WHERE name = '代码';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT 'github', id FROM tags WHERE name = 'Git';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT 'chatgpt', id FROM tags WHERE name = 'AI';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT 'chatgpt', id FROM tags WHERE name = '学习';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT 'mdn', id FROM tags WHERE name = '学习';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT 'typescript-playground', id FROM tags WHERE name = 'TypeScript';

INSERT INTO tool_tags (tool_id, tag_id)
SELECT 'typescript-playground', id FROM tags WHERE name = '学习';

-- 查询练习 1：查询全部工具和全部字段。
SELECT * FROM tools;

-- 查询练习 2：只返回工具名称和 URL。
SELECT name, url FROM tools;

-- 查询练习 3：查询开发分类的工具。
SELECT *
FROM tools
WHERE category = '开发';

-- 查询练习 4：查询常用工具，并按名称升序排列。
SELECT id, name, category
FROM tools
WHERE is_favorite = 1
ORDER BY name ASC;

-- 查询练习 5：模糊查询名称中包含 TypeScript 的工具。
SELECT *
FROM tools
WHERE name LIKE '%TypeScript%';

-- 查询练习 6：通过关联表组合工具与标签。
SELECT
  tools.name AS tool_name,
  tags.name AS tag_name
FROM tools
JOIN tool_tags ON tool_tags.tool_id = tools.id
JOIN tags ON tags.id = tool_tags.tag_id
ORDER BY tools.name ASC, tags.name ASC;

-- 安全更新：WHERE 只会把 MDN 设为常用工具，并同步更新时间。
UPDATE tools
SET
  is_favorite = 1,
  updated_at = '2026-09-02T01:00:00.000Z'
WHERE id = 'mdn';

-- 额外创建一条临时数据，专门用于删除练习，不影响真实工具。
INSERT INTO tools (
  id, name, description, url, category,
  is_favorite, created_at, updated_at
) VALUES (
  'temporary-tool', 'Temporary Tool', '只用于练习安全删除。',
  'https://example.com/temporary-tool', '学习', 0,
  '2026-09-02T00:00:00.000Z', '2026-09-02T00:00:00.000Z'
);

-- 删除前先用完全相同的 WHERE 条件确认目标。
SELECT * FROM tools WHERE id = 'temporary-tool';

-- 只删除上面创建的临时记录。
DELETE FROM tools WHERE id = 'temporary-tool';
