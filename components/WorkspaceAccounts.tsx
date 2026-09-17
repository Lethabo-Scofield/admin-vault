import { UserPlus } from "lucide-react";
import type { WorkspaceAccount } from "@/lib/workspace-accounts";
import { saveWorkspaceAccount } from "@/lib/workspace-accounts";

function PermissionFields({
  account,
}: {
  account?: WorkspaceAccount;
}) {
  return (
    <div className="flex flex-wrap gap-4 text-[13px] text-gray-700">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="manageInterns"
          defaultChecked={account?.manageInterns}
        />
        Manage Interns
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="manageProjects"
          defaultChecked={account?.manageProjects}
        />
        Manage Projects &amp; Keys
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="active"
          defaultChecked={account?.active ?? true}
        />
        Active
      </label>
    </div>
  );
}

export default function WorkspaceAccounts({
  accounts,
}: {
  accounts: WorkspaceAccount[];
}) {
  return (
    <section className="rounded-ios bg-white p-5 shadow-ios sm:p-6">
      <div className="mb-1 flex items-center gap-2.5">
        <UserPlus size={18} className="text-gray-400" />
        <h2 className="text-[17px] font-semibold text-gray-900">
          Workspace Accounts
        </h2>
      </div>
      <p className="mb-5 text-[13px] text-gray-500">
        Invite supervisors by email. They sign in with their own email and the
        shared workspace password.
      </p>

      <form action={saveWorkspaceAccount} className="rounded-2xl bg-gray-50 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            name="displayName"
            placeholder="Supervisor name"
            className="vault-input"
          />
          <input
            type="email"
            name="email"
            required
            placeholder="supervisor@olyxee.com"
            className="vault-input"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <PermissionFields />
          <button
            type="submit"
            className="tap rounded-full bg-gray-900 px-4 py-2 text-[13px] font-medium text-white hover:bg-gray-800"
          >
            Add Account
          </button>
        </div>
      </form>

      <div className="mt-4 space-y-3">
        {accounts.map((account) => (
          <form
            key={account.id}
            action={saveWorkspaceAccount}
            className="rounded-2xl border border-gray-100 p-4"
          >
            <input type="hidden" name="id" value={account.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                name="displayName"
                defaultValue={account.displayName}
                aria-label="Supervisor name"
                className="vault-input"
              />
              <input
                type="email"
                name="email"
                required
                defaultValue={account.email}
                aria-label="Account email"
                className="vault-input"
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <PermissionFields account={account} />
              <button
                type="submit"
                className="tap rounded-full bg-gray-100 px-4 py-2 text-[13px] font-semibold text-gray-800 hover:bg-gray-200"
              >
                Save
              </button>
            </div>
          </form>
        ))}
        {accounts.length === 0 && (
          <p className="py-3 text-center text-[13px] text-gray-400">
            No workspace accounts have been added.
          </p>
        )}
      </div>
    </section>
  );
}