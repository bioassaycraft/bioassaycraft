# BioassayCraft Design System

# 第九章｜Artifact（科学交互对象）

> Artifact 不是工具。
>
> Artifact 是一个能够帮助科学家思考的对象。

---

# 为什么不是 Tool

几乎所有网站，

都会使用：

Tool。

Calculator。

Simulator。

Generator。

Converter。

这些名称都在暗示：

用户已经知道自己要做什么。

他只是需要：

完成任务。

BioassayCraft 不一样。

用户很多时候并不知道：

应该计算什么。

应该观察什么。

应该相信什么。

因此，

BioassayCraft 提供的不是 Tool。

而是：

Artifact。

Artifact 的职责，

不是完成工作。

而是帮助形成判断。

---

# 什么是 Artifact

Artifact 是一个：

可以交互、

可以观察、

可以实验、

可以失败、

可以重新开始、

最终帮助用户建立科学理解的对象。

Artifact 永远围绕：

一个 Scientific Question。

而不是：

一个功能。

---

# Artifact 永远回答一个问题

例如：

ANOVA Explorer

回答：

Variance 是如何被解释的？

Sample Size Explorer

回答：

多少证据才足够？

Method Validation Explorer

回答：

为什么这个 Validation Strategy 可以支持 ATP？

Dose-response Explorer

回答：

为什么模型会改变 Relative Potency？

不要：

一个 Artifact

回答很多问题。

一个 Artifact，

一个 Question。

---

# Artifact 不是 Calculator

Calculator：

输入

↓

计算

↓

输出

Artifact：

提出问题

↓

调整假设

↓

观察变化

↓

形成推理

↓

总结理解

这两者完全不同。

---

# 用户应该实验

Artifact

不是：

填写表格。

用户应该：

拖动。

比较。

观察。

重新尝试。

犯错。

重新建立理解。

Artifact

应该像：

实验台。

而不是：

Excel。

---

# 不要隐藏过程

很多计算器：

只告诉：

结果。

Artifact

必须展示：

整个形成过程。

例如：

Sample Size

不要：

直接输出：

n = 18。

应该：

逐渐展示：

Evidence

如何增加。

Confidence

如何建立。

最后：

18

只是结果。

---

# 每一个参数，都必须具有科学意义

不要：

Parameter A

Parameter B

Slider 1

Slider 2

每一个参数，

都必须回答：

用户正在改变什么科学假设？

例如：

Bias

Precision

Acceptance Criteria

Replicates

Relative Potency

这些都是：

Scientific Variable。

---

# Artifact 应允许失败

真正优秀的 Artifact，

一定允许：

错误。

例如：

Model Failure

Validation Failure

Insufficient Sample Size

Poor Precision

Bias Too Large

这些不是 Bug。

这些本身就是：

学习内容。

---

# Artifact 应记录思考

Notebook

应该记住：

之前尝试过：

什么。

为什么失败。

为什么改变。

用户应该能够：

回顾自己的推理。

而不是：

每一次重新开始。

---

# 一个 Artifact，一个核心可视化

不要：

五张图。

六个 Panel。

八个 Widget。

一个 Artifact，

最好只有：

一个真正重要的 Figure。

其余内容，

都围绕它展开。

---

# 不要一次开放全部功能

Artifact

应采用：

Progressive Disclosure。

第一层：

观察。

第二层：

调整参数。

第三层：

自由实验。

第四层：

真实数据。

理解能力，

决定开放程度。

不是：

一次开放全部功能。

---

# Artifact 必须回到 Journey

Artifact

不是终点。

完成之后，

用户应该继续：

Journey。

例如：

完成：

ATP Explorer。

↓

进入：

Validation Strategy。

↓

进入：

Sample Size。

↓

进入：

ANOVA。

Artifact

始终属于：

Journey。

---

# Artifact 的组成

任何 Artifact，

原则上应包含：

Question

↓

Visualization

↓

Interaction

↓

Observation

↓

Reflection

不要：

Input

↓

Output。

---

# Artifact Checklist

任何新的 Artifact，

上线之前：

□ 是否回答一个 Scientific Question？

□ 是否不是普通 Calculator？

□ 是否帮助建立理解？

□ 是否允许失败？

□ 是否展示形成过程？

□ 是否只有一个核心 Figure？

□ 是否连接 Journey？

□ 是否帮助 Scientific Judgement？

如果不能全部满足，

它不是：

BioassayCraft Artifact。

---

# 错误示例

❌ 一个 Sample Size 页面：

输入：

Alpha

Beta

Power

↓

输出：

18

为什么错误？

因为：

用户不知道：

为什么是 18。

---

❌ 一个 ANOVA 页面：

上传数据。

↓

输出：

P = 0.043

为什么错误？

因为：

用户没有理解：

Variance 如何被解释。

---

❌ 一个 Converter：

输入。

↓

结果。

结束。

为什么错误？

因为：

没有建立任何新的理解。

---

# 正确示例

✓ Sample Size

随着 Precision 改变，

Evidence 区域逐渐增长。

用户理解：

为什么需要更多实验。

---

✓ ANOVA

随着模型增加，

Residual Area

不断缩小。

用户理解：

Variance Decomposition。

---

✓ Validation

随着 Acceptance Criteria 改变，

Decision Boundary

缓慢移动。

用户理解：

ATP 如何影响 Validation。

---

# 本章总结

Artifact，

不是一个网页功能。

它是一种科学表达方式。

它允许用户：

提出问题。

实验。

观察。

失败。

重新理解。

最终，

建立自己的 Scientific Judgement。

BioassayCraft 最重要的产品，

从来不是：

Calculator。

而是：

Artifact。

因为真正优秀的 Artifact，

最终不会替用户完成思考。

而会帮助用户学会思考。