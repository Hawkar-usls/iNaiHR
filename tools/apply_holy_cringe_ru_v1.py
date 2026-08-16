from pathlib import Path

p=Path('janus.html')
s=p.read_text(encoding='utf-8')

old_ru="ru:{synth:'СИНТЕЗ',guide:'ПРОВОДНИК JANUS',ascend:'ВЫШЕ',origin:'НАЧАЛО',state:'СЕМАНТИЧЕСКИЙ РЕЕСТР',readonly:'ТОЛЬКО ЧТЕНИЕ',loading:'ПОДКЛЮЧЕНИЕ К РЕЕСТРУ JANUS…',select:'ВЫБЕРИТЕ JSON ИЛИ СМЫСЛОВОЙ УЗЕЛ',source:'ОТКРЫТЬ ИСТОЧНИК ↗',semantic:'СМЫСЛОВОЕ ПОНЯТИЕ',object:'JSON РЕЕСТРА',surface:'НАПРАВЛЕНИЕ ИССЛЕДОВАНИЯ',root:'НАЧАЛО РЕЕСТРА',guideToast:'JANUS открыл один возможный путь.',remote:'УДАЛЁННЫЙ СИНТЕЗ',local:'ЛОКАЛЬНЫЙ СЕМАНТИЧЕСКИЙ СИНТЕЗ',nojson:'ВЫБЕРИТЕ JSON-ОБЪЕКТ',depth:'ДОСТИГНУТА МАКСИМАЛЬНАЯ ГЛУБИНА',boundary:'Смысловые ветви — навигация, а не авторитет источника.'}"
new_ru="ru:{synth:'СИНТЕЗНУТЬ ЭТУ ШТУКУ',guide:'JANUS С ФОНАРИКОМ',ascend:'ВЫЛЕЗТИ ВЫШЕ',origin:'К ИСХОДНОЙ ТАБУРЕТКЕ',state:'СЕМАНТИЧЕСКИЙ САРАЙ',readonly:'ТОЛЬКО ЧТЕНИЕ · РУКИ ИЗ JSON УБРАТЬ',loading:'JANUS ПОДКЛЮЧАЕТ МОЗГ К УДЛИНИТЕЛЮ…',select:'ТКНИ В JSON ИЛИ В УЖЕ РАСПУХШУЮ МЫСЛЬ',source:'ОТКРЫТЬ СЕРЬЁЗНЫЙ ИСТОЧНИК ↗',semantic:'СМЫСЛОВОЙ КОМАР',object:'JSON, КОТОРЫЙ НИ В ЧЁМ НЕ ВИНОВАТ',surface:'НАУЧНЫЙ ПОДВАЛ',root:'ГЛАВНАЯ ТАБУРЕТКА',guideToast:'JANUS сам нажал SYNTH один раз и теперь снова делает вид, что ничего не было.',remote:'УДАЛЁННЫЙ СИНТЕЗ ИЗ ПРОВОДОВ',local:'ЛОКАЛЬНЫЙ СИНТЕЗ НА КОЛЕНКЕ',nojson:'СНАЧАЛА ВЫБЕРИ JSON, ВОЛШЕБНАЯ КНОПКА НЕ ТЕЛЕПАТ',depth:'ДАЛЬШЕ УЖЕ МАТРЁШКА СЪЕСТ САМА СЕБЯ',boundary:'△ ru · СВЯТОЙ КРИНЖ · ПАРОДИЙНЫЙ СЛОЙ. Смысловые ветви — навигация, не источник истины. Вымышленная Ванесса Шевченко из localStorage держит фольгу и provenance; реальных людей здесь не изображаем.'}"
if old_ru in s:
    s=s.replace(old_ru,new_ru)
elif new_ru not in s:
    raise SystemExit('ru I18N anchor missing')

s=s.replace("const LANG_NAMES={en:'English',ua:'Ukrainian',ru:'Russian'};","const LANG_NAMES={en:'English',ua:'Ukrainian',ru:'Russian — clearly satirical JANUS Holy Cringe parody register'};")

old_cat="ru:{purpose:'Цель и смысл',claims:'Утверждения и состояние',evidence:'Доказательства и тесты',boundaries:'Границы и предохранители',next:'Открытые рубежи и следующие шаги',lineage:'Источники и происхождение',mechanism:'Механизмы и реализация'}"
new_cat="ru:{purpose:'Зачем этот сарай вообще стоит',claims:'Что мы тут якобы утверждаем',evidence:'Чеки, тесты и прочие бумажки',boundaries:'Где табуретка заканчивается',next:'Куда ещё не надо бежать с фанфарами',lineage:'Откуда этот JSON выполз',mechanism:'Шестерёнки, провода и магия без магии'}"
if old_cat in s:
    s=s.replace(old_cat,new_cat)
elif new_cat not in s:
    raise SystemExit('CAT_LABEL ru anchor missing')

old_prompt="Return 4 to ${MAX_CONCEPTS} concise semantic concepts in ${LANG_NAMES[lang]}. Every concept MUST be grounded"
new_prompt="Return 4 to ${MAX_CONCEPTS} concise semantic concepts in ${LANG_NAMES[lang]}. ${lang==='ru'?'For ru only, use absurd deadpan Holy Cringe: self-deprecating pseudo-technical nonsense, fourth-wall breaks and obvious parody. Never imitate a real author, never invent biography, never change the underlying facts, and keep every joke subordinate to exact sourcePaths. ':''}Every concept MUST be grounded"
if old_prompt in s:
    s=s.replace(old_prompt,new_prompt)
elif new_prompt not in s:
    raise SystemExit('remote prompt anchor missing')

badge_fn="""
function ensureHolyCringeBadge(){let b=document.getElementById('holy-cringe-ru-badge');if(lang!=='ru'){if(b)b.remove();return}if(!b){b=document.createElement('div');b.id='holy-cringe-ru-badge';b.textContent='△ ru · СВЯТОЙ КРИНЖ · ПАРОДИЙНЫЙ СЛОЙ';b.title='Presentation only. Source JSON remains authoritative.';Object.assign(b.style,{position:'fixed',left:'12px',bottom:'12px',zIndex:'90',padding:'6px 9px',border:'1px solid rgba(210,220,230,.4)',borderRadius:'999px',background:'linear-gradient(135deg,rgba(180,190,200,.15),rgba(8,2,15,.92))',color:'#d4dbe0',font:'700 9px Orbitron',letterSpacing:'.06em',pointerEvents:'none'});document.body.appendChild(b)}}
""".strip()
anchor="function t(k){return I18N[lang][k]||I18N.en[k]||k}"
if badge_fn not in s:
    if anchor not in s: raise SystemExit('t anchor missing')
    s=s.replace(anchor,badge_fn+'\n'+anchor)

old_apply="document.getElementById('loading').textContent=t('loading');renderBreadcrumbs();if(selected)openPanel(selected)}"
new_apply="document.getElementById('loading').textContent=t('loading');renderBreadcrumbs();ensureHolyCringeBadge();if(selected)openPanel(selected)}"
if old_apply in s:
    s=s.replace(old_apply,new_apply)
elif new_apply not in s:
    raise SystemExit('applyLanguage anchor missing')

p.write_text(s,encoding='utf-8')
print('HOLY_CRINGE_RU_MIGRATION=APPLIED')
