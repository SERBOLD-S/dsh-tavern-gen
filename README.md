# dsh-tavern-gen

给 DSH Tavern **卡片工作台**用的生图插件。

和正文自动配图不同，这套是「先商量再出图」：你在对话里说想画什么，Agent 去查人物库、按世界书规则写出英文提示词，翻译成中文逐项念给你听，你点头之后它才调用生图渠道。图片以 Markdown 图片语法回到回复里，可以直接插进正文。

主要用在角色卡制作、试画风、试提示词这些场景——一张一张调，不靠运气。

## 和其他插件的分工

| 插件 | 用在哪 | 谁触发 |
|---|---|---|
| `dsh-tavern-image` | 游玩模式（story / script） | 模型在正文里写标记，插件自动配图 |
| `dsh-tavern-gen`（本插件） | 卡片工作台（card） | Agent 主动调用工具，用户确认后出图 |

两者互不抢活：本插件注册的工具都用 `tavern.toolModes({ modes: ['card'] })` 锁在卡片工作台，游玩模式里根本看不到。

## 安装

把整个目录放进 Tavern 的插件目录：

```
<DSH 数据目录>/tavern/data/plugins/dsh-tavern-gen/
```

然后重启 DSH。浏览器侧要强刷一次（`client.js` 带 `Cache-Control: immutable`，普通刷新会继续吃旧缓存）。

装好之后在「设置 → 卡片生图」里能看到面板。

## 第一次配置

### 云端渠道

1. 打开「设置 → 卡片生图 → 配置」。
2. 后端选「云端」，点「新增渠道」，选 provider（NovelAI 兼容站、OpenAI Images、Gemini、Atlas Cloud 等）。
3. 填地址、模型、鉴权方式，粘贴 API Key。
4. 点「保存并测试连接」。

API Key 交给宿主的凭据服务保管，明文不落盘、不出宿主。设置页里只能看到「已配置」，看不到密钥本身。

### 本地 ComfyUI

后端切「本地」，填 `http://127.0.0.1:8188`，点测试连接。然后导入一张 **API 格式**的工作流 JSON（ComfyUI 界面里「保存（API格式）」导出的那种，不是普通工作流）：

- 导入后会写进 `workflows/`，并自动识别提示词节点、负面节点、尺寸节点、步数、CFG、采样器、种子。
- 勾上「锁定」之后，再导入不会顶掉当前默认。
- 没有工作流时本地出图会直接报错，不会退回简易模式。

### 尺寸与出图节奏

`gen_image` 的 `size` 只有三档：竖图、横图、方图。不填时用渠道配置里存的宽高，再没有就回竖图。

想要别的比例、或者想改默认尺寸，直接在对话里说，让 Agent 改渠道配置——不用翻设置页。

一次出几张用 `count` 参数（1–4 张）；同时跑几个任务看配置里的 `imageConcurrency`。这两项同样可以在对话里让 Agent 调。`count` 是串行循环，不是并发。

## 设置页

- **配置**：渠道表单，云端 / 本地切换，画风预设，采样参数。
- **世界书**：按分册管规则，保存后自动生成 skill 读的参考文件。
- **画风预设**：卡片式增删改，点圆点选当前生效那套。预设负责拼画师串和负面词。
- **人物库**：按角色维护外观 traits，正面 / 背面 / 常规 / 细节各分开。
- **服装库**：每套七块（上身、下身、鞋、配饰、整套兜底、背影补充、负面）。
- **画廊**：出图记录，能一键复制回提示词。

## 工具

| 工具 | 扣费 | 作用 |
|---|---|---|
| `gen_image` | 真实扣费 | 提交出图，返回可写进回复的图片链接 |
| `read_character` | 免费 | 查人物库，不传名字列全部，传名字取外观 traits |
| `read_outfit` | 免费 | 查服装库 |
| `read_image_config` | 免费 | 查当前渠道、模型、画风预设、可选尺寸 |
| `find_prompt` | 免费 | 按词查素材表，只回命中的几条 |

`gen_image` 的参数：`prompt`（必填）、`negative`、`channel`、`size`、`count`、`preset`、`sampler`。`channel` 和 `preset` 是单次覆盖，不写回全局配置。

## 世界书与规则

`worldbook.json` 按「分册 → 条目」两级组织，每个条目保存后生成一份 md 到 `skills/image-prompt/references/<分册>/<条目>.md`，Agent 按 SKILL.md 点名去读。

自带三份基础规则（任务结构与权重、人物与多人、画面边界与构图），够写日常图。条目上的 `mode` 决定它什么时候被读：

| mode | 含义 |
|---|---|
| `always` | 任何题材都读 |
| `nsfw` / `gore` | 按题材加读 |
| `lookup` | 按段检索，不通读 |
| `manual` | 改库时读 |
| `prescan` | 提交前扫 |

要加自己的题材规则，新建条目写就行，选合适的档位，再在 SKILL.md 里点名。

## 素材表

`find_prompt` 查的是世界书里的「素材表」分册，**默认留空**，放你自己的提示词素材。

条目格式固定：

```
**中文名**
`tag1,tag2,tag3`
```

一条一个分类卡。工具按名字、tag 内容、分类名做子串匹配，不传 `query` 时返回分类索引。

## 目录结构

```
dsh-tavern-gen/
├── lib/
│   ├── index.js              插件主体：工具注册、设置接口、世界书读写
│   ├── image-providers.js    各渠道的请求实现
│   ├── comfy-client.js       本地 ComfyUI：探活、提交、轮询、取图
│   ├── workflow-import.js    工作流导入与节点绑定识别
│   ├── credential-store.js   密钥进出凭据库
│   ├── prompt-presets.js     画师串拼接
│   └── vendor/               pngjs、jpeg-js
├── client.js                 设置页（浏览器侧）
├── skills/
│   ├── image-prompt/         提示词手册，带基础规则与改库说明
│   └── character-authoring/  人物库填写规范
├── workflows/                导入的 ComfyUI 工作流
├── config.json               渠道与画风配置
├── definitions.json          人物库
├── outfits.json              服装库
└── worldbook.json            世界书规则
```

## 已知限制

- **模型名只能在配置里改**，不进工具参数。换模型常常连带换协议，塞进参数只会让模型乱填。
- **工作流模式会整段替换负面节点**，预设里的负面词和工具 `negative` 都会被顶掉。
- **画廊删除会连图片文件一起删**，删了找不回来。
- 人物库、服装库、世界书都是 JSON 直存，不是并发安全的。不要在多个标签页同时编辑同一个库。
- 模型生成质量受生图模型、提示词、种子、LoRA 影响，人物库只能约束外观描述，不保证每张图完全一致。

## 许可

MIT，见 [LICENSE](LICENSE)。

本项目的渠道实现、工作流导入、图片编码等模块复用自 [dsh-tavern-image](https://github.com/weixinlll/dsh-tavern-image)（MIT），感谢原作者授权。详见 [NOTICE.md](NOTICE.md)。

`lib/vendor/` 下的 pngjs 与 jpeg-js 各自保留原许可。
