# HOXF Football Feed

所有访问者共用这一份赛程。浏览器不连接 API-FOOTBALL，也不持有 API Key。

```text
API-FOOTBALL
    ↓
PHP cron / update-fixtures.php
    ↓
server/data/fixtures.json
    ↓
server/public/fixtures.php
    ↓
HOXF SPORT TV
```

PHP 只更新足球赛程。它不处理注册、登录、VIP 或支付。

## 环境

- PHP 8 或更高版本
- 启用 `php-curl`
- 运行 Cron 的系统用户对 `server/data` 有读写权限

推荐权限：

```text
server/data        775
fixtures.json      664
meta.json          664
```

目录所有者设为 Web / Cron 用户。不要把目录改成 `777`。

## API Key

优先读取环境变量：

```text
API_FOOTBALL_KEY
```

开发机如果没有环境变量，可以复制配置文件：

```bash
cp server/config/config.example.php server/config/config.php
```

然后只在 `server/config/config.php` 里填写 Key。这个文件已在 `.gitignore` 中，不能提交。

不要把 Key 写进 Vue、`.env`、`README`、`fixtures.json` 或 `fixtures.php`。

## 网站目录

API 站点的网站目录应指向：

```text
server/public
```

这样对外只有 `fixtures.php`。`config`、`cron`、`data` 和 `lib` 不能通过网址下载。

前端环境变量：

```env
VITE_FOOTBALL_FEED_URL=https://api.example.com/fixtures.php
```

前端和 Feed 不同源时，`fixtures.php` 已允许跨域 `GET` 和 `OPTIONS`。

## 首次生成数据

Cron 开始前可以先手动跑一次：

```bash
php server/cron/update-fixtures.php
```

成功时输出 `updated`，并写入 `server/data/fixtures.json`。

没有 Key、请求失败、超时或返回 429 时，已有的 `fixtures.json` 不会被覆盖。文件还不存在时，前端会使用本地比赛。

## Cron

每 5 分钟执行脚本。脚本自己决定要不要访问 API-FOOTBALL。

```bash
*/5 * * * * php /www/wwwroot/hoxf-api/server/cron/update-fixtures.php >/dev/null 2>&1
```

把路径换成服务器上的实际路径。

每天最多 85 次 API 请求。响应头里的剩余额度如果小于或等于 15，当天不再自动请求。

更新间隔：

- 有进行中的比赛：至少 10 分钟
- 没有进行中的比赛，但下一场在 60 分钟内：20 分钟
- 今天还有比赛，但开赛还更晚：30 分钟
- 没有临近比赛：60 分钟

不会每 15 秒、30 秒或 1 分钟请求一次。

## 宝塔面板

1. 打开「计划任务」。
2. 任务类型选择「Shell 脚本」。
3. 执行周期选择每 5 分钟。
4. 脚本内容：

```bash
php /实际路径/server/cron/update-fixtures.php
```

保存后可以先点一次「执行」，确认 `server/data/fixtures.json` 已生成。

## 检查

```bash
php -l server/cron/update-fixtures.php
php -l server/public/fixtures.php
php -l server/lib/feed.php
```
