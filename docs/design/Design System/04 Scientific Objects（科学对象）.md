# BioassayCraft Design System

# 第四章｜Scientific Objects（科学对象）

> 页面不是由 UI 组件组成。
>
> 页面由一组能够表达科学推理的对象组成。

---

# 为什么需要 Scientific Objects

HTML 认为：

页面由：

Button

Card

Input

Table

组成。

Vue 认为：

页面由：

Component

组成。

BioassayCraft 不这样理解。

BioassayCraft 认为：

页面由：

Scientific Objects

组成。

这些对象，

共同表达：

科学推理。

因此，

对象首先具有：

Scientific Meaning。

其次，

才具有：

UI Form。

---

# Object 与 Role

一个页面中的元素，

同时拥有两个属性。

第一：

Object

它是什么。

第二：

Role

它承担什么作用。

例如：

一个 Node。

Object：

Node。

Role：

Decision。

再例如：

一段 Margin Note。

Object：

Note。

Role：

Reasoning。

Object 永远稳定。

Role 可以变化。

因此，

不要把：

Question

Decision

Evidence

定义为 Object。

它们属于：

Narrative Role。

---

# BioassayCraft 的 Object

整个网站，

建议只保留以下对象。

---

## Node

Node 表示：

一个思考点。

Node 可以承担：

Question

Decision

Evidence

Reflection

等不同角色。

Node 永远保持：

简单。

克制。

可连接。

---

## Line

Line 不表示：

连接。

Line 表示：

Reasoning。

任何 Line，

都必须回答：

为什么这一节点会导向另一节点？

如果回答不了，

这条线就不应该存在。

---

## Note

Note 是 Notebook 的核心。

Note 永远比正文短。

Note 永远不是说明书。

Note 更像：

导师留下的一句话。

例如：

"Why?"

"Evidence?"

"ATP first."

Note 不解释全部内容。

它帮助用户继续思考。

---

## Figure

Figure 负责：

表达现象。

例如：

Dose-response curve

Residual plot

Confidence interval

Figure 不负责：

解释。

Figure 负责：

让用户观察。

解释属于：

Reasoning。

---

## Artifact

Artifact 是：

能够互动的对象。

例如：

ANOVA Explorer

Sample Size Calculator

Method Validation Simulator

Artifact 永远围绕：

一个科学问题。

而不是：

一个功能。

---

## Canvas

Canvas 是：

所有 Object 的共同空间。

Canvas 不属于：

背景。

Canvas 是：

Notebook。

所有 Object，

都发生在：

Canvas 上。

因此，

Canvas 应尽可能安静。

---

# Object 的关系

Object 永远不能独立存在。

例如：

Node

↓

Line

↓

Node

↓

Figure

↓

Note

共同组成：

一个完整的 Narrative。

不要出现：

孤立 Figure。

孤立 Artifact。

孤立 Diagram。

---

# Object 的出现顺序

任何页面，

Object 应遵循：

Question Node

↓

Reasoning Line

↓

Evidence Figure

↓

Decision Node

↓

Reflection Note

不要一次出现：

所有 Object。

Object 应随着理解，

逐渐形成。

---

# Object 的视觉原则

Object 永远：

轻。

简单。

克制。

不要：

阴影。

厚重边框。

玻璃拟态。

渐变。

复杂装饰。

Object 应保持：

Scientific Calm。

---

# Object 的运动

Object 不应该：

飞入。

旋转。

缩放。

Object 应：

出现。

连接。

生长。

淡出。

所有运动，

都应表现：

Scientific Reasoning。

---

# Object 的优先级

任何 Scene，

只能存在：

一个 Primary Object。

例如：

Question。

其余 Object：

全部成为：

Supporting Objects。

不要：

多个 Object

同时争夺注意力。

---

# Object Checklist

任何新的 Object，

必须回答：

□ Object 类型是什么？

□ Narrative Role 是什么？

□ 它属于哪个 Scene？

□ 它是否帮助推理？

□ 它是否可以被删除？

如果不能回答，

Object 不应进入产品。

---

# 本章总结

Scientific Object，

不是一种 UI。

而是一种科学表达单位。

Node、

Line、

Note、

Figure、

Artifact、

Canvas，

共同组成：

BioassayCraft 的视觉语言。

真正优秀的页面，

不会让用户看到：

很多组件。

而会让用户看到：

科学推理正在逐渐形成。