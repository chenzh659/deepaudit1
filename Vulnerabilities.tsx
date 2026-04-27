import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, ChevronDown, Search, Shield, Filter, FileText, Bug, Zap, Code, Wrench, RefreshCw, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { api } from "@/shared/config/database";
import type { AuditIssue } from "@/shared/types";
import { toast } from "sonner";

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const SEVERITY_LABELS: Record<string, string> = {
  critical: "严重",
  high: "高危",
  medium: "中危",
  low: "低危",
};

const SEVERITY_ICON_CLASS: Record<string, string> = {
  critical: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
  high: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  medium: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  low: "bg-sky-500/20 text-sky-400 border border-sky-500/30",
};

const SEVERITY_BADGE_CLASS: Record<string, string> = {
  critical: "severity-critical",
  high: "severity-high",
  medium: "severity-medium",
  low: "severity-low",
};

const SEVERITY_LEFT_BORDER: Record<string, string> = {
  critical: "border-l-rose-500",
  high: "border-l-orange-500",
  medium: "border-l-amber-500",
  low: "border-l-sky-500",
};

const STATUS_LABELS: Record<string, string> = {
  open: "待处理",
  resolved: "已解决",
  false_positive: "误报",
};

const TYPE_LABELS: Record<string, string> = {
  bug: "Bug",
  security: "安全",
  performance: "性能",
  style: "风格",
  maintainability: "可维护性",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  bug: <Bug className="w-3 h-3" />,
  security: <Shield className="w-3 h-3" />,
  performance: <Zap className="w-3 h-3" />,
  style: <Code className="w-3 h-3" />,
  maintainability: <Wrench className="w-3 h-3" />,
};

function getStatusBadgeClass(status?: string): string {
  switch (status) {
    case "resolved":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "false_positive":
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    default:
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Vulnerabilities() {
  const [allIssues, setAllIssues] = useState<AuditIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadAllIssues();
  }, []);

  async function loadAllIssues() {
    setLoading(true);
    try {
      const tasks = await api.getAuditTasks();
      const completedTasks = tasks.filter((t) => t.status === "completed");
      const results = await Promise.allSettled(
        completedTasks.map((t) => api.getAuditIssues(t.id))
      );
      const issues: AuditIssue[] = [];
      results.forEach((r) => {
        if (r.status === "fulfilled") issues.push(...r.value);
      });
      issues.sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4));
      setAllIssues(issues);
    } catch {
      toast.error("加载漏洞列表失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(issue: AuditIssue, newStatus: string) {
    try {
      await api.updateAuditIssue(issue.task_id, issue.id, { status: newStatus as AuditIssue["status"] });
      setAllIssues((prev: AuditIssue[]) =>
        prev.map((i: AuditIssue) => (i.id === issue.id ? { ...i, status: newStatus as AuditIssue["status"] } : i))
      );
      toast.success("状态已更新");
    } catch {
      toast.error("更新状态失败");
    }
  }

  const filtered = allIssues.filter((issue: AuditIssue) => {
    if (severityFilter !== "all" && issue.severity !== severityFilter) return false;
    if (statusFilter !== "all" && issue.status !== statusFilter) return false;
    if (typeFilter !== "all" && issue.issue_type !== typeFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!issue.title.toLowerCase().includes(q) && !issue.file_path.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const criticalCount = allIssues.filter((i: AuditIssue) => i.severity === "critical").length;
  const highCount = allIssues.filter((i: AuditIssue) => i.severity === "high").length;
  const openCount = allIssues.filter((i: AuditIssue) => i.status === "open").length;
  const resolvedCount = allIssues.filter((i: AuditIssue) => i.status === "resolved").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground uppercase tracking-wider font-mono">漏洞中心</h2>
            <p className="text-xs text-muted-foreground font-mono">VULNERABILITY MANAGEMENT SYSTEM</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="cyber-btn-outline font-mono gap-2"
          onClick={loadAllIssues}
          disabled={loading}
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="cyber-card p-4 border-l-4 border-l-foreground/20">
          <p className="text-3xl font-bold text-foreground font-mono">{allIssues.length}</p>
          <p className="text-xs text-muted-foreground font-mono mt-1 uppercase">总漏洞数</p>
        </div>
        <div className="cyber-card p-4 border-l-4 border-l-rose-500">
          <p className="text-3xl font-bold text-rose-400 font-mono">{criticalCount}</p>
          <p className="text-xs text-muted-foreground font-mono mt-1 uppercase">严重漏洞</p>
        </div>
        <div className="cyber-card p-4 border-l-4 border-l-orange-500">
          <p className="text-3xl font-bold text-orange-400 font-mono">{highCount}</p>
          <p className="text-xs text-muted-foreground font-mono mt-1 uppercase">高危漏洞</p>
        </div>
        <div className="cyber-card p-4 border-l-4 border-l-amber-500">
          <p className="text-3xl font-bold text-amber-400 font-mono">{openCount}</p>
          <p className="text-xs text-muted-foreground font-mono mt-1 uppercase">待处理</p>
          {resolvedCount > 0 && (
            <p className="text-xs text-emerald-400 font-mono mt-0.5">已解决 {resolvedCount}</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="cyber-card p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索标题或文件路径..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-9 font-mono text-sm bg-transparent"
            />
          </div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-36 font-mono text-sm">
              <Filter className="w-3 h-3 mr-1 shrink-0" />
              <SelectValue placeholder="严重程度" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部严重度</SelectItem>
              <SelectItem value="critical">🔴 严重</SelectItem>
              <SelectItem value="high">🟠 高危</SelectItem>
              <SelectItem value="medium">🟡 中危</SelectItem>
              <SelectItem value="low">🔵 低危</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 font-mono text-sm">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="open">待处理</SelectItem>
              <SelectItem value="resolved">已解决</SelectItem>
              <SelectItem value="false_positive">误报</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36 font-mono text-sm">
              <SelectValue placeholder="类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="security">安全</SelectItem>
              <SelectItem value="performance">性能</SelectItem>
              <SelectItem value="style">风格</SelectItem>
              <SelectItem value="maintainability">可维护性</SelectItem>
            </SelectContent>
          </Select>
          {!loading && (
            <span className="text-xs text-muted-foreground font-mono ml-auto">
              {filtered.length} / {allIssues.length} 条
            </span>
          )}
        </div>
      </div>

      {/* Issue list */}
      {loading ? (
        <div className="cyber-card p-16 text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-muted-foreground font-mono text-sm">正在加载漏洞列表...</p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((issue: AuditIssue) => (
            <div
              key={issue.id}
              className={`cyber-card border-l-4 ${SEVERITY_LEFT_BORDER[issue.severity] ?? "border-l-border"} hover:bg-muted/30 transition-all cursor-pointer`}
              onClick={() => setExpandedId(expandedId === issue.id ? null : issue.id)}
            >
              {/* Issue row */}
              <div className="p-4 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Severity icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${SEVERITY_ICON_CLASS[issue.severity] ?? SEVERITY_ICON_CLASS.low}`}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>

                  {/* Title + meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-bold text-sm text-foreground uppercase">{issue.title}</h4>
                      <Badge className={`${SEVERITY_BADGE_CLASS[issue.severity] ?? "severity-low"} font-bold uppercase px-2 py-0 text-xs`}>
                        {SEVERITY_LABELS[issue.severity] ?? issue.severity}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-mono">
                      <span className="bg-muted px-2 py-0.5 rounded border border-border truncate max-w-xs">
                        {issue.file_path}{issue.line_number != null ? `:${issue.line_number}` : ""}
                      </span>
                      {issue.issue_type && (
                        <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded border border-border">
                          {TYPE_ICONS[issue.issue_type]}
                          {TYPE_LABELS[issue.issue_type] ?? issue.issue_type}
                        </span>
                      )}
                      <span className="text-muted-foreground/60">{formatDate(issue.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                  <Link to={`/tasks/${issue.task_id}`}>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs font-mono text-muted-foreground hover:text-foreground">
                      <FileText className="w-3 h-3 mr-1" />
                      任务
                    </Button>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className={`h-7 text-xs font-mono border ${getStatusBadgeClass(issue.status)}`}>
                        {STATUS_LABELS[issue.status] ?? issue.status}
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleStatusChange(issue, "resolved")}>✓ 已解决</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(issue, "false_positive")}>✗ 误报</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(issue, "open")}>↺ 恢复待处理</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expandedId === issue.id ? "rotate-90" : ""}`} />
                </div>
              </div>

              {/* Expanded detail */}
              {expandedId === issue.id && (
                <div className="px-4 pb-4 border-t border-border pt-4 space-y-4 text-sm font-mono">
                  {issue.description && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1 h-3 bg-primary rounded-full inline-block"></span>
                        描述
                      </p>
                      <p className="text-foreground leading-relaxed">{issue.description}</p>
                    </div>
                  )}
                  {issue.suggestion && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1 h-3 bg-emerald-500 rounded-full inline-block"></span>
                        修复建议
                      </p>
                      <p className="text-emerald-400/90 leading-relaxed">{issue.suggestion}</p>
                    </div>
                  )}
                  {issue.code_snippet && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1 h-3 bg-sky-500 rounded-full inline-block"></span>
                        代码片段
                      </p>
                      <pre className="bg-black/40 p-3 rounded border border-border text-xs overflow-x-auto text-sky-300/80 leading-relaxed">{issue.code_snippet}</pre>
                    </div>
                  )}
                  {issue.ai_explanation && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1 h-3 bg-violet-500 rounded-full inline-block"></span>
                        AI 解释
                      </p>
                      <p className="text-violet-300/90 leading-relaxed">{issue.ai_explanation}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="cyber-card p-16 text-center">
          <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-2 uppercase tracking-wider">未发现漏洞</h3>
          <p className="text-sm text-muted-foreground font-mono">
            {allIssues.length === 0 ? "尚未完成任何审计任务，或暂无漏洞记录。" : "当前筛选条件下无匹配漏洞。"}
          </p>
        </div>
      )}
    </div>
  );
}
