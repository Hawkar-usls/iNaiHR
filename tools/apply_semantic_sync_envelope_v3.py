from pathlib import Path

PATH=Path('janus.html')
s=PATH.read_text(encoding='utf-8')
old="const parsed=parseBundle(data.text||data.response||data.message||data.result?.text||data.result);"
new="const parsed=parseBundle(data?.candidates?.[0]?.content?.parts?.[0]?.text||data.text||data.response||data.message||data.result?.text||data.result);"
if new not in s:
    if old not in s:
        raise SystemExit('semantic sync parser anchor changed; refusing unsafe migration')
    s=s.replace(old,new,1)
PATH.write_text(s,encoding='utf-8')
