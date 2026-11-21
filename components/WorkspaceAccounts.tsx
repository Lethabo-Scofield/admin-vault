"use client";

import { useState } from "react";
import { Copy, KeyRound, UserPlus } from "lucide-react";
import type { WorkspaceAccount } from "@/lib/workspace-accounts";
import { saveWorkspaceAccount } from "@/lib/workspace-accounts";

function generatedPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const values = new Uint32Array(18);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => chars[value % chars.length]).join("");
}

function PasswordField({ account }: { account?: WorkspaceAccount }) {
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }
  return <div className="sm:col-span-2"><label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-400">{account?.hasPassword ? "New password (optional)" : "Login password"}</label><div className="flex gap-2"><input name="password" value={password} onChange={(event) => setPassword(event.target.value)} type="text" autoComplete="new-password" placeholder={account?.hasPassword ? "Leave blank to keep current" : "Generate a secure password"} className="vault-input flex-1 font-mono text-[13px]" required={!account?.hasPassword} /><button type="button" onClick={() => setPassword(generatedPassword())} className="tap inline-flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 text-[12px] font-medium text-gray-700 hover:bg-gray-200"><KeyRound size={14} /> Generate</button>{password && <button type="button" onClick={copy} className="tap inline-flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 text-[12px] font-medium text-gray-700 hover:bg-gray-200"><Copy size={14} /> {copied ? "Copied" : "Copy"}</button>}</div></div>;
}

function PermissionFields({ account }: { account?: WorkspaceAccount }) {
  return <div className="flex flex-wrap gap-4 text-[13px] text-gray-700"><label className="flex items-center gap-2"><input type="checkbox" name="manageInterns" defaultChecked={account?.manageInterns} /> Interns &amp; People</label><label className="flex items-center gap-2"><input type="checkbox" name="manageProjects" defaultChecked={account?.manageProjects} /> Projects &amp; Keys</label><label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={account?.active ?? true} /> Active</label></div>;
}

function AccountForm({ account }: { account?: WorkspaceAccount }) {
  return <form action={saveWorkspaceAccount} className="rounded-2xl bg-gray-50 p-4"><input type="hidden" name="id" value={account?.id ?? ""} /><div className="grid gap-3 sm:grid-cols-2"><input type="text" name="displayName" defaultValue={account?.displayName} placeholder="Manager or team lead name" className="vault-input" /><input type="email" name="email" required defaultValue={account?.email} placeholder="manager@olyxee.com" className="vault-input" /><PasswordField account={account} /></div><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><PermissionFields account={account} /><button type="submit" className="tap rounded-full bg-gray-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-gray-800">{account ? "Save access" : "Create access"}</button></div></form>;
}

export default function WorkspaceAccounts({ accounts }: { accounts: WorkspaceAccount[] }) {
  return <section className="rounded-ios bg-white p-5 shadow-ios sm:p-6"><div className="mb-1 flex items-center gap-2.5"><UserPlus size={18} className="text-gray-400" /><h2 className="text-[17px] font-semibold text-gray-900">Manager access</h2></div><p className="mb-5 text-[13px] text-gray-500">Create individual login access for managers and team leads. Choose exactly what each person can see and send them their email plus generated password.</p><AccountForm /><div className="mt-4 space-y-3">{accounts.map((account) => <div key={account.id}><AccountForm account={account} /><p className="px-1 pt-1 text-[11px] text-gray-400">{account.hasPassword ? "Individual password configured" : "Uses legacy shared password until a new one is generated"}</p></div>)}{accounts.length === 0 && <p className="py-3 text-center text-[13px] text-gray-400">No manager access accounts yet.</p>}</div></section>;
}
