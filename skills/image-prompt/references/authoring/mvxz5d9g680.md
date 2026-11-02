# 改库一律走接口（重要）

改 `outfits.json`、`definitions.json`、`worldbook.json` 三种库文件，一律走插件保存接口，不要用文件编辑器直接写磁盘。

**唯一写入口**

`POST http://<宿主>/dsh-tavern-gen/api/save`，请求体：
{"target":"outfits","content":{"outfits":[ ... ]}}


`target` 只接受 `config`、`characters`、`worldbook`、`outfits` 四个值。路径前缀是 `/dsh-tavern-gen/api/save`，漏掉 `api` 段返回 405。

**为什么不能直写磁盘**

插件在内存里持有库，前端页面保存时会把内存里的库原样回存。直写磁盘后内存没有更新，前端空展示一次、点一次保存，磁盘内容就被覆盖成空。`lib/index.js` 的 `state` 分支为此硬报错而不回落空库，注释写明「一次空白展示就能把真实数据覆盖成空」。

**接口会重建条目**

- `outfits`：条目被重建为 `id`、`name`、`enabled` 加 `upper`、`lower`、`shoes`、`accessory`、`full`、`back`、`negative` 七个字段。多余字段静默丢弃。`id` 缺失时自动生成，`enabled` 缺失时默认 `true`。提交空 `outfits` 数组直接清空库。
- `characters`、`worldbook`：整个对象原样写入，不做字段过滤。

**验收**

写完必须用 `read_outfit` 或 `read_character` 实读一次，读到了才算生效。文件字节数和 JSON 语法正确不构成生效证据。
