# Target-to-Assay Explorer 作用机制与证据

## 运行与数据路径

运行 `npm run dev`，打开 `http://127.0.0.1:5173/learn/target-to-assay-explorer/` 并提交靶点。Vite 开发服务器和生产 Worker 使用同一个路由处理器。

新增 `POST /api/v1/target-to-assay/mechanisms`。示例请求体为 `{"targets":"CD3 × CD20"}`。存在歧义时返回 `422 choose_target` 及候选实体 ID。用户确认后用原始靶点文本作为 `resolutions` 的键，使用选定的实体 ID 作为值。

- `resolvedTargets` 记录原始输入、标准名、人类实体类型、基因符号、UniProt、Ensembl 和 Reactome ID。TCR–CD3 使用复合物身份。
- `targetBiology` 记录原始功能注释、定位、来源报告的相互作用和 Reactome 映射。Reactome 参与实体映射可包含复合物成员。单个映射不自动支持药物机制。
- `relatedDrugs` 和 `drugMechanisms` 记录分子、来源报告的靶点和作用类型、机制原文或监管资料摘要、开发阶段及证据。完整匹配需要对应具体分子的完整靶点证据。多条独立单靶点机制不会拼成完整匹配。查询阶段补充可核对的干预试验。药物卡片仍支持按需读取该药物的试验详情。
- `sourceStatus` 区分返回记录、空结果、失败、部分失败和未查。逐靶点错误及 HTTP 状态或超时见 `sourceErrors`。查询时间见 `retrievedAt`。静态监管记录保留各自的核对日期。
- Worker 每个实例最多接受六个同时进行的机制查询，每次最多八个靶点。请求在限定时间内结束，固定上游地址禁用重定向。短暂 502、503 和 504 可在原超时预算内重试一次。429 或含 Retry-After 的响应直接记录。本地和线上都不使用持久化数据存储。
- 当前开发阶段覆盖依赖上游返回窗口。ChEMBL 每个资源最多读取两页，每页 60 条。Open Targets 比较 `count` 与实际行数。ClinicalTrials.gov 靶点关键词与干预名称两条检索各读取最多 30 项研究。药物卡片按需查询仍核对首批五条。未查到的实体、机制或地区批准维持未知。现有 `search`、`resolve`、`meta` 和 `drugs/:id` 路由继续服务原有调用者。

## 来源与验证

| 来源 | 查询与本次验证 |
| --- | --- |
| UniProt | 搜索已审核人类 UniProtKB 记录，核对基因名、蛋白名、别名、accession 或 Ensembl ID。五个指定输入均返回实体。公开读取，数据 CC BY 4.0。 [API 文档](https://www.uniprot.org/help/api_queries) · [许可](https://www.uniprot.org/help/license) |
| Reactome | `data/mapping/UniProt/:accession/pathways` 返回参与实体的通路映射，`data/query/R-HSA-202403` 返回 TCR–CD3 相关通路原始注释。五个案例均返回人类通路。数据库数据为 CC0。 [Content Service](https://reactome.org/dev/content-service) · [许可](https://reactome.org/license) |
| Open Targets | GraphQL 根据 UniProt 提供的 Ensembl ID 拉取药物候选及具体机制行、作用类型和引用元数据。五个案例查询成功。阶段字段与地区批准分开。 [GraphQL 文档](https://platform-docs.opentargets.org/data-access/graphql-api) · [许可](https://platform-docs.opentargets.org/licence) |
| ChEMBL | `target`、`mechanism`、`molecule` 按 accession、人体单蛋白实体、直接相互作用和分子 ID 关联。11 月 12 日曾收到 500 或超时。11 月 13 日在 PCSK9、MS4A1、PDCD1 和 IL-23 实际返回可解析记录。映射与失败降级也有测试覆盖。现有 `drug_indication` 查询仍按页面已有方式使用。ChEMBL 数据 CC BY-SA 3.0。 [API 文档](https://www.ebi.ac.uk/chembl/api/data/docs) · [许可](https://www.ebi.ac.uk/chembldb/) |
| FDA | 既有 openFDA Drugs@FDA 按药物查文件。真实查询 Epcoritamab 返回 BLA761324 的申请和审评记录。无 key 限额为每 IP 每分钟 240 次、每天 1000 次。 [Drugs@FDA API](https://open.fda.gov/apis/drug/drugsfda/) · [限额](https://open.fda.gov/apis/authentication/) |
| EMA、NMPA | 沿用已核对的地区记录与链接。新增 Epcoritamab 的 FDA 与 EMA 记录及 Odronextamab 的 EMA 记录，来源为独立核对的标签及 EPAR。EMA/NMPA 全量自动发现尚未接入。 [EMA 药品目录](https://www.ema.europa.eu/en/medicines) · [NMPA 数据查询](https://www.nmpa.gov.cn/datasearch/home-index.html) |
| ClinicalTrials.gov | 复用 v2 按需查询，并用 Intervention 名称、别名或研发代码复核具体试验。Epcoritamab 查询返回 [NCT06458439](https://clinicaltrials.gov/study/NCT06458439)，当次为招募中的干预试验。各地区批准与试验状态可同时成立。 [API](https://clinicaltrials.gov/data-api/api) · [使用条款](https://clinicaltrials.gov/about-site/terms-conditions) |
| PubMed | 复用 ESearch/EFetch，组合采用 AND，同一靶点名称及别名采用 OR。保留 PMID、原始文献和支持的出版类型元数据。CD3 × CD20 的 ESearch 与 EFetch 都返回 HTTP 200，验证到 PMID 35725847 和 23250041。无 key 默认每 IP 每秒 3 次。 [E-utilities 文档](https://www.ncbi.nlm.nih.gov/books/NBK25497/) |
| IUPHAR、专利、会议与企业资料 | IUPHAR 自动调用需考虑用户注册、API key 和商业访问条件，本轮保留官方入口。专利、会议与企业资料没有新增自动采集。 [GtoPdb REST 文档](https://www.guidetopharmacology.org/webServices.jsp) · [访问政策](https://blog.guidetopharmacology.org/2026/07/29/user-registration-is-coming-to-gtopdb/) |

UniProt、Reactome、Open Targets 和 ChEMBL 的上述公共端点测试未使用 API key。各来源仍可能单独限流或中断。页面按记录标注来源，未将同一引用在多个数据库出现计作独立复核。

## 2026-11-12 实际查询

### CD3 × CD20

- CD3 识别为 TCR–CD3 复合物。Reactome 说明 CD3 链参与 TCR 刺激后的近端 T 细胞信号传导。 [Reactome R-HSA-202403](https://reactome.org/content/detail/R-HSA-202403)
- CD20 解析为 MS4A1。UniProt 注释支持其为参与 B 细胞钙内流调节的膜蛋白。Reactome 返回 BCR 激活与第二信使通路，也返回利妥昔单抗相关的单独映射。 [UniProt P11836](https://www.uniprot.org/uniprotkb/P11836/entry) · [Reactome R-HSA-983695](https://reactome.org/content/detail/R-HSA-983695) · [Reactome R-HSA-9992296](https://reactome.org/content/detail/R-HSA-9992296)
- 完整组合从原有两条记录扩为四条已核对记录。各自药品资料支持该分子连接 CD3 与 CD20 并促成 T 细胞介导的靶细胞杀伤。 [FDA Mosunetuzumab，§12.1](https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/761263s010lbl.pdf) · [FDA Glofitamab，§12.1](https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/761309s006lbl.pdf) · [FDA Epcoritamab，§12.1](https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/761324s003lbl.pdf) · [EMA Odronextamab，§5.1](https://www.ema.europa.eu/en/documents/product-information/ordspono-epar-product-information_en.pdf)
- Epcoritamab 的美国与欧盟批准记录、Odronextamab 的欧盟批准记录已核对。Odronextamab 的 openFDA 申请查询返回 404，美国批准状态维持待核实。 [FDA Purple Book 761324](https://www.accessdata.fda.gov/scripts/purplebooksearch/index.cfm?blaNo=761324&event=productdetails) · [EMA Tepkinly](https://www.ema.europa.eu/en/medicines/human/EPAR/tepkinly) · [EMA Ordspono](https://www.ema.europa.eu/en/medicines/human/EPAR/ordspono)

### TL1A × OSMR

- TL1A 解析为 TNFSF15。其功能注释描述通过 TNFRSF25 传导信号，并记载与诱饵受体 TNFRSF6B 的结合。Reactome 返回 TNF 配体与其生理受体结合通路。 [UniProt O95150](https://www.uniprot.org/uniprotkb/O95150/entry) · [Reactome R-HSA-5669034](https://reactome.org/content/detail/R-HSA-5669034)
- OSMR 是 OSMR–IL6ST 与 OSMR–IL31RA 受体复合物共享的亚基，两种复合物分别响应 OSM 与 IL-31。Reactome 返回 IL-6 型细胞因子受体与配体相互作用通路。 [UniProt Q99650](https://www.uniprot.org/uniprotkb/Q99650/entry) · [Reactome R-HSA-6788467](https://reactome.org/content/detail/R-HSA-6788467)
- 完整组合返回零条具有对应靶点证据的药物匹配。页面保留两个靶点的独立证据，并提示具体组合机制尚不能确定。ChEMBL 在本次查询超时，结果覆盖相应受限。

### 其他回归

- PCSK9 返回 LDL 受体家族降解相关功能和 LDL 清除通路。Open Targets 分别返回 Evolocumab 的蛋白抑制机制和 Inclisiran 的 RNAi 机制。去除 Inclisiran sodium 的重复记录后，此次查询显示 9 条相关药物记录。 [UniProt Q8NBP7](https://www.uniprot.org/uniprotkb/Q8NBP7/entry) · [Reactome LDL clearance](https://reactome.org/content/detail/R-HSA-8964038) · [Evolocumab](https://platform.opentargets.org/drug/CHEMBL2364655) · [Inclisiran](https://platform.opentargets.org/drug/CHEMBL3990033)
- PD-L1 × 4-1BB 分别解析到 CD274 和 TNFRSF9，并返回各自通路。此次未返回有完整组合机制证据的具体分子。 [UniProt Q9NZQ7](https://www.uniprot.org/uniprotkb/Q9NZQ7/entry) · [UniProt Q07011](https://www.uniprot.org/uniprotkb/Q07011/entry)
- CD3 × CD19 × CD20 返回三个实体和各自通路，零条完整三靶点匹配。双抗保留自己的两靶点证据。 [UniProt P15391](https://www.uniprot.org/uniprotkb/P15391/entry)
- 无效靶点实时返回未解析，Ensembl ID 输入可以解析到 MS4A1。歧义选择、物种约束、多个来源失败、错误绑定和临床干预匹配另有自动测试覆盖。

## 变更范围

- 页面与文案。 `src/pages/TargetToAssayExplorer.vue`、`src/components/target-to-assay/MechanismEvidence.vue`、`src/i18n/target-to-assay.js`
- 实时接口与本地入口。 `src/worker/target-to-assay-api.js`、`vite.config.js`
- 实体、机制与证据。 `src/lib/target-to-assay/target-biology.js`、`live-mechanisms.js`、`online.js`、`search.js`、`catalog.js`、`evidence.js`、`trials.js`、`literature.js`
- 回归测试。 `tests/target-to-assay-mechanisms.test.mjs`、`tests/target-to-assay-online.test.mjs`

AI 深度分析是禁用按钮。接口的结构化结果可作为后续输入，当前没有 OpenAI 调用、凭据、费用、数据库或新增生产部署配置。

## 构建与运行验证

- Vitest 19 个文件、115 个测试通过。ESLint 和 `git diff --check` 通过。
- Vite SSG 生成 11 个页面。Cloudflare Worker 打包 dry-run 通过。本地 Wrangler 返回 Explorer 静态页和两个关键组合的 HTTP 200。两次关键组合查询均得到 UniProt、Reactome 和 Open Targets 的真实响应，ChEMBL 返回 HTTP 500。
- 浏览器验证覆盖桌面 1280px、移动 375px 和 320px、中英文切换、连续提交与禁用按钮。深色环境验证了实时结果。浅色环境验证了页面渲染与主题色，浅色 iframe 的提交交互未通过自动化验证。

## 第二轮精简与故障回归

- 修改前，从页面同源请求 `POST http://127.0.0.1:5177/api/v1/target-to-assay/mechanisms` 返回 HTTP 200、`application/json`，含 `resolvedTargets`、`sourceStatus` 和 `sourceErrors`。UniProt、Reactome、Open Targets 返回记录，ChEMBL 为 `failed`，原始诊断是 `timeout`。Vite 直接挂载共享 Worker 路由处理器，生产使用现有 Worker 入口。
- 直连 UniProt 解析了 MS4A1、PCSK9、TNFSF15、CD3E。Reactome 对应 accession 的路径和 TCR–CD3 通路都返回 HTTP 200。Open Targets 的 PCSK9 查询返回 GraphQL `data` 和 10 条候选，未返回 `errors`。ChEMBL 的靶点、分子机制请求超时，本地 Worker 对 ChEMBL 收到 HTTP 500。两类故障均独立记录，折叠区提供官方检索入口。
- 修改后，同一 Vite 路由仍返回 HTTP 200 和 JSON。新增 `sourceChecks` 区分 `success_with_data`、`success_empty`、`unresolved_target`、`timeout`、`rate_limited`、`upstream_error`、`parse_error`、`unavailable` 和 `cancelled`。数组为空表示本次查询没有发出该来源请求。Vite 在客户端连接断开时中止对应请求。Wrangler 日志记录机制路由返回 HTTP 200，UniProt、Reactome 和 Open Targets 有数据，ChEMBL 为 `upstream_error`、HTTP 500。
- 本轮真实查询返回 CD3 × CD20 四条完整分子机制，PCSK9 九条药物机制，TL1A × OSMR、PD-L1 × 4-1BB、CD3 × CD19 × CD20 三个完整组合为零条。另确认 CD3E 单独解析、未知别名返回 `unresolved_target`，取消后的下一条请求返回 200。
- 浏览器测试覆盖 1440 × 900 深色和浅色桌面、390 × 844 深色移动端、两种语言、连续提交、证据折叠及药物区跳转。桌面保留四张 CD3 × CD20 药物卡；移动端无横向溢出，显示最后一次提交的 TL1A × OSMR；浅色环境提交 PCSK9 后可查看 LDL 清除通路、展开来源并跳转到药物区。
- 本轮文件为 `src/pages/TargetToAssayExplorer.vue`、`src/components/target-to-assay/MechanismEvidence.vue`、`src/i18n/target-to-assay.js`、`src/lib/target-to-assay/{provider-status,live-mechanisms,target-biology,online}.js`、`vite.config.js`、`tests/target-to-assay-mechanisms.test.mjs` 与本文件。

## 药物排序、批准日期和证据排版

- 原排序只比较匹配类型，同级保留上游顺序。日期主要来自既有记录，首次打开审评区才会触发其余 Drugs@FDA 查询。Open Targets 的最高开发阶段不包含具体地区的首次批准日期。
- 现在先固定匹配组，再按官方首次批准日期、日期待核实的批准记录、申报与临床阶段、临床前、未知和特殊状态排序，然后截取前八条。日期无效时进入日期待核实组。同日或同阶段使用英文通用名和稳定的记录 ID 排序。历史最高阶段与下方临床试验的当前状态各自显示。
- Drugs@FDA 用 BLA 编号或活性成分核对申请。名称查询会用商品名和来源别名补充发现，返回结果仍核对活性成分。日期只取状态为 AP 的 ORIG 申请。实测 BLA761142、BLA761163、BLA761196 分别返回 2020-06-11、2020-07-31、2021-04-23。四种指定 CAR-T 的申请查询未返回记录，FDA CBER 原始批准资料提供了对应日期。[Drugs@FDA](https://open.fda.gov/apis/drug/drugsfda/) · [FDA CBER 产品目录](https://www.fda.gov/vaccines-blood-biologics/cellular-gene-therapy-products/approved-cellular-and-gene-therapy-products)
- 通过同源路由 `POST /api/v1/target-to-assay/ema-approvals` 读取 EMA 公共 JSON，仅返回选中组精确匹配的活性成分和首次上市许可日期。CD19 组实测返回八条欧洲记录。中国保留已有官方发证记录，发证日期单独标注。本轮未接入 NMPA 自动查询，其他中国日期待核实。[EMA JSON 数据说明](https://www.ema.europa.eu/en/about-us/about-website/download-website-data-json-data-format) · [NMPA 数据查询](https://www.nmpa.gov.cn/datasearch/home-index.html)
- 首卡默认仅列实际支持当前结论的来源。展开按靶点功能、通路和分子机制组织，Reactome 重复记录合并。接口诊断及本地分钟级时间位于末尾。药物卡默认显示类型、状态、匹配关系、最早已核实日期和一段 MoA，其他地区日期、审评和试验各自可展开。

CD19 单靶点组在浏览器中实测的顺序如下。八条批准记录的最早已核实地区均为美国。

| 药物 | 首次批准或历史阶段 |
| --- | --- |
| Tisagenlecleucel | 2017-08-30 |
| Axicabtagene ciloleucel | 2017-10-18 |
| Inebilizumab | 2020-06-11 |
| Brexucabtagene autoleucel | 2020-07-24 |
| Tafasitamab | 2020-07-31 |
| Lisocabtagene maraleucel | 2021-02-05 |
| Loncastuximab tesirine | 2021-04-23 |
| Obecabtagene autoleucel | 2024-11-08 |
| MDX-1342 | 最高 II 期，暂无已核实批准日期 |
| Oncolysin B | 最高 II 期，暂无已核实批准日期 |

CD3 × CD19、CD3 × CD20、PCSK9、TL1A × OSMR、PD-L1 × 4-1BB 均验证机制 API 返回 200。ChEMBL 仍有上游故障，其他来源继续呈现。1440px 桌面验证中文卡片、Blinatumomab 机制、证据分组、CD19 日期和 FDA 审评入口，390px 移动端验证英文排版、分页及同阶段排序，无横向溢出。

本轮文件为 `src/pages/TargetToAssayExplorer.vue`、`src/components/target-to-assay/MechanismEvidence.vue`、`src/i18n/target-to-assay.js`、`src/lib/target-to-assay/{approval-records,evidence,research,online}.js`、`src/worker/target-to-assay-api.js`、`vite.config.js`、`tests/target-to-assay-approval-order.test.mjs` 与本文件。


## 2026-11-13 通用检索与靶点生物学

- 标准符号、旧符号、别名、全名和外部 ID 经 UniProt 和 HGNC 核对。HGNC 可为具有多个 Ensembl 交叉引用的蛋白确定主基因记录。复合物支持 Reactome 稳定 ID，存在同名实体时保留选择。 [HGNC REST](https://hgnc.genenames.org/help/rest/) · [Reactome Content Service](https://reactome.org/dev/content-service/)
- Open Targets 候选无 MoA 时保留关联记录。ChEMBL 区分候选关联和直接作用，蛋白复合物要求组分 accession 集合一致。ClinicalTrials.gov 并行发现靶点关键词相关干预，再以已发现药物的名称、别名补查。只有唯一名称匹配才给既有药物附加试验，关键词命中的其它干预留在待核实区。 [Open Targets](https://platform-docs.opentargets.org/target/drugs) · [ChEMBL](https://www.ebi.ac.uk/chembl/api/data/docs) · [ClinicalTrials.gov](https://clinicaltrials.gov/data-api/api)
- 完整组合需要同一药物的一条明确共靶机制记录及引用，或既有核实的监管证据。独立的单靶点机制保留各自范围。已知额外靶点、部分匹配和待核实关联分开展示。CD3 亚基记录用于扩大检索，整复合物的表达与机制依各自证据判断。
- 药物以稳定数据库 ID 合并，已核实的活性成分形式等价可复用监管依据。排序沿用最早可核实的地区批准日期、最高已知研发阶段及英文名称。只读取固定数量的候选，不能据此推定全球完整覆盖。NCI 提供 [官方药物词典](https://www.cancer.gov/publications/dictionaries/cancer-drug) 供人工核对。
- HPA 单独标注正常组织 RNA、单细胞 RNA、免疫细胞 RNA、肿瘤组织 RNA 和质谱组织蛋白强度。肿瘤组织数据没有细胞归属。Open Targets 的疾病关联分值与表达分开。CD20 疾病表达另有 EMA 产品资料记录。 [HPA 数据访问](https://www.proteinatlas.org/about/help/dataaccess) · [HPA 引用要求](https://www.proteinatlas.org/about/licence) · [EMA MabThera §5.1](https://www.ema.europa.eu/en/documents/product-information/mabthera-epar-product-information_en.pdf#page=31)

### 真实查询摘要

| 输入 | 同次请求中的结果 |
| --- | --- |
| PD-1、PDCD1、CD279、HGNC:8760 | 统一为 PDCD1 / ENSG00000188389。每次 23 种带单靶点机制记录的药物，含 Pembrolizumab 和 Nivolumab。 [FDA Pembrolizumab §12.1](https://www.accessdata.fda.gov/drugsatfda_docs/label/2026/125514Orig1s186lbl.pdf) |
| CD20、MS4A1 | 统一为 MS4A1，各 12 种单靶点匹配。HPA 返回正常 B 细胞 RNA，EMA 提供独立的疾病表达记录。 |
| CD3 × CD19 | 贝林妥欧单抗有完整组合证据。其它仅有 CD3 亚基或 CD19 记录的分子保留为候选。 |
| CD3 × CD20 | 4 种有完整组合证据的药物。 |
| PCSK9 | 10 种有机制记录的药物。摘要显示 Evolocumab 和 Inclisiran 两类作用，FDA 资料用于核对 Inclisiran 与其钠盐的活性成分身份。 |
| VEGF、VEGFA | VEGF 返回家族或具体成员的选择。选家族返回 Reactome 家族通路，选 VEGFA 返回生长因子资料。 |
| IL-23 | ChEMBL 完整组分映射返回 5 种 IL-23 匹配。涉及 IL-12 额外证据的分子另列。HPA 未查询亚基以代替完整复合物。 |
| TL1A × OSMR、CD3 × CD19 × CD20、CD3 × CD19 × CD20 × PCSK9 | 均有分别可追溯的靶点生物学记录。此次未返回完整组合 MoA。 |
| TNF、EGFR、CTLA4、HGF、AP-2 complex | 通用解析分别覆盖细胞因子、受体、免疫检查点、生长因子和复合物。AP-2 同名实体要求确认，选 R-HSA-177480 后取回 7 条 Reactome 通路。 |

Open Targets 的 `Target.drugAndClinicalCandidates` 当前无分页参数。其返回窗口与 ClinicalTrials.gov 的研究页边界分别记录。试验阶段属于对应研究。源记录可关联同一原始资料，当前不以数据库命中数计量证据强度。
