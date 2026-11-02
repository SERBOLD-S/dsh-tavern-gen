# 人物库怎么写

每个角色是人物库里的一条。字段固定，**不要自己发明**。

## 字段

| 字段 | 写什么 |
|---|---|
| `name` | 中文名，正文和提示词里称呼用 |
| `match` | 命中别名，逗号分隔（英文名、昵称） |
| `enabled` | 是否参与生图 |
| `note` | 给规划模型的补充说明，可空 |
| `traits` | 外观分块，十二块，见下 |
| `outfits` | 这个角色自带的服装，可空 |
| `continuity` | 跨轮一致性要求，比如发色不能变 |
| `outfitRefs` | 引用公共服装库里的套装名 |

## traits 十二块

**全部英文 Tag，一个中文都不要。**

| 块 | 写什么 |
|---|---|
| `feature` | 气质描述，不进提示词，只供规划时参考 |
| `face` | 正面头面部：脸型、发色、发型、发长、瞳色、特殊部位（角/耳/尾） |
| `faceBack` | 背面头面部：后脑、颈背、发尾 |
| `bodySFW` | 穿着衣服时的上半身：胸围、腰、肤色 |
| `bodySFWBack` | 同上，背面 |
| `lowerSFW` | 穿着衣服时的下半身：腿型、臀、身高 |
| `lowerSFWBack` | 同上，背面 |
| `bodyNSFW` | 裸露的上半身 |
| `bodyNSFWBack` | 同上，背面 |
| `lowerNSFW` | 裸露的下半身 |
| `lowerNSFWBack` | 同上，背面 |
| `negative` | 这个角色不该出现的元素 |

## 三条硬规矩

**年龄词写进 `face` 和 `faceBack`，绝不写进 `negative`。** 写反了，角色特征会被负面压掉，出图飘成另一个人。

**SFW 块里不写裸露词。** 写了衣服画不出来，模型会直接给这个人脱光。

**正背面互斥。** 一张图只调其中一个：正面用 `face`+`bodySFW`+`lowerSFW`，背影用 `faceBack`+`bodySFWBack`+`lowerSFWBack`。背面块里不要写瞳色，背上看不见眼睛。

完整规范（含例子和常见错法）在 `character-authoring` skill 里。
