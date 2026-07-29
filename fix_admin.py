#!/usr/bin/env python3
"""Fix AdminPanel.tsx — remove all corrupted motion wrappers and framer-motion props."""
import re

with open("src/pages/AdminPanel.tsx", "r") as f:
    content = f.read()

# Replace <motion.div / <motion.main etc. with plain tags
content = re.sub(r"<\s*motion\.(\w+)", r"<\1", content)
content = re.sub(r"</\s*motion\.(\w+)", r"</\1", content)

# Remove framer-motion-specific props (they are only valid on motion.* elements)
content = re.sub(r"\s+initial=\{.*?\}", "", content)
content = re.sub(r"\s+animate=\{.*?\}", "", content)
content = re.sub(r"\s+whileHover=\{.*?\}", "", content)
content = re.sub(r"\s+whileTap=\{.*?\}", "", content)
content = re.sub(r"\s+whileInView=\{.*?\}", "", content)
content = re.sub(r"\s+viewport=\{.*?\}", "", content)
content = re.sub(r"\s+variants=\{.*?\}", "", content)

with open("src/pages/AdminPanel.tsx", "w") as f:
    f.write(content)

print("AdminPanel fixed – motion wrappers and props removed.")
print("Now run 'bun tsc -b --noEmit' to check for remaining issues.")
