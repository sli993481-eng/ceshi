# 以色列访问网关（Vercel）

访客通过本站时：以色列 IP 或白名单 IP 会跳转到**后台里填写的网站**；其他人、黑名单、机器人会跳转到 Airbnb。后台地址：`/vercel-com`。后台对全球开放（需密码），否则人在国外无法登录。

## 部署到 Vercel

1. 在 [MongoDB Atlas](https://www.mongodb.com/atlas) 新建集群，创建数据库用户，把 Network Access 设为允许 `0.0.0.0/0`（Vercel 出口 IP 会变）。
2. 把本项目导入 [vercel.com](https://vercel.com/)（Git 导入或 CLI）。
3. 在 Vercel 项目 **Storage** 中创建 **Blob** 存储，并连接到本项目（会自动出现 `BLOB_READ_WRITE_TOKEN`）。
4. 在 Vercel 项目 **Settings → Environment Variables** 填写：

| 变量 | 说明 |
| --- | --- |
| `MONGODB_URI` | Atlas 连接串 |
| `ADMIN_PASSWORD` | 后台密码，尽量长且随机 |
| `SESSION_SECRET` | 至少 16 位随机字符串 |
| `BLOB_READ_WRITE_TOKEN` | 创建 Blob 后一般会自动注入 |

5. 重新部署。打开 `https://你的域名/vercel-com` 登录后台，在「跳转网站」里填写放行后要去的网址。未填写时，即使放行也会先去 Airbnb。

本地开发：复制 `.env.example` 为 `.env.local` 后执行 `npm run dev`。本地没有 Vercel 地理头，国家会是空的，前台会按「未知地区」拦截（除非 IP 在白名单）。

## 使用说明

- 访问日志会记录浏览器版本、IP、国家/省/市、时间和拦截原因；黑名单访问也会显示。
- 设备拉黑用的是浏览器特征码，不是手机序列号（网页拿不到 IMEI）。
- 上传文件后会返回需登录才能打开的下载地址。
