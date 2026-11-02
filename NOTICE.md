# 第三方代码与致谢

## dsh-tavern-image

本项目的渠道实现、工作流导入、图片编码与凭据处理复用自：

- 项目：dsh-tavern-image
- 地址：https://github.com/weixinlll/dsh-tavern-image
- 版权：Copyright (c) 2026 dsh-tavern-image contributors
- 许可：MIT

复用范围（均为原样复制或小幅改造）：

| 文件 | 说明 |
|---|---|
| `lib/image-providers.js` | 各渠道的请求实现 |
| `lib/image-channels.js` | 渠道挑选 |
| `lib/image-provider-capabilities.js` | 渠道能力表 |
| `lib/prompt-presets.js` | 画师串拼接 |
| `lib/image-output.js` / `lib/image-output-worker.js` | 图片编码 |
| `lib/image-file-metadata.js` | 图片元数据 |
| `lib/comfy-client.js` | 本地 ComfyUI 通讯 |
| `lib/workflow-import.js` | 工作流导入与节点绑定识别 |
| `lib/credential-store.js` | 密钥进出凭据库 |

原作者已知悉并同意本项目复用其代码。这些文件保留原实现与注释风格，改动集中在适配卡片工作台的调用路径上。发现问题请优先对照上游版本。

## lib/vendor

| 库 | 版权 | 许可 |
|---|---|---|
| pngjs | Copyright (c) 2015 Luke Page & contributors | MIT，见 `lib/vendor/pngjs/LICENSE` |
| jpeg-js | Copyright (c) 2014 James Yu | MIT，见 `lib/vendor/jpeg-js/LICENSE` |

## 参考

提示词写法参考了 NovelAI 官方文档与 Danbooru 标签体系的公开约定。世界书自带的规则是这几份文档的整理，不含他人作品原文。
