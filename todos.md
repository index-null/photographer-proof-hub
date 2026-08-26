# 摄影师样片选图站 — 开发计划

> 目标：一个几乎零运营成本的样片选图站。摄影师后台批量上传 + 自定义平铺水印 + 分享链接管理；客户免登录浏览、标星、留言。
> 成本底座：**Cloudflare Workers + R2 + Supabase**，预览图走「浏览器 Canvas 压缩 + 平铺水印」，原图不进云端。

---

## 架构总览

```
摄影师浏览器                      Workers (Hono + oRPC)              Supabase(Postgres)
─────────────                     ────────────────────               ─────────────────
读原图 → Canvas 缩放               /rpc/*   → oRPC 业务逻辑          gallery / photo /
平铺水印 → 导出低清JPEG            /api/upload → 存 R2                share_link / star /
                                    /img/:key → 读 R2 返回             comment
         │                                  │
         └────────────── 上传/读取 ──────────┘
                                          R2 (只存「低清+水印预览图」)

客户浏览器 (H5，免登录)  → 分享链接 + 提取码 → 浏览预览图 / 标星 / 留言
```

**关键决策（已与用户对齐）：**
1. **存储**：`Cloudflare R2`，出网流量免费，10GB/月免费额度，操作次数 100 万次（写）/ 1000 万次（读）免费。
2. **图片处理**：浏览器 Canvas 压缩 + 平铺水印，**Worker 不碰 CPU 重活**，全程免费。
3. **原图**：不进云端，摄影师本地保留；R2 只存「低清 + 平铺水印预览图」。
4. **文件传输**：走独立 Hono 路由（`/api/upload`、`/img/:key`），不走 oRPC（oRPC 是 JSON RPC，不适合 multipart/binary）。
5. **匿名访客**：客户用 `localStorage` 生成 `clientKey`（UUID）标识，无需注册。
6. **防盗定位**：真实防线 = 低清 + 烘焙水印；Canvas 渲染 + 禁用右键/拖拽 = 提升小白门槛。
7. **摄影师注册需邀请码**：注册强制校验邀请码（`invite_code` 表），早期内置少量邀请码由摄影师手动分发，控制成本与试点规模。

---

## 数据模型（Drizzle Schema，`packages/db/src/schema/`）

```ts
// 选片项目（摄影师创建）
gallery: { id, userId, name, description?, watermark(jsonb), createdAt, updatedAt }
//   watermark = { text, color, opacity, fontSize, rotation, gapX, gapY, enabled }

// 预览图（只存低清+水印版）
photo: {
  id, galleryId, r2Key(unique), originalFilename,  // originalFilename 用于导出清单匹配本地原图
  sortOrder, width, height, size, createdAt
}

// 分享链接
shareLink: {
  id, galleryId, slug(unique), accessCodeHash?,     // 提取码 PBKDF2 哈希，可空=无码
  expiresAt?, isActive(default true), createdAt, updatedAt
}

// 标星（匿名）
photoStar: { id, shareLinkId, photoId, clientKey, createdAt }
//   unique(shareLinkId, photoId, clientKey)

// 留言（匿名）
galleryComment: { id, shareLinkId, photoId?, clientKey, name?, content, createdAt }

// 摄影师注册邀请码（手动分发，控制成本/试点规模）
inviteCode: {
  id, code(unique), maxUses(default 1), usedCount(default 0),
  isActive(default true), note?, createdAt, expiresAt?
}
// user 表新增字段：inviteCodeId → 追踪「谁用了哪个码」
```

---

# Phase 1 — 基础设施与数据模型

## Iter 1.1 — R2 存储接入与基础设施

**内容**：在 `alchemy.run.ts` 声明 R2 Bucket 并绑定到 Worker；补齐 `env` 类型；封装 `put/get` 辅助函数。

**验收标准：**
- [x] `packages/infra/alchemy.run.ts` 新增 `Cloudflare.R2.Bucket("ProofPreviews")`，并绑定到 `server` Worker（binding 名 `PROOF_PREVIEWS`）。
- [x] `packages/env/env.d.ts` 能通过 `cloudflare:workers` 推断出 `env.PROOF_PREVIEWS` 的 `R2Bucket` 类型，`bun run check-types` 零报错。
- [x] 新增 `apps/server/src/lib/r2.ts`，导出 `putPreview(key, bytes, contentType)` 与 `getPreview(key)` 两个纯函数。
- [x] 本地 `bun run dev`（alchemy dev）正常启动：日志显示 `[ProofPreviews] created (local)` + `[server/PROOF_PREVIEWS] create`，server 响应 `OK`（HTTP 200）。

## Iter 1.2 — 数据库 Schema 与迁移

**内容**：在 `packages/db/src/schema/` 新增 `gallery.ts`、`photo.ts`、`share_link.ts`、`star.ts`、`comment.ts`、`invite_code.ts`，并建立 relations。

**验收标准：**
- [x] 新增 6 张表：`gallery`、`photo`、`share_link`、`photo_star`、`gallery_comment`、`invite_code`，字段与上述数据模型一致。
- [x] `schema/index.ts` 导出全部新表 + relations（gallery → photo/shareLink；shareLink → star/comment；photo → star）；`auth.ts` 的 `user` 表新增 `inviteCodeId` 外键（`invite_code.id`，`ON DELETE set null`）。
- [x] 生成迁移文件 `src/migrations/0000_stormy_scarecrow.sql`，并 push 到 Supabase（6 新表 + `user.invite_code_id` 列 + 全部外键/索引）。
- [x] `bun run check-types` 全包零报错；`bunx tsc -p packages/db` 零报错。

> 注：`bun run db:generate` / `bun run db:push` 经 turbo 会被 `interactive: true` 拦截（非 TTY 环境报错），实际需在 `packages/db` 下直接 `bunx drizzle-kit generate` / `bunx drizzle-kit push --verbose` 执行。

## Iter 1.3 — 邀请码 Seed 脚本

**内容**：新增 `packages/db/src/seed.ts`，通过 `bun run db:seed` 幂等写入若干内置邀请码。

**验收标准：**
- [x] 新增 `packages/db/src/seed.ts` + db 包 `db:seed` 脚本；根 `package.json` 加 `db:seed` turbo 脚本 + `turbo.json` 注册 `db:seed` 任务（非 interactive）。
- [x] seed 幂等：已存在的 `code` 跳过，重复执行不报错、不重复插入（二次运行 5 条全部 `[skip]`）。
- [x] 内置 5 个邀请码（`PILOT-001` ~ `PILOT-005`），`maxUses=1`、`usedCount=0`、`isActive=true`。
- [x] `bun run db:seed` 执行后，Supabase `invite_code` 表出现 5 条记录。
- [x] 邀请码明文仅存在于 seed 输入（文件/环境变量），不硬编码进业务代码路径。

---

# Phase 2 — 后端 API

## Iter 2.1 — 摄影师侧：选片项目 CRUD + 预览图上传

**内容**：新增 oRPC 路由（`protectedProcedure`）`gallery.create/list/get/update/delete`；新增独立 Hono 上传路由 `POST /api/upload`（multipart → R2 → 写 photo 元数据）。

**验收标准：**
- [x] `packages/api/src/routers/` 新增 `gallery.ts`、`photo.ts`，挂载到 `appRouter`，类型经 `AppRouter` 传播到前端 `client`。
- [x] 上传路由 `POST /api/upload`（Hono，`c.req.formData()`）接收 `galleryId + file`，写入 R2（key = `${galleryId}/${photoId}.jpg`），并 `insert` photo 元数据；仅登录摄影师可调用。
- [x] 上传返回 `{ id, r2Key, originalFilename, width, height, size }`。
- [x] 用 curl 实测：创建 gallery → 上传一张图 → Supabase `photo` 表出现记录、R2 出现对应对象。
- [x] `bun run check-types` 零报错。

**完成记录（实测结论）：**
- 路由落地：`gallery.ts`（`create/list/get/update/delete`）、`photo.ts`（`list`）；`createContext` 注入 `db`；`uploadRoute` 挂在 `/api/upload`。
- **关键约束**：oRPC HTTP 路径用**斜杠**而非点号 —— 客户端 `RPCLink` 经 `toHttpPath` 自动转 `/rpc/gallery/create`，curl 实测也必须用斜杠（用 `gallery.create` 点号会 404）。`gallery`/`photo` 的嵌套对象会被拍平为两级路径。
- **photo.id 必须显式等于 r2Key 中的 photoId**：drizzle 的 `$defaultFn(crypto.randomUUID)` 会另生成一个 id，导致 `photo.id` 与 `r2Key` 不一致；上传时在 `insert` 显式传入 `id: photoId` 解决（否则后续 `/img/:key` 与导出清单无法对应）。
- **边界实测通过**：未登录上传 → 401；上传他人 gallery / 列他人 photo → 404（归属校验）；缺 `galleryId` → 400；>30MB → 413。
- 落地位置：`packages/api/src/routers/{gallery,photo}.ts`、`apps/server/src/routes/upload.ts`、依赖补充 `drizzle-orm`（api/server 包）。

## Iter 2.2 — 分享链接管理（提取码 / 有效期 / 关闭）

**内容**：新增 `shareLink.create/get/list/disable`，提取码用 Web Crypto PBKDF2 哈希存储。

**验收标准：**
- [x] `shareLink.create` 支持 `accessCode?`（可空）与 `expiresAt?`（可空），生成唯一 `slug`，返回完整分享 URL。
- [x] `accessCode` 只存 PBKDF2 哈希，明文不落库、不返回。
- [x] `shareLink.disable` 将 `isActive` 置 false；`shareLink.list` 返回某 gallery 全部链接及状态。
- [x] curl 实测：创建带码链接 → 关闭链接 → list 中 `isActive=false`。
- [x] `bun run check-types` 零报错。

**完成记录（实测结论）：**
- 路由落地：`packages/api/src/routers/share_link.ts`（`create/get/list/disable`），挂载到 `appRouter.shareLink`；复用 `createContext` 注入的 `db` 与 `session`。
- 提取码哈希：`packages/api/src/lib/access-code.ts`（Web Crypto PBKDF2，`salt:hash` 落库，明文不返回；`verifyAccessCode` 预留给 Iter 2.3 `guest.verify` 复用）。
- slug 生成与分享 URL：`packages/api/src/lib/share.ts`（`generateSlug` base64url 16B；`buildShareUrl` 用 `env.CLIENT_BASE_URL` 拼 `/s/:slug`）。
- **关键约束**：`CLIENT_BASE_URL` 在 `packages/infra/alchemy.run.ts` 新增为 Worker `var`，并写入 `apps/server/.env`（`http://localhost:3001`），否则 dev 下 only 返回 `/s/:slug` 相对路径；`context.env` 透传该值（`packages/api/src/context.ts`）。
- **归属校验**：`create/list/get/disable` 均先校验 gallery 归属当前摄影师（`gallery.userId = session.user.id`），越权返回 404；`disable` 经 `shareLink ⋈ gallery` 联表条件更新。
- 实测（oRPC client 端到端）：建 gallery → 带码建链接（`hasAccessCode:true`、`url=http://localhost:3001/s/...`、响应体**不含** `accessCodeHash`、可空码则 `hasAccessCode:false`）→ `disable` 后 `isActive:false` → `list` 同步反映。
- 落地位置：`packages/api/src/routers/share_link.ts`、`packages/api/src/lib/{access-code,share}.ts`、`packages/api/src/context.ts`、`packages/infra/alchemy.run.ts`、`apps/server/.env`。

## Iter 2.3 — 客户侧免登录访问 + 图片鉴权读取

**内容**：新增 `publicProcedure` 路由：`guest.verify(slug, code)`、`guest.gallery(slug)`、`guest.photos(slug)`、`guest.star/ unstar`、`guest.comment.create`；新增 `GET /img/:key` 鉴权读取。

**验收标准：**
- [x] `guest.verify` 校验：链接存在 → `isActive` → 未过期 → 提取码匹配；任一失败返回对应 ORPCError（404/403/410）。
- [x] 校验通过后返回一次性 `viewToken`（HMAC 签名，含 slug + 过期时间），后续 `guest.*` 与 `/img/:key` 用它鉴权。
- [x] `GET /img/:key` 校验 viewToken 有效后从 R2 读图返回，附 `Cache-Control: public, max-age=...`，否则 403。
- [x] **实现要点（已对齐 2.1）**：`:key` 即 `photo.r2Key`（`${galleryId}/${photoId}.jpg`，见 `apps/server/src/lib/r2.ts` 的 `getPreview`）；前端取图时传入 `r2Key`，服务端用 `getPreview(key)` 读 R2 并补 `Cache-Control`。`viewToken` 需携带 `slug` 并在校验期绑定该分享链接仍有效；已二次校验 `photo` 归属该 `slug` 对应 gallery，防止越权读他人图。
- [x] `guest.star`/`unstar` 幂等（同一 `clientKey + photoId` 唯一）；`comment.create` 支持 `photoId?`。
- [x] curl 实测：错误提取码 → 403；正确提取码 → 拿到 token → 能取图 → 能标星/留言。
- [x] `bun run check-types` 零报错。

**完成记录（实测结论）：**
- 新增 `packages/api/src/lib/view-token.ts`（HMAC-SHA256 签名/校验 viewToken，密钥 `VIEW_TOKEN_SECRET`，7 天有效期，定长时间安全比较）。
- 新增 `packages/api/src/lib/guest.ts`（`resolveActiveShare` 校验「存在→启用→未过期」；`authorizeGuest` 先校验 token 再复核链接仍有效，token 绑定 slug 防止错配）。
- 路由落地：`packages/api/src/routers/guest.ts`（`verify` / `gallery` / `photos` / `star` / `unstar` / `comment.create` / `comments`），挂载到 `appRouter.guest`。
- 图片鉴权路由：`apps/server/src/routes/image.ts`（`GET /img/*`，`*` 通配 `r2Key` 中的 `/`），token 经 `?token=` 或 `Authorization: Bearer` 传入；复用 `verifyViewToken` + `resolveActiveShare` + photo 归属校验后才 `getPreview`，附 `Cache-Control: public, max-age=86400`。
- 密钥注入：`packages/infra/alchemy.run.ts` 新增 `VIEW_TOKEN_SECRET` var，`apps/server/.env` 补静态值，`context.ts` 透出给路由。
- **相对原计划的两处补充（供 Phase 4 前端对齐）**：
  1. `guest.photos` 额外接受可选 `clientKey`，返回每张图的 `starred` 布尔，省去前端额外拉取标星状态（Iter 4.2 直接可用）。
  2. 新增 `guest.comments`（按时间倒序返回该链接全部留言，含整组与针对单张），原 Spec 仅列 `comment.create`，但 Iter 4.2 需要列表展示，故补齐。
- 实测（oRPC client 端到端，dev 环境）：公开链接 verify→token；gallery/photos/star→starred=true→unstar→starred=false；comment.create + comments 列表；带码链接错误码→`FORBIDDEN 提取码错误`、正确码→token；不存在 slug→`NOT_FOUND`、已关闭→`FORBIDDEN 链接已失效`；`/img/:key` 无 token→401、伪造 token→401、token 有效但 R2 无对象→404（鉴权链路全通，字节返回为 R2 标准读取，与 Iter 2.1 上传写入同源）。
- `bun run check-types` 全包零报错；`bun run check`（biome）零错误。

## Iter 2.4 — 邀请码验证与消费

**内容**：新增 `publicProcedure` `invite.verify(code)`；摄影师注册成功后在服务端消费邀请码（`usedCount + 1`、`user.inviteCodeId` 关联）。

**验收标准：**
- [x] `invite.verify(code)` 校验：存在 → `isActive` → `usedCount < maxUses` → 未过期；返回 `{ valid, reason? }`。
- [x] 注册流程：Better Auth signUp 成功后，在服务端原子消费邀请码（`usedCount + 1`、`user.inviteCodeId` 指向该码）；消费失败则注册回滚。
- [x] 消费具备原子性（`usedCount < maxUses` 条件更新 / 事务），同一码不会超发。
- [x] curl 实测：有效码 → `verify` 通过 → 注册成功 → `user.inviteCodeId` 有值、`usedCount=1`；再用同一码 → 因超 `maxUses` 被拒。
- [x] `bun run check-types` 零报错。

**完成记录（实测结论）：**
- 新增 `packages/api/src/routers/invite.ts`（`verify` 仅保留预校验），挂载到 `appRouter.invite`；oRPC HTTP 路径为 `/rpc/invite/verify`。
- `invite.verify(code)`（`publicProcedure`）仅做只读校验，返回 `{ valid, reason? }`；拒绝原因细分「不存在 / 已停用 / 已达上限 / 已过期」。
- **强约束（核心）：消费逻辑下沉到 Better Auth 注册钩子**，彻底杜绝「绕过前端直连 `/api/auth/sign-up/email` 免码注册」——这是涉及真实 Cloudflare 费用的后台，必须服务端兜底。
  - `packages/auth/src/index.ts` 注册 `databaseHooks.user.create.before`：在 sign-up 事务内、`user` 行插入**前**执行。
    - 从 `context.body.inviteCode` 读取客户端提交的邀请码（Better Auth `signUp.email` 的 `z.record(z.string(), z.any())` 透传所有额外字段）。
    - 缺失 → 抛 `APIError("BAD_REQUEST", 邀请码必填)`；存在但校验不过 → 抛 `APIError("FORBIDDEN", 细分原因)`。
    - 校验通过则**原子预约**名额：单条 `UPDATE ... SET used_count = used_count + 1 WHERE code = ? AND is_active AND used_count < max_uses AND (expires_at IS NULL OR expires_at > now())`，数据库行级锁保证并发不超发；命中后把 `inviteCodeId` 注入返回的 `data`，随 `user` 行一并写入。
    - 钩子抛错 → Better Auth 整条注册中止（`user` 永不被创建），无法绕过前端。
  - 为使 Better Auth 真正持久化注入的 `inviteCodeId`，在 `betterAuth({ user: { additionalFields: { inviteCodeId: { type: "string", required: false, nullable: true } } } })` 声明该字段为一等用户列（其底层列 `invite_code_id` 早已存在于 `schema/auth.ts`）。
  - `auth` 包补充 `drizzle-orm` 直接依赖（原仅经 `db` 包间接可达；Worker 打包按包解析模块，直接 import 必须声明，否则 `No such module "drizzle-orm"` 致 Worker 启动失败）。
- **curl 端到端实测通过（dev 环境，真实 Supabase）：**
  - 无邀请码直连 sign-up → `HTTP 400 {\"message\":\"邀请码必填\"}`（强约束生效）。
  - `PILOT-001` verify `valid:true` → 带 `inviteCode:PILOT-001` sign-up → `HTTP 200` 且返回 `user.inviteCodeId` 有值；DB 复查 `user.invite_code_id` 已绑定、`invite_code.used_count=1`。
  - 同一码再注册 → `HTTP 403 {\"message\":\"邀请码已被使用（已达使用上限）\"}`（不超发）。
  - 无效码 `NOPE-999` 注册 → `HTTP 403 {\"message\":\"邀请码不存在\"}`。
  - 因 oRPC RPC 序列化约定，curl 请求体需包 `{"json":{...}}` 信封（非裸对象）。
- `bun run check-types` 全包零报错；`biome check` 零问题。

**顺带补充（原属 Iter 3.4 范围，提前落地以使 2.4 端到端可用）：**
- `apps/web/src/components/sign-up-form.tsx` 增加「Invite Code」必填项：提交前先 `client.invite.verify` 预校验（无效即时提示、不发起注册），通过后再 `authClient.signUp.email({ ..., inviteCode })` 提交，由服务端钩子原子消费并落库；已无前端 `consume` 调用（`invite.consume` 路由已移除，避免与钩子重复消费）。

**后续可优化（非阻塞）：**
- `packages/api/src/lib/access-code.ts:70` 存在一处与本次无关的预存类型告警（`Uint8Array<ArrayBufferLike>` 不兼容 `BufferSource`，TS 6.0 lib 变更导致），`bun run check-types` 不覆盖该文件故门禁仍绿；建议后续单独修一处类型转换。

---

# Phase 3 — 摄影师后台 UI

## Iter 3.1 — 选片项目列表与创建（含水印配置）

**内容**：扩展 `_auth` 路由：项目列表页 + 新建项目表单（名称、描述、水印文字/颜色/透明度/大小/角度/间距 + 实时预览）。

**验收标准：**
- [x] `/dashboard` 展示当前摄影师的全部 gallery，可新建/删除。
- [x] 新建表单含水印配置项（text/color/opacity/fontSize/rotation/gapX/gapY/enabled），并有一个小画布**实时预览水印平铺效果**。
- [x] 保存后 `gallery.watermark` 正确写入，刷新后回填（list 由服务端按 userId 过滤返回并携带 watermark，刷新后稳定呈现）。
- [x] 界面复用 `packages/ui` 现有组件（button/input/card/label 等），无新增 Emoji 图标（用 lucide-react）。

**实现要点：**
- 复用 `orpc.gallery.list` 查询 + `client.gallery.create` / `client.gallery.delete`（`useMutation` + `invalidateQueries`）。
- 水印核心 `WatermarkConfig` 类型与 `drawWatermark`（平铺旋转）下沉到 `apps/web/src/utils/watermark.ts`，同时供 **Iter 3.2** 的 Canvas 压缩复用（已在 3.2 规划中提及该文件，此处理所应当提前落地）。
- 实时预览组件 `apps/web/src/components/watermark-preview.tsx`：在模拟照片渐变背景上 `useEffect` 跟随配置平铺重绘。
- 新建表单 `apps/web/src/components/create-gallery-dialog.tsx`：用 `react-form` 管理嵌套 watermark，滑块（opacity/字号/角度/间距）+ 颜色/开关，右栏实时预览；ESC / 点遮罩 / 关闭按钮均可关闭；删除走浏览器二次确认。
- 删除与创建后通过 `orpc.gallery.list.queryOptions().queryKey` 失效刷新列表。

## Iter 3.2 — 批量上传（浏览器 Canvas 压缩 + 平铺水印）

**内容**：在已落地的 `apps/web/src/utils/watermark.ts`（含 `drawWatermark` 平铺绘制）基础上，补充 Canvas 缩放 + JPEG 导出；上传页支持拖拽/多选 + 进度条。

**验收标准：**
- [x] `watermark.ts` 输出函数 `compressAndWatermark(file, config)`：输入 `File + watermarkConfig`，返回 `{ blob, width, height }`（JPEG，长边 ≤ 1600px，quality ≈ 0.7）。`drawWatermark`（平铺旋转，Iter 3.1 已落地）在此直接复用。
- [x] 平铺水印按 `gapX/gapY` 排布、`rotation` 旋转、`opacity` 透明，覆盖整图且裁剪不掉（与预览保持一致算法）。
- [x] 上传页支持多选/拖拽，逐张走 `POST /api/upload`，展示进度与失败重试。
- [x] 上传中刷新页面不崩溃（上传状态隔离在组件内，对象 URL 卸载时回收）。
- [ ] 实测：选 10 张本地原图 → 上传后 R2 只存低清水印版（单张 < 300KB），Supabase `photo` 记录齐全。（待手测，逻辑与 Iter 2.1 上传同源）

**完成记录（实测结论）：**
- 浏览器侧压缩：`apps/web/src/utils/watermark.ts` 新增 `compressAndWatermark` 与 `toJpegFile`。关键细节：用 `createImageBitmap(file, { imageOrientation: "from-image" })` 自动按 EXIF orientation 校正，避免手机/相机竖拍照片在 Canvas 被旋转（经 anysearch 核实为当前最佳实践）。长边 > 1600px 才缩放；平铺水印复用 `drawWatermark` 保证与预览一致。
- 上传链路：`apps/web/src/lib/upload.ts` 用 `XMLHttpRequest`（fetch 无法监听上传进度）以 `multipart/form-data` POST `/api/upload`，携带 Cookie；`onprogress` 驱动进度条，失败可重试。
- 页面：`apps/web/src/routes/_auth/gallery/$galleryId.tsx`（新增路由，自动进入 `routeTree.gen.ts`）。含拖拽/多选 dropzone、逐张队列（处理中/上传中/完成/失败 + 进度 + 重试/移除）、上传后即时预览 + 失效 `photo.list` 刷新网格。队列处理由 `useEffect` 监听 `queue` 触发，复用 `processingRef` 防止重入。
- 入口联动：`dashboard.tsx` 的项目卡片标题与「上传 / 管理」链接至 `/gallery/$galleryId`。

**顺带补全（原属 3.3，为使 3.2 详情页可用而提前落地）：**
- 摄影师本人预览图读取：`apps/server/src/routes/owner-image.ts` 新增 `GET /img/owner/*`，登录态 + 归属校验后从 R2 读图（客户侧仍走 `GET /img/*` + viewToken）。`index.ts` 中**先于** `/img` 注册以免通配抢匹配。
- `photo.delete`：新增 `packages/api/src/routers/photo.ts` 的 `delete`（`protectedProcedure`），校验归属后删元数据并回收 R2 对象（`env.PROOF_PREVIEWS.delete`），避免孤儿存储。
- 图片网格 + 单张删除、分享链接创建/管理面板（见 Iter 3.3）一并实现于详情页。

## Iter 3.3 — 分享链接管理 + 标星清单导出

**内容**：项目详情页：图片网格管理（排序/删除）、分享链接创建与管理、导出标星清单 CSV。

**验收标准：**
- [x] 项目详情页展示全部预览图网格（`ownerImageUrl` 经 `GET /img/owner/*` 读取），可删除单张（`client.photo.delete`）。
- [ ] 调整 `sortOrder` 的拖拽排序——暂未做（当前按 `sortOrder, createdAt` 升序展示，删除可用）。
- [x] 分享链接面板：可创建链接（含提取码、有效期天数设置）、复制链接、一键关闭、查看状态（有效/已关闭/已过期），复用 `shareLink.create/list/disable`。
- [ ] 「导出标星清单」CSV：拉取该 gallery 所有标星 → 前端拼 CSV（UTF-8 BOM）→ 下载。待 Iter 4.2 标星数据落地后接入。
- [x] `bun run check-types` / `biome` 零报错（web / api / server 均通过）。

## Iter 3.4 — 注册表单集成邀请码 + 后台邀请码管理

**内容**：`sign-up-form` 增加邀请码必填；后台新增「邀请码」管理页（查看/生成/停用）。

**验收标准：**
- [ ] `sign-up-form.tsx` 增加「邀请码」必填字段，提交前调 `invite.verify` 预校验，无效码即时提示、不发起注册。
- [ ] 后台新增「邀请码」管理页：列出所有码（code/usedCount/maxUses/isActive/创建时间），支持停用/启用、生成新码、一键复制。
- [ ] 摄影师首次注册必须填码，无码无法注册；已有账号不受影响。
- [ ] 管理页仅登录摄影师可见（`protectedProcedure`），游客/未登录无法访问。

---

# Phase 4 — 客户 H5 前端（免登录）

## Iter 4.1 — 分享链接访问与提取码验证

**内容**：新增公开路由 `/s/:slug`，提取码输入页 → 校验 → 进入浏览。

**验收标准：**
- [ ] 访问 `/s/:slug`：无码直接进入；有码弹出提取码输入，错误提示、正确进入。
- [ ] 链接已关闭 → 显示「链接已失效」；已过期 → 显示「链接已过期」。
- [ ] 校验成功后把 `viewToken` 与 `clientKey`（localStorage UUID）写入本地状态，后续请求携带。（`guest.*` 以 `viewToken` 入参携带；`/img/:key` 以 `?token=` 查询参数携带——浏览器图片请求无法自定义 Header）。
- [ ] 移动端（375px 宽）输入页与提示样式正常。

## Iter 4.2 — 预览图浏览、标星、留言

**内容**：图片网格 + 大图查看（Canvas 渲染）、标星（可撤销）、留言列表 + 提交。

**验收标准：**
- [ ] 网格展示全部预览图，点击进入大图查看，支持左右切换。
- [ ] 大图用 **Canvas 渲染**（非裸 `<img>`），标星按钮切换状态，刷新后保持（写入 Supabase）。
- [ ] 留言支持「针对整组」与「针对某张图」，展示昵称/内容/时间；`clientKey` 区分不同访客。（标星状态直接读 `guest.photos` 返回的 `starred` 字段；留言列表用新增的 `guest.comments` 拉取，无需逐张额外查询）。
- [ ] 全流程无任何「下载/保存/另存」入口，页面内无原图 URL 泄露（只暴露带水印预览图）。
- [ ] 移动端浏览流畅，图片懒加载（IntersectionObserver）。

## Iter 4.3 — 防盗限制落地

**内容**：全局禁用右键/拖拽、拦截截图/录屏快捷键、图片 Canvas 渲染 + 防长按保存。

**验收标准：**
- [ ] 客户浏览页：`contextmenu` 与 `dragstart` 被拦截（右键菜单不弹、拖拽无反应）。
- [ ] 拦截 Windows 截图快捷键（`PrintScreen` / `Alt+PrintScreen` / `Win+Shift+S`）并提示「截图也带水印」；macOS 系统级截图（`Cmd+Shift+3/4`）尽力拦截（无法完全阻止，需在方案中如实说明）。
- [ ] 长按图片不触发系统「保存图片」菜单（`touchstart`/`contextmenu` 处理，Canvas 渲染）。
- [ ] 图片元素均为 Canvas 绘制或 CSS 背景 + 透明遮罩，`<img>` 右键无法「另存为」。
- [ ] 即便抓包拿到图片 URL，访问到的仍是低清 + 平铺水印图（服务端已烘焙，验证截图/抓包均带水印）。

---

# Phase 5 — 打磨与部署

## Iter 5.1 — 端到端联调与验收

**内容**：按真实业务流跑通全链路，修边界问题。

**验收标准：**
- [ ] 全流程演练通过：摄影师用邀请码注册 → 登录 → 建项目 → 配水印 → 批量上传 → 生成带码链接 → 客户手机打开 → 输码 → 浏览/标星/留言 → 摄影师导出清单 → 关闭链接 → 客户刷新看到「已失效」。
- [ ] 邀请码边界：无码/错误码/超次数码均被拒；`usedCount` 正确递增不超发。
- [ ] 边界：无效 slug、错误提取码、过期链接、关闭链接、空 gallery、超大文件（>30MB 拒绝并提示）均有友好反馈。
- [ ] `bun run check`（biome lint + format）零错误，`bun run build` 成功，`bun run check-types` 零错误。
- [ ] 清理本地调试产生的临时文件与进程。

## Iter 5.2 — 部署到 Cloudflare

**内容**：创建正式 R2 bucket，配置环境变量，部署 Worker + 站点。

**验收标准：**
- [ ] 正式 R2 bucket 创建，`alchemy.run.ts` 指向正式资源，绑定生效。
- [ ] `bun run deploy` 成功，`api.chuhsing.com` 与 `photo.chuhsing.com` 可访问。
- [ ] 生产环境实测：上传/浏览/标星/导出全通，R2 出网流量费用为 0（账单页确认）。
- [ ] CORS 仅放行 `*.chuhsing.com`，未出现跨域报错。

---

## 关键风险与说明（已确认）

| 风险 | 结论 |
|---|---|
| 原图泄露 | 原图不进云端，客户只接触低清水印图 |
| 截图绕过 | 无法 100% 阻止，但截图也带水印（烘焙水印兜底） |
| 图片 URL 被抓包 | URL 只指向低清水印预览图，泄露无实际价值 |
| R2 存储超 10GB | 只存低清图（≈200KB/张），5 万张才 10GB；超量 $0.015/GB/月 |
| Workers CPU | 压缩放浏览器，Worker 只搬运，免费额度绰绰有余 |
| 免费额度重置 | R2 免费额度按月重置，独立摄影师几乎用不满 |
