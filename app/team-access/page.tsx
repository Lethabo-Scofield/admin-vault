import { ShieldCheck, KeyRound, GraduationCap } from "lucide-react";
import { requireSuperAdmin } from "@/lib/session";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const ROLES = [
  {
    name: "Founder Engineer",
    icon: KeyRound,
    envVar: "ENGINEER_PASSWORD_HASH",
    access: [
      "Dashboard, Projects, Project Keys, Compliance",
      "Audit trail (operational entries)",
      "No access to interns or internship credentials (403)",
    ],
  },
  {
    name: "Super Admin",
    icon: ShieldCheck,
    envVar: "SUPERADMIN_PASSWORD_HASH",
    access: [
      "Everything a Founder Engineer can access",
      "Intern management and internship credentials",
      "Publish / revoke credentials, QR codes, complete audit log",
    ],
  },
];

export default async function TeamAccessPage() {
  await requireSuperAdmin();
  return (
    <div className="animate-ios-in">
      <PageHeader
        title="Team Access"
        subtitle="Role-based access is enforced on the server for every route and action."
      />
      <div className="grid gap-5 sm:grid-cols-2">
        {ROLES.map(({ name, icon: Icon, envVar, access }) => (
          <div key={name} className="rounded-ios bg-white p-6 shadow-ios">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600">
                <Icon size={20} />
              </div>
              <div>
                <p className="text-[16px] font-semibold text-gray-900">{name}</p>
                <p className="font-mono text-[12px] text-gray-400">{envVar}</p>
              </div>
            </div>
            <ul className="space-y-2 text-[14px] text-gray-600">
              {access.map((a) => (
                <li key={a} className="flex gap-2">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-ios bg-white p-6 shadow-ios">
        <div className="mb-2 flex items-center gap-2 text-gray-900">
          <GraduationCap size={18} />
          <h3 className="text-[16px] font-semibold">Changing passwords</h3>
        </div>
        <p className="text-[14px] leading-relaxed text-gray-600">
          Passwords are never stored in the database. Each role signs in with a
          shared password verified against a bcrypt hash kept in the{" "}
          <span className="font-mono text-[13px]">ENGINEER_PASSWORD_HASH</span>{" "}
          and{" "}
          <span className="font-mono text-[13px]">SUPERADMIN_PASSWORD_HASH</span>{" "}
          environment variables (plain{" "}
          <span className="font-mono text-[13px]">ENGINEER_PASSWORD</span> /{" "}
          <span className="font-mono text-[13px]">SUPERADMIN_PASSWORD</span>{" "}
          secrets are also supported). Update the environment variable and
          redeploy to rotate a password; active sessions expire after 7 days or
          on logout.
        </p>
      </div>
    </div>
  );
}
