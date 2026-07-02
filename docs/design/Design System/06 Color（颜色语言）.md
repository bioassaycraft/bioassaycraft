# BioassayCraft Design System

# 第六章｜Color（颜色语言）

> 颜色不是品牌。
>
> 颜色是一种科学语言。

---

# Part A｜Design Philosophy（为什么）

## 为什么颜色应该克制

现代网页通常把颜色当作品牌。

按钮需要颜色。

背景需要颜色。

图标需要颜色。

渐变需要颜色。

BioassayCraft 不采用这种方式。

颜色的职责不是建立品牌。

颜色的职责只有一个：

**帮助用户理解。**

如果一种颜色不能增加理解，

它就不应该存在。

---

## 颜色表达的是语义

在 BioassayCraft 中，

颜色永远表达状态。

而不是情绪。

例如：

蓝色，

不是因为品牌是蓝色。

而是因为：

它表示：

当前正在讨论的对象。

灰色，

不是因为好看。

而是因为：

它表示：

背景。

历史。

上下文。

未来。

如果颜色失去语义，

页面就会开始变成装饰。

---

## 少颜色意味着更多注意力

颜色越多，

注意力越分散。

因此：

一个 Scene 中，

最好不要出现：

超过一种强调色。

真正重要的内容，

应该通过：

位置、

留白、

层级、

组织。

而不是颜色。

---

## 颜色不能代替结构

很多网页：

标题变蓝。

按钮变蓝。

图标变蓝。

线条变蓝。

这样用户最终不知道：

蓝色到底意味着什么。

BioassayCraft 不允许：

同一种颜色承担多个意义。

颜色必须保持一致。

---

## 不要使用状态颜色表达结果

不要：

绿色：

Pass。

红色：

Fail。

科学很少只有：

正确。

错误。

更重要的是：

Evidence 是否充分。

因此：

页面应首先展示：

Evidence。

而不是：

红绿灯。

---

## 科学应该保持安静

颜色越少，

页面越平静。

平静，

意味着：

用户更容易思考。

因此，

BioassayCraft 永远避免：

高饱和。

高对比。

彩色背景。

渐变背景。

发光效果。

真正重要的是：

内容。

---

# Part B｜Implementation Rules（怎么做）

## Color Palette

建议整个网站只保留：

Primary

Neutral

Background

Accent

四类颜色。

除此之外，

不要增加新的颜色体系。

---

## Primary

用于：

当前正在思考的对象。

例如：

当前 Journey Node

当前 Question

当前 Figure

当前 Active State

Primary 不用于：

背景。

正文。

装饰。

---

## Neutral

用于：

正文。

Line。

Reference。

Secondary Information。

Neutral 应承担：

80% 以上页面内容。

---

## Background

背景保持：

接近白色。

允许：

极轻灰。

Notebook Texture。

Coordinate Grid。

禁止：

彩色背景。

---

## Accent

Accent

只用于：

极少数：

需要提醒用户：

这里发生了新的理解。

不要：

大量使用。

不要：

连续出现。

---

## Status Color

尽量避免：

Success

Warning

Danger

如果必须使用：

应始终作为：

辅助信息。

不能成为：

页面视觉中心。

---

## Link

链接，

不要：

高亮蓝。

建议：

接近正文颜色。

Hover

时，

再增加强调。

避免：

网页看起来像：

Documentation。

---

## Figure

Figure

尽量保持：

单色。

或者：

两色。

不要：

彩虹图。

不要：

五种颜色。

颜色越少，

推理越清晰。

---

## Journey

Journey

颜色表达：

当前状态。

过去状态。

未来状态。

不要：

每一个 Node

不同颜色。

---

## Notebook

Notebook

始终保持：

Neutral。

Margin Note

不要使用：

醒目颜色。

Notebook

应该保持：

安静。

---

## Color Hierarchy

推荐：

Primary

≈5%

Accent

≈5%

Neutral

≈70%

Background

≈20%

如果 Primary 超过：

10%

页面会开始失去重点。

---

## Dark Mode

Dark Mode

不是简单反色。

Dark Mode

应重新保证：

阅读。

层级。

留白。

颜色语义。

保持一致。

如果不能保证，

宁可暂时不支持。

---

## Accessibility

正文：

必须满足：

WCAG AA

以上。

不要因为：

设计。

降低：

阅读对比度。

科学内容，

永远优先于视觉效果。

---

# Color Checklist

任何页面发布之前：

□ 是否只有一种强调色？

□ 是否颜色表达语义？

□ 是否避免彩色背景？

□ 是否避免彩虹图？

□ Primary 是否低于 10%？

□ 是否突出 Question 而不是 Result？

□ 是否保持 Notebook 的安静？

□ 是否符合 Accessibility？

如果不能全部满足，

重新设计。

---

# 本章总结

BioassayCraft 的颜色，

不是品牌识别。

而是科学表达。

优秀的颜色设计，

不会让用户觉得：

页面很好看。

而会让用户觉得：

推理变得更加清晰。

颜色，

最终服务于理解。

而不是服务于视觉。