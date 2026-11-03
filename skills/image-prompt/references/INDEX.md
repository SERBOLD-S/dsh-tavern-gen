# 参考文件索引

世界书保存时自动生成，不要手改。条目增删后这份会跟着重写。

读法：`tavern_read_skill_reference`，skill 名 `image-prompt`，path 填表格里的路径。

| 档位 | 什么时候读 |
|---|---|
| `always` | 写任何 prompt 之前，全部读完 |
| `nsfw` | 画性场景加读 |
| `gore` | 画死亡、肢解、酷刑、内脏、排泄加读 |
| `prescan` | 提交前扫一遍 |
| `manual` | 改世界书、人物库、服装库之前读 |
| `lookup` | 用 `find_prompt` 按词查，不读文件 |

## 规则 · `rules`

写图前必读。按档位挑条目：标 always 的任何题材都读全，标 nsfw 的画性场景加读，标 gore 的画猎奇加读。同档可以有多条，全部读完。

| 档位 | 文件 | 标题 |
|---|---|---|
| `always` | `references/rules/01-workflow.md` | 常规提示词要求 |

## 改库 · `authoring`

改世界书、人物库、服装库之前读。字段以这里为准，别猜。

| 档位 | 文件 | 标题 |
|---|---|---|
| `manual` | `references/authoring/01-worldbook.md` | 世界书怎么写 |
| `manual` | `references/authoring/02-character.md` | 人物库怎么写 |
| `manual` | `references/authoring/03-outfit.md` | 服装库怎么写 |
| `manual` | `references/authoring/mvxz5d9g680.md` | 改库一律走接口（重要） |

## 示例 · `examples`

提交之前扫一遍。示例照着改，检查清单逐条过。

| 档位 | 文件 | 标题 |
|---|---|---|
| `prescan` | `references/examples/01-samples.md` | 完整示例 |
| `prescan` | `references/examples/02-checklist.md` | 提交前检查清单 |

