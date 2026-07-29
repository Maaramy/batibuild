with open("src/pages/AdminPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Fix both updatePlanPricing calls - move "as any" to the object level
content = content.replace(
    'plan: "pro" as any,\n                          price: limitForm.proPrice,\n                          projectLimit: limitForm.proProjects,\n                          downloadLimit: limitForm.proDownloads,\n                        })',
    'plan: "pro",\n                          price: limitForm.proPrice,\n                          projectLimit: limitForm.proProjects,\n                          downloadLimit: limitForm.proDownloads,\n                        } as any)'
)
content = content.replace(
    'plan: "expert" as any,\n                          price: limitForm.expertPrice,\n                          projectLimit: limitForm.expertProjects,\n                          downloadLimit: limitForm.expertDownloads,\n                        })',
    'plan: "expert",\n                          price: limitForm.expertPrice,\n                          projectLimit: limitForm.expertProjects,\n                          downloadLimit: limitForm.expertDownloads,\n                        } as any)'
)

with open("src/pages/AdminPanel.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed")
