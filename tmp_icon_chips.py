path = "src/pages/ProjectDetail.tsx"
with open(path, "r", encoding="utf-8") as f:
    data = f.read()

orig = data

def wrap_header(icon: str, title: str) -> None:
    global data
    old = f"""                            <div className="flex items-center gap-1.5 mb-2">
                              <{icon} className="h-3.5 w-3.5 text-violet-500" />
                              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
                            </div>"""
    new = f"""                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-100 text-violet-600 shrink-0">
                                <{icon} className="h-3.5 w-3.5" />
                              </div>
                              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
                            </div>"""
    assert data.count(old) == 1, f"anchor not unique/found for {icon}: {data.count(old)}"
    data = data.replace(old, new)

wrap_header("TrendingUp", "Prévision des prix des matériaux")
wrap_header("CalendarRange", "Meilleures périodes d'achat")
wrap_header("Wallet", "Optimisation du budget")
wrap_header("Lightbulb", "Réduction des pertes")

assert data != orig, "no changes applied!"

with open(path, "w", encoding="utf-8") as f:
    f.write(data)

print("OK: 4 icon chips added")
