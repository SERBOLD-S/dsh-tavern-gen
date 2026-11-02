# 服装库怎么写

服装库是公共的，所有角色都能用。一套一条，七块固定。

## 字段

| 字段 | 写什么 | 例子 |
|---|---|---|
| `name` | 中文短名 | 常服、雨夜外衣、夏日便装 |
| `upper` | 上身：面料、版型、颜色、领口、袖长 | `white shirt, peter pan collar, short sleeves` |
| `lower` | 下身：裤/裙、长度、材质 | `pleated skirt, knee-length, wool` |
| `shoes` | 鞋袜 | `leather loafers, white socks` |
| `accessory` | 配饰，可空 | `thin silver necklace` |
| `full` | 整套一句话兜底，单件不全时用 | `office attire` |
| `back` | 背影专用补充，可空 | `backless, crossed straps` |
| `negative` | 这套不该出现的元素 | `opaque, thick fabric, turtleneck` |

## 三条硬规矩

**只写服装本身。** 写「白色吊带连衣裙」，不写「少女穿着白色吊带连衣裙」。身体归人物库，服装库只描述衣服。

**全英文 Tag，逗号分隔。** 和人物 traits 一样。

**`full` 是兜底，不是必填。** 上身、下身、鞋都写全了就不需要它；只写了「一条裙子」这种单件时，用它补成整套。

## 正面和背影怎么取

- 正面：`upper` + `lower` + `shoes` + `accessory`
- 背影：再加 `back`
- 凑不齐：用 `full` 兜底

`negative` 永远走 `gen_image` 的 `negative` 参数，不要写进 `prompt`。
