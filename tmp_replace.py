import re
import os

filepath = r"c:\Users\user\Desktop\Anti gravity\Skillhub\src\pages\Discussions.jsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

replacements = {
    r"\[#131313\]": "zinc-950",
    r"\[#18181B\]": "zinc-900",
    r"\[#1C1C1F\]": "zinc-950",
    r"\[#202024\]": "zinc-800",
    r"\[#27272A\]": "zinc-800",
    r"\[#3F3F46\]": "zinc-700",
    r"\[#52525B\]": "zinc-600",
    r"\[#71717A\]": "zinc-500",
    r"\[#A1A1AA\]": "zinc-400",
    r"\[#D4D4D8\]": "zinc-300",
    r"\[#E4E4E7\]": "zinc-200",
    r"\[#F4F4F5\]": "zinc-100",
    r"\[#6366F1\]": "indigo-500",
    r"\[#4F46E5\]": "indigo-600",
    r"\[#3B82F6\]": "blue-500",
    r"\[#2563EB\]": "blue-600",
    r"\[#34D399\]": "emerald-400",
    r"\[#10B981\]": "emerald-500",
    r"\[#059669\]": "emerald-600",
    r"\[#047857\]": "emerald-700",
    r"\[#064E3B\]": "emerald-900",
    r"\[#EF4444\]": "red-500",
    r"\[#DC2626\]": "red-600",
    r"\[#F59E0B\]": "amber-500",
    r"\[#D97706\]": "amber-600",
    r"\[#8B5CF6\]": "violet-500",
    r"\[#A855F7\]": "purple-500",
    r"\[#16A34A\]": "green-600",
    r"\[#22C55E\]": "green-500"
}

for pattern, repl in replacements.items():
    content = re.sub(pattern, repl, content)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(content)

print("Replaced all arbitrary tailwind colors with standard map.")
