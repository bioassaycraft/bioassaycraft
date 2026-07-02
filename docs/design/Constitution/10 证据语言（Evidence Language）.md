# BioassayCraft 产品设计宪章

# 第十章｜Evidence Language（证据语言）

> 科学不是因为拥有数据而成立。
>
> 科学是因为证据足以支持一个判断。

---

# 为什么是 Evidence

Bioassay 中，

真正重要的，

从来不是：

数字。

统计量。

P 值。

模型。

真正重要的是：

这些信息，

是否足以支持一个科学决策。

因此，

BioassayCraft 不组织数据。

而组织证据。

---

# 数据不是证据

这是整个产品最重要的原则之一。

数据（Data）

只是观察结果。

证据（Evidence）

是经过解释之后，

能够支持或反驳一个判断的信息。

例如：

Relative Potency = 101%

这是数据。

Relative Potency 与预定义 Acceptance Criteria 一致，

因此可以支持产品放行。

这是证据。

网站中的所有页面，

都应帮助用户完成：

Data

↓

Evidence

而不是：

Data

↓

Conclusion

---

# Evidence 永远依赖 Question

不存在：

绝对证据。

只有：

针对某个问题，

足够的证据。

例如：

同样一个 Bias。

对于：

Release。

可能不能接受。

对于：

Early Development。

可能完全可以接受。

因此，

Evidence 永远不能脱离：

Question。

任何页面，

都必须首先明确：

正在回答什么问题。

---

# 每一个数字，都必须回答一个问题

任何数字，

都应该能够回答：

它为什么存在？

例如：

95% Confidence Interval。

它回答的是：

当前证据有多大的不确定性。

Sample Size。

回答的是：

需要多少证据。

ANOVA。

回答的是：

模型是否足够解释观察结果。

如果数字不能回答问题，

它只是信息。

不是证据。

---

# 证据是逐渐形成的

证据，

很少一次完成。

实验。

↓

重复。

↓

模型。

↓

统计。

↓

验证。

↓

最终判断。

因此，

BioassayCraft 不应该让用户感觉：

完成一次计算，

就得到最终答案。

真正重要的是：

Evidence Builds.

证据，

是一层层建立起来的。

---

# 不要提前给出结论

很多软件，

一计算，

立即告诉用户：

Pass.

Fail.

BioassayCraft 应避免这种设计。

应该首先展示：

Evidence。

然后，

用户自己形成判断。

最后，

页面再总结。

结论，

应永远晚于证据。

---

# 让证据保持上下文

任何证据，

都必须保留来源。

例如：

Residual。

应始终能够回到：

Model。

Model。

应始终能够回到：

ATP。

ATP。

应始终能够回到：

Question。

因此，

任何页面，

都不应该出现：

孤立的数据。

---

# 不确定性也是证据

BioassayCraft 不希望隐藏：

Variance。

Confidence Interval。

Residual。

Bias。

这些内容，

并不是误差。

它们本身就是：

Evidence。

因此，

不确定性，

应始终作为第一类信息展示。

而不是：

隐藏信息。

---

# Evidence 比 Conclusion 更重要

BioassayCraft 不追求：

快速得到：

Yes。

No。

真正重要的是：

为什么。

如果一个页面，

只能告诉用户：

可以。

不可以。

那么，

这个页面失败。

它必须能够回答：

为什么可以？

为什么不可以？

---

# 所有 Artifact 都围绕 Evidence

Calculator。

Simulator。

Explorer。

最终都应回答：

Evidence 是否发生变化？

例如：

改变 Sample Size。

改变的是：

Evidence Strength。

改变 Model。

改变的是：

Evidence Interpretation。

改变 Acceptance Criteria。

改变的是：

Evidence Threshold。

因此，

Artifact 从来不是：

计算器。

而是：

Evidence Generator。

---

# Scientific Confidence

BioassayCraft 希望帮助用户建立：

Confidence。

不是：

Confidence Interval。

而是：

Scientific Confidence。

一种能够解释：

为什么相信这个结论。

为什么仍然保持怀疑。

为什么需要更多数据。

这种判断能力，

比任何统计方法都更重要。

---

# Evidence Language 原则

任何页面，

都必须能够回答：

第一：

当前 Evidence 是什么？

第二：

Evidence 来源于哪里？

第三：

Evidence 是否足够？

第四：

Evidence 支持哪个 Decision？

第五：

Evidence 是否仍存在假设？

如果不能回答，

页面设计尚未完成。

---

# 本章总结

Evidence，

不是数字。

不是统计。

不是图表。

Evidence，

是一种能够支持科学判断的解释。

BioassayCraft 希望让用户看到的，

不仅仅是实验数据。

更重要的是：

数据如何逐渐变成证据。

证据如何逐渐支持判断。

判断如何最终形成科学结论。

真正优秀的 Bioassay，

最终不是建立在更多数据之上。

而是建立在更好的证据之上。