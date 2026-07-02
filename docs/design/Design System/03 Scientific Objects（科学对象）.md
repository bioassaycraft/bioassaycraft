# BioassayCraft Design System

# 第三章｜Scientific Objects（科学对象）

> 页面不是由组件组成。
>
> 页面由科学对象组成。

---

# 为什么不是 Component

现代前端设计，

通常从 Component 开始。

Button

Card

Input

Dialog

Popover

这些对于工程来说非常重要。

但是，

它们不能描述：

BioassayCraft 的设计。

因为用户看到的，

并不是：

Card。

而是：

Question。

Evidence。

Decision。

Journey。

因此，

BioassayCraft 首先定义：

Scientific Object。

而不是：

UI Component。

---

# Object 是思维单位

每一个 Scientific Object，

都应该代表：

一次思考。

而不是：

一个控件。

例如：

ATP

不是文字。

它是：

Decision Object。

Residual

不是图表。

它是：

Evidence Object。

ANOVA

不是工具。

它是：

Reasoning Object。

因此，

Object 应按照：

Scientific Meaning

分类。

而不是：

HTML Element。

---

# Object 不应该独立存在

任何 Scientific Object，

都必须回答：

它属于哪个问题？

它支持哪个判断？

它连接哪个 Journey？

如果不能回答，

它就不应该存在。

页面中，

不存在：

孤立对象。

---

# BioassayCraft 的七类 Object

整个网站，

原则上只存在七种对象。

---

## Question Object

作用：

提出问题。

例如：

"What decision are you trying to make?"

特点：

页面唯一主角。

永远最先出现。

任何 Journey，

都从这里开始。

---

## Decision Object

作用：

表示一个科学决策。

例如：

ATP

Model Selection

Acceptance Criteria

Validation Strategy

特点：

不是知识点。

而是：

Decision Point。

---

## Evidence Object

作用：

支持判断。

例如：

Residual

Confidence Interval

Bias

Precision

Power

特点：

Evidence 永远依附于 Decision。

不能单独展示。

---

## Reasoning Object

作用：

解释：

为什么。

例如：

Margin Note。

Diagram。

Narrative。

Observation。

特点：

帮助用户：

组织理解。

---

## Journey Object

作用：

连接多个 Decision。

例如：

ATP

↓

Model

↓

Validation

Journey 不解释知识。

Journey 组织知识。

---

## Artifact Object

作用：

帮助探索。

例如：

ANOVA Explorer

Sample Size Calculator

Method Validation Simulator

Artifact

永远服务：

Decision。

不是：

Feature。

---

## Reflection Object

作用：

帮助用户：

停下来。

重新思考。

例如：

"What assumption changed?"

"What evidence is missing?"

Reflection

通常出现在：

Journey 节点之间。

---

# Object 的生命周期

任何 Object，

都存在：

Appearance

↓

Interaction

↓

Persistence

↓

Fade

不要：

突然出现。

突然消失。

Object

应该像：

Notebook 中逐渐形成的一条记录。

---

# Object 的优先级

同一时间，

页面中：

只能存在：

一个 Primary Object。

其他 Object：

必须成为：

Context。

不要：

多个 Object

争夺注意力。

---

# Object 不应该装饰页面

Object

必须承担：

Scientific Meaning。

不要为了：

丰富页面。

增加：

Quote

Decoration

Illustration

Graphic

如果不能提升理解，

它不是 Object。

它只是：

Decoration。

---

# Object 之间必须存在关系

任何两个 Object，

都必须能够回答：

为什么它们相邻？

为什么它们连接？

为什么现在出现？

如果没有关系，

说明：

Layout

失败。

---

# Object 的颜色

颜色，

属于 Object。

而不是页面。

例如：

Decision

永远使用：

Primary。

Evidence

永远使用：

Neutral。

Reflection

永远保持：

Quiet。

不要：

随机配色。

---

# Object 的运动

Object

可以：

Growing。

Connecting。

Transforming。

Fading。

不要：

Jumping。

Spinning。

Flying。

Object 的运动，

应该像：

思考形成。

而不是：

动画播放。

---

# Object Checklist

任何新的 Scientific Object，

必须回答：

□ 它回答什么科学问题？

□ 它属于哪一种 Object？

□ 它支持哪个 Decision？

□ 它连接哪个 Journey？

□ 它帮助建立什么理解？

□ 删除之后是否影响理解？

如果不能全部回答，

它不能进入 BioassayCraft。

---

# 本章总结

BioassayCraft 不使用：

Component Thinking。

而使用：

Scientific Object Thinking。

页面不是：

Button

Card

Input

组成。

页面由：

Question

Decision

Evidence

Reasoning

Journey

Artifact

Reflection

共同组成。

因为真正的科学，

并不是由组件组成。

而是由思考组成。