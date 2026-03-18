with open('src/pages/Discussions.jsx', 'r', encoding='utf-8') as f:
    text = f.read()
text = text.replace("\\'120px\\'", "'120px'")
with open('src/pages/Discussions.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
