# Long4Craft 搜索优化

## 已完成的站内设置

- 标题：**Long4Craft｜网站建设、软件开发与 AI 应用**。
- 摘要说明网站作品、免费源码与六类开发服务，正文首屏简短说明实际业务。
- `seo.mjs` 统一维护标题、摘要、正式网址、社交分享图和结构化数据。
- 首页只有一个 H1；作品与服务内容在构建时直接输出 HTML，阅读和发现项目链接不需要先运行 JavaScript。
- 使用正常的 `<a href>` 链接指向四个作品的实际独立子域名。
- 标准地址统一为 `https://long4craft.com/`；带预览参数的地址也指向这个 canonical。
- JSON-LD 包含 WebSite、WebPage、Person、分享图、作品列表及六类 Service。服务内容直接从可见卡片读取，作品来自已验收的公开目录。
- 没有虚构企业地址、客户评价、评分、价格、认证或流量数据；没有不存在的站内搜索功能标记。
- Open Graph 与 Twitter 分享信息完整，分享图为 1200 × 630 的实际页面截图。
- 图片保留文字说明与尺寸；作品图使用 WebP 与延迟加载，首屏主图优先加载。
- 构建时生成 `dist/robots.txt` 与 `dist/sitemap.xml`。本站只有一个正式页面，因此地图只包含首页；页面锚点及其他子域名不冒充本域页面。
- 提供 `404.html` 并标记 `noindex`。托管上线后仍须验证不存在的路径确实返回 HTTP 404，避免把错误页以 HTTP 200 返回。

## 维护与检查

```sh
npm run check
npm run build
npm run check:seo
```

`check:seo` 检查实际生成的页面与文件：重复/缺失标签、未替换模板、主标题、真实图片尺寸、断开的锚点与本地文件、JSON-LD 引用、可见服务与结构化数据的一致性、作品目录、站点地图和错误页标记。

修改服务卡片或公开网站目录后，需要重新构建并检查。新增真正的独立页面后，再为它增加独立标题、摘要、正文与地图条目；不能把锚点或只有关键词的空壳页面作为独立内容提交。

## 正式上线后进行

1. 验证正式根域名的公开 HTTPS、首页 HTTP 200、错误路径 HTTP 404，以及 CSS、JavaScript、Logo、分享图等资源可访问。
2. 确认生产站没有登录保护、`noindex` 或禁止抓取的响应头；如发布测试域名，测试站应另外限制索引。根据最终托管平台配置 HTTP/HTTPS、根域名和其他别名的统一跳转。
3. 使用站点所有者账号在 Google Search Console 验证 `long4craft.com`，提交 `https://long4craft.com/sitemap.xml`，检查首页抓取结果。
4. 在百度搜索资源平台验证站点，按该账号当前开放的普通收录或地图提交通道提交正式链接。
5. 如需 Bing，在 Bing Webmaster Tools 验证站点并提交地图。
6. 上线后再查看真实移动端性能、抓取、索引、搜索词、展示和点击数据，按实际结果迭代。

这些是后续上线步骤，目前没有完成站长平台的所有权验证、外部提交或实际收录。本源码不含验证 Token、自动推送脚本或跟踪工具。

## 核对依据

- [Google SEO 入门指南](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Google 搜索标题](https://developers.google.com/search/docs/appearance/title-link)
- [Google 搜索摘要](https://developers.google.com/search/docs/appearance/snippet)
- [Google 网站名称结构化数据](https://developers.google.com/search/docs/appearance/site-names)
- [Google 站点地图](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google 结构化数据规则](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [百度普通收录](https://ziyuan.baidu.com/linksubmit/index)
- [Bing 站点验证](https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b)

核对日期：2026-10-20。搜索优化帮助引擎理解内容，实际标题、摘要、索引和排序由搜索引擎决定。
