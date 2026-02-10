import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/contracts", label: "Contracts" },
  { to: "/point-charts", label: "Point Charts" },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/40 p-6 flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight">DVC Dashboard</h1>
          <p className="text-sm text-muted-foreground">Point Tracker</p>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
