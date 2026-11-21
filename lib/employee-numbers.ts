const EMPLOYEE_NUMBERS: Record<string, string> = {
  "alisha.fatima@olyxee.com": "#001",
  "mosamaseko17@gmail.com": "#002",
  "emmanuel.stakio@olyxee.com": "#003",
  "thokozani.dlomo@olyxee.com": "#004",
  "zaid.muhammad.dev@gmail.com": "#005",
  "munibashami07@gmail.com": "#006",
};

export function getEmployeeNumber(email?: string | null, name?: string | null): string | null {
  if (email) {
    const match = EMPLOYEE_NUMBERS[email.trim().toLowerCase()];
    if (match) return match;
  }
  const normalizedName = name?.trim().toLowerCase();
  if (!normalizedName) return null;
  const byName: Record<string, string> = {
    "alisha fatima": "#001",
    "mosa maseko": "#002",
    "emmanuel stakio": "#003",
    "thokozani dlomo": "#004",
    "muhammad zaid": "#005",
    "muniba shami": "#006",
  };
  return byName[normalizedName] ?? null;
}
