"use client";

import { upload } from "@vercel/blob/client";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { DECISION_LABEL, type VisitDecision } from "@/lib/constants";

type Tab = "logs" | "allow" | "deny" | "devices" | "files" | "audits";

type LogItem = {
  id: string;
  ip: string;
  location: string;
  country: string;
  city: string;
  browser: string;
  os: string;
  device: string;
  fingerprint: string;
  decision: VisitDecision;
  isBot: boolean;
  createdAt: string;
};

export default function AdminApp() {
  const [ready, setReady] = useState(false);
  const [dbOk, setDbOk] = useState(false);
  const [csrf, setCsrf] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("logs");

  const headers = useMemo(() => {
    const h: Record<string, string> = { "content-type": "application/json" };
    if (csrf) h["x-csrf-token"] = csrf;
    return h;
  }, [csrf]);

  const refreshMe = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/me");
      const data = (await res.json()) as { ok?: boolean; dbOk?: boolean; csrf?: string };
      setDbOk(Boolean(data.dbOk));
      if (res.ok && data.ok) {
        setLoggedIn(true);
        setCsrf(data.csrf || "");
      } else {
        setLoggedIn(false);
      }
    } catch {
      setDbOk(false);
      setLoggedIn(false);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  async function login(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = (await res.json()) as { error?: string; csrf?: string };
    if (!res.ok) {
      setError(data.error || "登录失败");
      return;
    }
    setCsrf(data.csrf || "");
    setLoggedIn(true);
    setPassword("");
    await refreshMe();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setLoggedIn(false);
    setCsrf("");
  }

  if (!ready) {
    return <Centered>加载中…</Centered>;
  }

  if (!dbOk) {
    return (
      <Centered>
        <h1 className="mb-2 text-xl font-semibold">数据库未连接</h1>
        <p className="max-w-md text-sm text-slate-300">
          请在 Vercel 环境变量中配置 MONGODB_URI，并在 Atlas 放行来源 IP。后台必须连接
          MongoDB 后才能使用。
        </p>
      </Centered>
    );
  }

  if (!loggedIn) {
    return (
      <Centered>
        <h1 className="mb-4 text-xl font-semibold">后台登录</h1>
        <form onSubmit={login} className="flex w-full max-w-sm flex-col gap-3">
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码"
            className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2"
          />
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button className="rounded-lg bg-sky-600 px-3 py-2 font-medium hover:bg-sky-500">
            进入
          </button>
        </form>
      </Centered>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="font-semibold">访问网关后台</div>
        <button onClick={() => void logout()} className="text-sm text-slate-400 hover:text-white">
          退出
        </button>
      </header>
      <nav className="flex flex-wrap gap-2 border-b border-slate-800 px-4 py-2 text-sm">
        {(
          [
            ["logs", "访问日志"],
            ["allow", "IP 白名单"],
            ["deny", "IP 黑名单"],
            ["devices", "设备黑名单"],
            ["files", "文件上传"],
            ["audits", "操作审计"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-md px-3 py-1 ${tab === id ? "bg-sky-700" : "bg-slate-800"}`}
          >
            {label}
          </button>
        ))}
      </nav>
      <main className="p-4">
        {tab === "logs" ? <LogsPanel headers={headers} /> : null}
        {tab === "allow" ? <IpPanel type="allow" headers={headers} /> : null}
        {tab === "deny" ? <IpPanel type="deny" headers={headers} /> : null}
        {tab === "devices" ? <DevicePanel headers={headers} /> : null}
        {tab === "files" ? <FilesPanel headers={headers} csrf={csrf} /> : null}
        {tab === "audits" ? <AuditPanel /> : null}
      </main>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-slate-100">
      {children}
    </div>
  );
}

function LogsPanel({ headers }: { headers: Record<string, string> }) {
  const [q, setQ] = useState("");
  const [decision, setDecision] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<LogItem[]>([]);
  const [stats, setStats] = useState({ total: 0, allowed: 0, blocked: 0, bots: 0, last24: 0 });
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page) });
    if (q) params.set("q", q);
    if (decision) params.set("decision", decision);
    const [logsRes, statsRes] = await Promise.all([
      fetch(`/api/admin/logs?${params}`),
      fetch("/api/admin/stats"),
    ]);
    const logs = (await logsRes.json()) as { items: LogItem[]; pages: number; total: number };
    const st = (await statsRes.json()) as typeof stats;
    setItems(logs.items || []);
    setPages(logs.pages || 1);
    setTotal(logs.total || 0);
    if (statsRes.ok) setStats(st);
  }, [page, q, decision]);

  useEffect(() => {
    void load();
  }, [load]);

  async function banIp(ip: string) {
    const res = await fetch("/api/admin/lists", {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "deny", value: ip, note: "来自日志一键拉黑" }),
    });
    setMsg(res.ok ? `已拉黑 IP ${ip}` : "拉黑 IP 失败（可能已存在）");
    await load();
  }

  async function banDevice(fingerprint: string) {
    const res = await fetch("/api/admin/devices", {
      method: "POST",
      headers,
      body: JSON.stringify({ fingerprint, note: "来自日志一键拉黑" }),
    });
    setMsg(res.ok ? "已拉黑设备" : "拉黑设备失败（无特征码或已存在）");
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="总访问" value={stats.total} />
        <Stat label="已放行" value={stats.allowed} />
        <Stat label="已拦截" value={stats.blocked} />
        <Stat label="机器人" value={stats.bots} />
        <Stat label="近 24 小时" value={stats.last24} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          placeholder="搜索 IP / 城市 / 浏览器 / 特征码"
          className="min-w-56 flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        />
        <select
          value={decision}
          onChange={(e) => {
            setPage(1);
            setDecision(e.target.value);
          }}
          className="rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-sm"
        >
          <option value="">全部结果</option>
          {Object.entries(DECISION_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            window.location.href = "/api/admin/logs/export";
          }}
          className="rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
        >
          导出 CSV
        </button>
      </div>
      {msg ? <p className="text-sm text-sky-300">{msg}</p> : null}
      <p className="text-xs text-slate-400">共 {total} 条（含黑名单与拦截记录）</p>
      <div className="overflow-x-auto rounded-lg border border-slate-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-900 text-slate-300">
            <tr>
              <th className="px-2 py-2">时间</th>
              <th className="px-2 py-2">IP</th>
              <th className="px-2 py-2">解析位置</th>
              <th className="px-2 py-2">浏览器</th>
              <th className="px-2 py-2">结果</th>
              <th className="px-2 py-2">特征码</th>
              <th className="px-2 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-800">
                <td className="whitespace-nowrap px-2 py-2 text-xs">
                  {formatTime(item.createdAt)}
                </td>
                <td className="px-2 py-2 font-mono text-xs">{item.ip}</td>
                <td className="px-2 py-2">{item.location || "未知"}</td>
                <td className="px-2 py-2">
                  <div>{item.browser}</div>
                  <div className="text-xs text-slate-400">
                    {item.os} · {item.device}
                    {item.isBot ? " · 机器人" : ""}
                  </div>
                </td>
                <td className="px-2 py-2">{DECISION_LABEL[item.decision] || item.decision}</td>
                <td className="max-w-32 truncate px-2 py-2 font-mono text-xs" title={item.fingerprint}>
                  {item.fingerprint || "—"}
                </td>
                <td className="px-2 py-2">
                  <div className="flex flex-col gap-1">
                    <button className="text-xs text-red-300" onClick={() => void banIp(item.ip)}>
                      拉黑 IP
                    </button>
                    {item.fingerprint ? (
                      <button
                        className="text-xs text-red-300"
                        onClick={() => void banDevice(item.fingerprint)}
                      >
                        拉黑设备
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="rounded bg-slate-800 px-3 py-1 disabled:opacity-40"
        >
          上一页
        </button>
        <span className="py-1 text-sm">
          {page} / {pages}
        </span>
        <button
          disabled={page >= pages}
          onClick={() => setPage((p) => p + 1)}
          className="rounded bg-slate-800 px-3 py-1 disabled:opacity-40"
        >
          下一页
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function IpPanel({ type, headers }: { type: "allow" | "deny"; headers: Record<string, string> }) {
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<{ id: string; value: string; note: string; createdAt: string }[]>(
    [],
  );
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/lists?type=${type}`);
    const data = (await res.json()) as { items: typeof items };
    setItems(data.items || []);
  }, [type]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/lists", {
      method: "POST",
      headers,
      body: JSON.stringify({ type, value, note }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error || "添加失败");
      return;
    }
    setValue("");
    setNote("");
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/admin/lists?id=${id}`, { method: "DELETE", headers });
    await load();
  }

  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm text-slate-400">
        {type === "allow"
          ? "白名单 IP 即使不在以色列也可以放行。支持单 IP 或 CIDR，例如 1.2.3.0/24。"
          : "黑名单优先于以色列和白名单，命中后一律跳转 Airbnb。"}
      </p>
      <form onSubmit={add} className="flex flex-wrap gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="IP 或 CIDR"
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="备注"
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2"
        />
        <button className="rounded-md bg-sky-700 px-3 py-2">添加</button>
      </form>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between px-3 py-2">
            <div>
              <div className="font-mono text-sm">{item.value}</div>
              <div className="text-xs text-slate-400">
                {item.note} · {formatTime(item.createdAt)}
              </div>
            </div>
            <button className="text-sm text-red-300" onClick={() => void remove(item.id)}>
              删除
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DevicePanel({ headers }: { headers: Record<string, string> }) {
  const [fingerprint, setFingerprint] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<
    { id: string; fingerprint: string; note: string; createdAt: string }[]
  >([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/devices");
    const data = (await res.json()) as { items: typeof items };
    setItems(data.items || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/devices", {
      method: "POST",
      headers,
      body: JSON.stringify({ fingerprint, note }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error || "添加失败");
      return;
    }
    setFingerprint("");
    setNote("");
    await load();
  }

  async function remove(id: string) {
    await fetch(`/api/admin/devices?id=${id}`, { method: "DELETE", headers });
    await load();
  }

  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm text-slate-400">
        网页无法读取手机 IMEI。这里使用浏览器特征码（64 位十六进制）。可从访问日志一键拉黑，或手动粘贴。
      </p>
      <form onSubmit={add} className="flex flex-wrap gap-2">
        <input
          value={fingerprint}
          onChange={(e) => setFingerprint(e.target.value)}
          placeholder="64 位特征码"
          className="min-w-72 flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm"
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="备注"
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2"
        />
        <button className="rounded-md bg-sky-700 px-3 py-2">拉黑</button>
      </form>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="min-w-0">
              <div className="truncate font-mono text-xs">{item.fingerprint}</div>
              <div className="text-xs text-slate-400">
                {item.note} · {formatTime(item.createdAt)}
              </div>
            </div>
            <button className="shrink-0 text-sm text-red-300" onClick={() => void remove(item.id)}>
              删除
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FilesPanel({
  headers,
  csrf,
}: {
  headers: Record<string, string>;
  csrf: string;
}) {
  const [items, setItems] = useState<
    { id: string; pathname: string; contentType: string; downloadUrl: string; createdAt: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/files");
    const data = (await res.json()) as { items: typeof items };
    setItems(data.items || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setMsg("");
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
      const blob = await upload(`uploads/${safe}`, file, {
        access: "private",
        handleUploadUrl: "/api/admin/upload",
        headers: { "x-csrf-token": csrf },
      });
      const res = await fetch("/api/admin/files", {
        method: "POST",
        headers,
        body: JSON.stringify({
          pathname: blob.pathname,
          contentType: blob.contentType,
          url: blob.url,
        }),
      });
      const data = (await res.json()) as { downloadUrl?: string; error?: string };
      if (!res.ok) {
        setMsg(data.error || "保存记录失败");
      } else {
        setMsg(`上传成功，下载地址：${data.downloadUrl}`);
        if (data.downloadUrl) {
          await navigator.clipboard.writeText(data.downloadUrl).catch(() => undefined);
        }
      }
      await load();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "上传失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-4">
      <p className="text-sm text-slate-400">
        支持图片、PDF、ZIP、TXT、CSV。下载地址需要登录后台才能打开，请勿把后台密码告诉无关人员。
      </p>
      <input type="file" disabled={busy} onChange={(e) => void onFile(e)} />
      {busy ? <p className="text-sm">上传中…</p> : null}
      {msg ? <p className="break-all text-sm text-sky-300">{msg}</p> : null}
      <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800">
        {items.map((item) => (
          <li key={item.id} className="flex flex-col gap-1 px-3 py-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm">{item.pathname}</div>
              <div className="text-xs text-slate-400">
                {item.contentType} · {formatTime(item.createdAt)}
              </div>
            </div>
            <div className="flex gap-3 text-sm">
              <a className="text-sky-300" href={item.downloadUrl}>
                下载
              </a>
              <button
                className="text-slate-300"
                onClick={() => void navigator.clipboard.writeText(item.downloadUrl)}
              >
                复制地址
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AuditPanel() {
  const [items, setItems] = useState<
    { id: string; action: string; ip: string; detail: unknown; createdAt: string }[]
  >([]);
  useEffect(() => {
    void fetch("/api/admin/audits")
      .then((r) => r.json())
      .then((d: { items: typeof items }) => setItems(d.items || []));
  }, []);
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-900">
          <tr>
            <th className="px-2 py-2">时间</th>
            <th className="px-2 py-2">动作</th>
            <th className="px-2 py-2">操作 IP</th>
            <th className="px-2 py-2">详情</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-slate-800">
              <td className="whitespace-nowrap px-2 py-2 text-xs">{formatTime(item.createdAt)}</td>
              <td className="px-2 py-2">{item.action}</td>
              <td className="px-2 py-2 font-mono text-xs">{item.ip}</td>
              <td className="max-w-xl truncate px-2 py-2 font-mono text-xs">
                {JSON.stringify(item.detail)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatTime(v: string | Date) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("zh-CN", { hour12: false });
}
