# BioassayCraft Design System

# 第八章｜Scientific Visualization（科学可视化）

> 图，不是为了展示数据。
>
> 图，是为了帮助用户建立科学推理。

---

# 为什么需要 Visualization

Bioassay 中，

真正困难的，

不是计算。

而是理解。

例如：

为什么需要 ATP？

为什么模型改变之后 Residual 会变化？

为什么 Precision 会影响 Sample Size？

为什么 ANOVA 能回答这个问题？

这些问题，

很难仅通过文字解释。

因此，

Visualization 存在的目的，

不是让页面更漂亮。

而是让那些原本抽象的科学关系，

变得可以观察。

---

# Visualization 的职责

BioassayCraft 中，

任何可视化，

都必须承担以下职责之一：

- 展示关系（Relationship）
- 展示变化（Change）
- 展示结构（Structure）
- 展示推理（Reasoning）

如果一个图，

不能完成其中任何一种，

那么它就不应该存在。

---

# 不要画图

很多软件，

是：

Data

↓

Chart

BioassayCraft 不是。

我们不是：

画图。

我们是在：

表达科学。

图形，

只是表达方式。

不是目的。

---

# 图应该回答问题

任何 Figure，

必须能够回答：

用户为什么需要看它？

例如：

Dose-response Curve

回答：

模型是否能够解释数据？

Residual Plot

回答：

模型哪里没有解释？

Confidence Interval

回答：

证据还有多少不确定性？

如果 Figure 回答不了问题，

它只是 Decoration。

---

# 一张图，只回答一个问题

不要：

一张图里面：

Bias

Precision

Residual

Power

全部展示。

每一张 Figure，

只负责：

一个 Scientific Question。

这是 BioassayCraft 最重要的原则。

---

# Figure 必须可以推理

Figure

不是图片。

Figure

应该能够：

支持推理。

例如：

用户改变：

Replicate。

Figure

立即变化。

用户改变：

Slope。

Figure

立即变化。

Figure

必须帮助用户：

建立：

Cause

↓

Effect

而不是：

观察静态结果。

---

# Figure 永远保留上下文

不要：

刷新图。

重新画图。

Figure

应该：

连续变化。

例如：

Curve

缓慢移动。

Residual

逐渐减少。

Confidence Interval

逐渐收窄。

用户应该看到：

推理如何发展。

而不是：

图重新生成。

---

# Figure 永远优先于数字

如果：

一张图，

能够表达：

一个统计量。

就不要：

首先显示数字。

例如：

Sample Size

不要：

n = 18

首先出现。

而应该：

Evidence

逐渐增加。

最后：

n

只是总结。

---

# 用户应该控制 Figure

Figure

不是播放动画。

Figure

应该允许：

观察。

比较。

实验。

失败。

重新尝试。

用户不是：

观看者。

而是：

实验者。

---

# Figure 应保持安静

不要：

3D。

不要：

阴影。

不要：

发光。

不要：

渐变。

Figure

越简单，

推理越清楚。

---

# Figure 永远使用真实比例

不要为了：

好看，

改变：

科学比例。

例如：

Dose

一定保持：

Log Scale。

Confidence Interval

保持：

真实长度。

不要：

压缩。

拉伸。

美化。

Scientific Accuracy

永远高于：

Visual Beauty。

---

# D3 的职责

D3

不是为了：

酷。

D3

负责：

表达：

Relationship

Change

Reasoning

除此之外，

不要使用 D3。

如果：

CSS

SVG

已经能够完成，

不要引入 D3。

---

# 不要使用 Chart Library 思维

Chart Library

思维：

选择：

Line Chart。

Bar Chart。

Pie Chart。

BioassayCraft 不采用。

BioassayCraft

首先问：

需要表达：

什么科学关系？

然后：

再决定：

如何画。

---

# Visualization Checklist

任何 Figure，

上线之前：

□ 是否回答一个 Scientific Question？

□ 是否帮助推理？

□ 是否支持交互？

□ 是否保持上下文？

□ 是否避免 Decoration？

□ 是否保持真实比例？

□ 是否避免 Chart Thinking？

□ 是否真正需要 D3？

如果不能全部满足，

Figure

继续修改。

---

# 错误示例

❌ 用柱状图展示 ANOVA 各 SS。

为什么错误？

因为：

用户只能看到数字。

无法理解：

Variance Decomposition。

---

❌ 用彩虹色展示 Residual。

为什么错误？

Residual

没有颜色意义。

颜色成为噪声。

---

❌ Dose-response Curve 每次重新绘制。

为什么错误？

用户无法观察：

模型如何逐渐改变。

---

# 正确示例

✓ Curve 连续变化。

表示：

Model

正在改变。

---

✓ Residual Area

逐渐收缩。

表示：

Evidence

正在增强。

---

✓ Confidence Interval

缓慢收窄。

表示：

Scientific Confidence

逐渐建立。

---

✓ Journey Node

缓慢连接。

表示：

Reasoning

形成。

---

# 本章总结

Scientific Visualization

不是数据可视化。

它是：

Scientific Reasoning Visualization。

真正优秀的 Figure，

不会让用户说：

"这个图很好。"

而会让用户说：

"原来是这样。"

Visualization 的最终目标，

不是展示数据。

而是帮助用户建立理解。