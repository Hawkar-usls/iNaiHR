import {storageKey,readDesk,saveDesk,normalizeDesk,createDeskNode,renameDeskNode,
  toggleDeskLink,deleteDeskNode,moveDeskNode,deskGraph,ascendDesk} from "./janus-volume-workspace.mjs";
/*
 * JANUS 3D local desk controller.
 * Reuses the SAME origin-scoped localStorage key as the classic mindmap.
 * Public registry atlas/SYNTH source nodes are NEVER writable from this controller.
 */
const $=id=>document.getElementById(id);
export function createDeskController(role,{renderer,onGraph,onActivate,onDeactivate,onStatus,onHideDetails,onShowDetails}){
  let active=false,desk=null,selectedId=null,focusId=null,linkFrom=null,moving=false,grid=false,drag=null;
  const storage=window.localStorage,primary=storageKey(role);
  const buttons=["desk-rename","desk-delete","desk-link","desk-dive","desk-add","desk-ascend"];
  const setStatus=message=>onStatus(message);
  function updateButtons(){
    $("desk-toolbar").hidden=!active;
    $("desk-toggle").textContent=active?"◈ ПОКАЗАТЬ АТЛАС ДАННЫХ · ТОЛЬКО ЧТЕНИЕ":"✎ 3D-МИНДМАП · УПРАВЛЕНИЕ";
    $("desk-link").classList.toggle("active",linkFrom!==null);
    $("desk-move").classList.toggle("active",moving);
    $("desk-grid").classList.toggle("active",grid);
    const n=desk?.nodes.find(x=>String(x.id)===String(selectedId));
    for(const id of ["desk-rename","desk-delete","desk-link","desk-dive"])$(id).disabled=!n;
    $("desk-original").setAttribute("href","./");
    $("desk-ascend").disabled=focusId===null;
    $("desk-breadcrumb").textContent=focusId===null?
      "ORIGIN · "+(desk?.nodes.length||0)+" локальных узлов / "+(desk?.links.length||0)+" связей":
      "DIVE → "+(desk?.nodes.find(x=>String(x.id)===focusId)?.label||focusId)+" · ASCEND для возврата";
    $("desk-link").textContent=linkFrom===null?"↔ Связать":"Выбери второй узел";
  }
  function render(){
    if(!active)return;
    const graph=deskGraph(desk,role,focusId);
    onGraph(graph);updateButtons();
  }
  function persist(message){
    desk=saveDesk(storage,desk,role);
    render();setStatus(message+" · сохранено в "+primary+" · JANUS Registry не изменён");
  }
  function activate(){
    const found=readDesk(storage,role,window.innerWidth,window.innerHeight);
    desk=found.desk;selectedId=null;focusId=null;linkFrom=null;moving=false;drag=null;
    active=true;
    onActivate();
    render();
    setStatus((found.found?"Загружена существующая карта mindmap":"Создана новая локальная карта")+
      " · "+primary+" · исходный JSON реестр не меняется");
  }
  function deactivate(){
    active=false;drag=null;linkFrom=null;selectedId=null;focusId=null;
    updateButtons();onHideDetails();onDeactivate();
  }
  function select(id){
    if(!active)return;
    if(id===null){selectedId=null;linkFrom=null;$("desk-name").value="";updateButtons();return;}
    const n=desk.nodes.find(x=>String(x.id)===String(id));
    if(!n)return;
    if(linkFrom!==null&&String(linkFrom)!==String(n.id)){
      const old=desk.links.length;
      desk=toggleDeskLink(desk,linkFrom,n.id,role);
      persist(desk.links.length>old?"Локальная связь создана":"Локальная связь удалена");
      linkFrom=null;
    }
    selectedId=n.id;$("desk-name").value=n.label;
    updateButtons();render();
  }
  function create(){
    if(!active)return;
    const raw=$("desk-name").value.trim();
    const next=createDeskNode(desk,role,selectedId);
    desk=next.desk;selectedId=next.selectedId;
    if(raw)desk=renameDeskNode(desk,selectedId,raw,role);
    const n=desk.nodes.find(x=>String(x.id)===String(selectedId));
    $("desk-name").value=n.label;
    persist("Локальный узел создан");
    onHideDetails();
  }
  function rename(){
    if(!active||selectedId===null)return;
    try{desk=renameDeskNode(desk,selectedId,$("desk-name").value,role);persist("Локальный узел переименован");}
    catch(e){setStatus(e.message);}
  }
  function remove(){
    if(!active||selectedId===null)return;
    const n=desk.nodes.find(x=>String(x.id)===String(selectedId));
    if(!n)return;
    const willDeleteChildren=role==="registry"&&desk.nodes.some(x=>String(x.parentId)===String(n.id));
    if(!window.confirm("Удалить ЛОКАЛЬНЫЙ узел «"+n.label+"»"+
      (willDeleteChildren?" вместе с потомками":"")+"?\n\nЭто НЕ удаляет данные JANUS Registry."))return;
    try{desk=deleteDeskNode(desk,n.id,role);selectedId=null;linkFrom=null;focusId=null;
      $("desk-name").value="";onHideDetails();persist("Локальный узел удалён");}
    catch(e){setStatus(e.message);}
  }
  function link(){
    if(!active||selectedId===null)return;
    linkFrom=linkFrom===null?selectedId:null;
    updateButtons();setStatus(linkFrom===null?"Режим связи отменён":"Выбери второй узел в 3D: связь создастся или снимется");
  }
  function dive(){
    if(!active||selectedId===null)return;
    focusId=String(selectedId);renderer.reset(520);
    onHideDetails();render();setStatus("Погружение в локальные связи выбранного узла");
  }
  function ascend(){
    if(!active||focusId===null)return;
    focusId=ascendDesk(desk,focusId,role);
    renderer.reset(640);onHideDetails();render();
    setStatus(focusId===null?"Возврат в корень рабочего графа":"Возврат к родительскому локальному узлу");
  }
  function exportJSON(){
    if(!active)return;
    const clean=normalizeDesk(desk,role);
    const bytes=JSON.stringify(clean,null,2),blob=new Blob([bytes],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=role==="semantic"?"inaihr_data_3d.json":"hrain_data_3d.json";
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    setStatus("Рабочая карта экспортирована как JSON; источники JANUS не менялись");
  }
  async function importJSON(file){
    if(!file||!active)return;
    if(file.size>3*1024*1024)throw Error("Файл больше 3 МБ; импорт отменён");
    const parsed=normalizeDesk(JSON.parse(await file.text()),role);
    if(!window.confirm("Импортировать "+parsed.nodes.length+" узлов и "+parsed.links.length+
      " связей в ЛОКАЛЬНЫЙ mindmap? Текущее состояние будет сохранено в резервной копии."))return;
    desk=parsed;selectedId=null;focusId=null;linkFrom=null;$("desk-name").value="";
    onHideDetails();persist("Импортирован JSON рабочего mindmap");
  }
  function startMove(e){
    if(!active||!moving||e.button!==0)return false;
    const rect=renderer.canvas.getBoundingClientRect();
    const n=renderer.nearest(e.clientX-rect.left,e.clientY-rect.top);
    if(!n||n.type!=="workspace")return false;
    selectedId=n.meta.id;$("desk-name").value=n.label;linkFrom=null;
    drag={id:n.meta.id,pointerId:e.pointerId,lastX:e.clientX,lastY:e.clientY,moved:false};
    renderer.canvas.setPointerCapture(e.pointerId);
    updateButtons();return true;
  }
  function movingPointer(e){
    if(!drag||e.pointerId!==drag.pointerId)return false;
    const dx=e.clientX-drag.lastX,dy=e.clientY-drag.lastY;
    drag.lastX=e.clientX;drag.lastY=e.clientY;
    if(Math.abs(dx)+Math.abs(dy)>.02){
      const factor=Math.min(4,Math.max(.25,renderer.camera.distance/800));
      const yaw=renderer.camera.yaw;
      // Project camera-relative movement to the old D3 editor's stable x/y coordinates.
      const ux=(Math.cos(yaw)*dx+Math.sin(yaw)*dy*.4)*factor;
      const uy=(Math.cos(yaw)*dy-Math.sin(yaw)*dx*.3)*factor;
      desk=moveDeskNode(desk,drag.id,ux,uy,role,false);drag.moved=true;render();
    }
    return true;
  }
  function endMove(e){
    if(!drag||e.pointerId!==drag.pointerId)return false;
    const moved=drag.moved;drag=null;
    if(moved){
      if(grid)desk=moveDeskNode(desk,selectedId,0,0,role,true);
      persist("Положение локального узла обновлено");
    }else{
      select(selectedId);
      const n=renderer.scene.nodes.find(x=>x.id==="desk:"+selectedId);
      if(n)onShowDetails(n);
    }
    return true;
  }

  function reloadFromClassic(){
    if(!active)return;
    const latest=readDesk(storage,role,window.innerWidth,window.innerHeight);
    desk=latest.desk;selectedId=null;linkFrom=null;focusId=null;
    $("desk-name").value="";onHideDetails();render();
    setStatus("Синхронизировано с оригинальным D3 mindmap · "+desk.nodes.length+
      " узлов / "+desk.links.length+" связей · тот же "+primary);
  }
  function openClassic(event){
    event.preventDefault();
    if(!active)return;
    $("mindmap-overlay").hidden=false;
    $("mindmap-frame").setAttribute("src","./");
  }
  function closeClassic(){
    $("mindmap-overlay").hidden=true;
    $("mindmap-frame").setAttribute("src","about:blank");
    reloadFromClassic();
  }
  $("desk-original").addEventListener("click",openClassic);
  $("mindmap-close").addEventListener("click",closeClassic);
  window.addEventListener("storage",e=>{
    if(e.key===primary&&active&&$("mindmap-overlay").hidden)reloadFromClassic();
  });

  const canvas=renderer.canvas;
  canvas.addEventListener("pointerdown",e=>{if(startMove(e)){e.preventDefault();e.stopImmediatePropagation();}},true);
  canvas.addEventListener("pointermove",e=>{if(movingPointer(e)){e.preventDefault();e.stopImmediatePropagation();}},true);
  for(const type of ["pointerup","pointercancel"])
    canvas.addEventListener(type,e=>{if(endMove(e)){e.preventDefault();e.stopImmediatePropagation();}},true);
  $("desk-toggle").addEventListener("click",()=>active?deactivate():activate());
  $("desk-add").addEventListener("click",create);
  $("desk-rename").addEventListener("click",rename);
  $("desk-link").addEventListener("click",link);
  $("desk-delete").addEventListener("click",remove);
  $("desk-dive").addEventListener("click",dive);
  $("desk-ascend").addEventListener("click",ascend);
  $("desk-save").addEventListener("click",()=>active&&persist("Локальная карта сохранена"));
  $("desk-export").addEventListener("click",exportJSON);
  $("desk-import-button").addEventListener("click",()=>$("desk-import").click());
  $("desk-import").addEventListener("change",e=>{
    importJSON(e.target.files?.[0]).catch(error=>setStatus("Импорт отклонён: "+error.message));
    e.target.value="";
  });
  $("desk-move").addEventListener("click",()=>{
    moving=!moving;updateButtons();
    setStatus(moving?"Режим перемещения: перетаскивай локальный узел":"Режим перемещения выключен: мышка вращает камеру");
  });
  $("desk-grid").addEventListener("click",()=>{grid=!grid;updateButtons();setStatus(grid?"GRID 60px: перемещённые узлы фиксируются на сетке":"GRID выключен");});
  $("desk-name").addEventListener("keydown",e=>{if(e.key==="Enter")rename();});
  updateButtons();
  return {activate,deactivate,select,render,get active(){return active;},get selectedId(){return selectedId;},
    get workspace(){return desk;},get focusId(){return focusId;},add:create,remove,exportJSON};
}
