/* JANUS Volume Renderer v2: real perspective WebGL2; Canvas2D only if WebGL unavailable. */
const POINT_VS=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aColor;
layout(location=2) in float aSize;
layout(location=3) in float aAlpha;
uniform vec3 uFocus;
uniform float uYaw,uPitch,uDist,uAspect,uPixelRatio,uHalo;
out vec3 vColor;out float vAlpha;
void main(){
 vec3 p=aPos-uFocus;
 float cy=cos(uYaw),sy=sin(uYaw),cp=cos(uPitch),sp=sin(uPitch);
 float x=p.x*cy-p.z*sy,z=p.x*sy+p.z*cy;
 float y=p.y*cp-z*sp,zz=p.y*sp+z*cp;
 float depth=uDist-zz;
 if(depth<=8.0){gl_Position=vec4(2.,2.,2.,1.);gl_PointSize=0.;return;}
 gl_Position=vec4(x*1.8/uAspect,y*1.8,depth-8.,depth);
 gl_PointSize=clamp(aSize*(uHalo>1.5?14.0:(uHalo>.5?5.2:1.0))*520./depth*uPixelRatio,1.,128.);
 vColor=aColor;vAlpha=aAlpha;
}`;
const POINT_FS=`#version 300 es
precision highp float;
in vec3 vColor;in float vAlpha;
uniform float uHalo;
out vec4 o;
void main(){
 vec2 d=gl_PointCoord-vec2(.5);
 if(length(d)>.5)discard;
 float gaussian=exp(-20.*dot(d,d)),core=exp(-160.*dot(d,d));
 float alpha=uHalo>1.5?exp(-13.*dot(d,d))*.042*vAlpha:(uHalo>.5?gaussian*.085*vAlpha:(gaussian*.25+core*.72)*vAlpha);
 o=vec4(vColor,alpha);
}`;
const LINE_VS=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aColor;layout(location=2) in float aAlpha;
uniform vec3 uFocus;uniform float uYaw,uPitch,uDist,uAspect;
out vec3 vColor;out float vAlpha;
void main(){
 vec3 p=aPos-uFocus;
 float cy=cos(uYaw),sy=sin(uYaw),cp=cos(uPitch),sp=sin(uPitch);
 float x=p.x*cy-p.z*sy,z=p.x*sy+p.z*cy;
 float y=p.y*cp-z*sp,zz=p.y*sp+z*cp;
 float depth=uDist-zz;
 if(depth<=8.0){gl_Position=vec4(2.,2.,2.,1.);return;}
 gl_Position=vec4(x*1.8/uAspect,y*1.8,depth-8.,depth);
 vColor=aColor;vAlpha=aAlpha;
}`;
const LINE_FS=`#version 300 es
precision highp float;
in vec3 vColor;in float vAlpha;out vec4 o;
void main(){o=vec4(vColor,vAlpha);}
`;
export function projectPoint(p,cam,width,height) {
  const x=p[0]-cam.focus[0],y=p[1]-cam.focus[1],z=p[2]-cam.focus[2];
  const cy=Math.cos(cam.yaw),sy=Math.sin(cam.yaw),cp=Math.cos(cam.pitch),sp=Math.sin(cam.pitch);
  const xr=x*cy-z*sy, zr=x*sy+z*cy, yr=y*cp-zr*sp, zz=y*sp+zr*cp;
  const depth=cam.distance-zz;
  if(depth<=8)return null;
  const h=Math.max(1,height);
  return {x:width/2 + xr*1.8*h/(2*depth),y:height/2 - yr*1.8*h/(2*depth),depth,scale:520/depth};
}
function compile(gl,type,src){
  const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);
  if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){const err=gl.getShaderInfoLog(sh);gl.deleteShader(sh);throw Error("Shader: "+err);}
  return sh;
}
function makeProgram(gl,vs,fs){
  const p=gl.createProgram(),v=compile(gl,gl.VERTEX_SHADER,vs),f=compile(gl,gl.FRAGMENT_SHADER,fs);
  gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error("Program: "+gl.getProgramInfoLog(p));
  return p;
}
export class VolumeRenderer{
 constructor(canvas){
  this.canvas=canvas;this.camera={yaw:.58,pitch:.43,distance:680,focus:[0,0,0]};
  this.scene={nodes:[],edges:[]};this.mode="density";this.quality="balanced";this.selectedId=null;
  this.pointCount=0;this.lineCount=0;this.gl=null;this.ctx=null;this.initError=null;
  try{this.gl=canvas.getContext("webgl2",{alpha:false,antialias:true,depth:false,preserveDrawingBuffer:false});}catch(_){}
  if(this.gl){try{this.initGL();this.type="WebGL2";}catch(e){this.initError=e.message;this.gl=null;this.type="Canvas2D fallback";}}
  if(!this.gl){this.ctx=canvas.getContext("2d");this.type="Canvas2D fallback";}
  if(!this.gl&&!this.ctx)throw Error("No WebGL2 or Canvas 2D context");
  this.resize();
 }
 initGL(){
  const gl=this.gl;
  this.pointProgram=makeProgram(gl,POINT_VS,POINT_FS);
  this.lineProgram=makeProgram(gl,LINE_VS,LINE_FS);
  this.pointVao=gl.createVertexArray();this.lineVao=gl.createVertexArray();
  this.pointBuffer=gl.createBuffer();this.lineBuffer=gl.createBuffer();
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
  gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
 }
 resize(){
  const dpr=Math.min(1.7,window.devicePixelRatio||1);
  this.width=Math.max(1,this.canvas.clientWidth);this.height=Math.max(1,this.canvas.clientHeight);
  this.canvas.width=Math.ceil(this.width*dpr);this.canvas.height=Math.ceil(this.height*dpr);this.dpr=dpr;
  if(this.gl)this.gl.viewport(0,0,this.canvas.width,this.canvas.height);
  if(this.ctx)this.ctx.setTransform(dpr,0,0,dpr,0,0);
  this.render();
 }
 setGraph(view,mode=this.mode){this.scene=view;this.mode=mode;if(this.gl)this.upload();this.render();}
 upload(){
  const gl=this.gl,points=[],lines=[],map=new Map(this.scene.nodes.map(n=>[n.id,n]));
  for(const n of this.scene.nodes){
   const selected=n.id===this.selectedId,col=selected?[1,1,1]:n.color;
   const density=this.mode==="density"?Math.min(1,.58+Math.log2(1+Math.max(0,n.weight||0))*.035):.88;
   points.push(...n.p,...col,n.size*(selected?1.8:1),density);
  }
  for(const e of this.scene.edges){
   const a=map.get(e.from),b=map.get(e.to);if(!a||!b)continue;
   const explicit=e.kind==="EXPLICIT_SOURCE_REFERENCE"||e.kind==="RECORDED_SOURCE_POINTER";
   const lineage=e.kind==="RECORDED_LINEAGE";
   const col=explicit?[1,.69,.34]:lineage?[.88,.64,1]:[.32,.59,.78];
   const alpha=explicit?.65:lineage?.49:(this.mode==="density"?.09:.23);
   lines.push(...a.p,...col,alpha,...b.p,...col,alpha);
  }
  this.pointCount=points.length/8;this.lineCount=lines.length/7;
  gl.bindVertexArray(this.pointVao);gl.bindBuffer(gl.ARRAY_BUFFER,this.pointBuffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(points),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,32,0);
  gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,32,12);
  gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,1,gl.FLOAT,false,32,24);
  gl.enableVertexAttribArray(3);gl.vertexAttribPointer(3,1,gl.FLOAT,false,32,28);
  gl.bindVertexArray(this.lineVao);gl.bindBuffer(gl.ARRAY_BUFFER,this.lineBuffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(lines),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,28,0);
  gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,28,12);
  gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,1,gl.FLOAT,false,28,24);
  gl.bindVertexArray(null);
 }
 uniforms(program){
  const gl=this.gl,c=this.camera;
  gl.uniform3fv(gl.getUniformLocation(program,"uFocus"),c.focus);
  gl.uniform1f(gl.getUniformLocation(program,"uYaw"),c.yaw);
  gl.uniform1f(gl.getUniformLocation(program,"uPitch"),c.pitch);
  gl.uniform1f(gl.getUniformLocation(program,"uDist"),c.distance);
  gl.uniform1f(gl.getUniformLocation(program,"uAspect"),this.width/this.height);
 }
 render(){
  if(this.gl){
   const gl=this.gl;gl.clearColor(.012,.02,.045,1);gl.clear(gl.COLOR_BUFFER_BIT);
   if(this.lineCount){gl.useProgram(this.lineProgram);this.uniforms(this.lineProgram);gl.bindVertexArray(this.lineVao);gl.drawArrays(gl.LINES,0,this.lineCount);}
   if(this.pointCount){
    gl.useProgram(this.pointProgram);this.uniforms(this.pointProgram);
    gl.uniform1f(gl.getUniformLocation(this.pointProgram,"uPixelRatio"),this.dpr);
    gl.bindVertexArray(this.pointVao);
    const halo=gl.getUniformLocation(this.pointProgram,"uHalo");
    if(this.quality!=="low"&&this.pointCount<=15000){
     if(this.mode==="density"){gl.uniform1f(halo,2);gl.drawArrays(gl.POINTS,0,this.pointCount);} // broad Gaussian kernel from real data nodes
     gl.uniform1f(halo,1);gl.drawArrays(gl.POINTS,0,this.pointCount);
    }
    gl.uniform1f(halo,0);gl.drawArrays(gl.POINTS,0,this.pointCount);
   }
   gl.bindVertexArray(null);return;
  }
  this.renderCanvas();
 }
 renderCanvas(){
  const ctx=this.ctx,w=this.width,h=this.height;ctx.fillStyle="#050b18";ctx.fillRect(0,0,w,h);
  const map=new Map(),visible=[];
  for(const n of this.scene.nodes){const p=projectPoint(n.p,this.camera,w,h);if(p){map.set(n.id,p);visible.push({n,p});}}
  if(this.scene.edges.length<14000){
   for(const e of this.scene.edges){const a=map.get(e.from),b=map.get(e.to);if(!a||!b)continue;
    ctx.strokeStyle=(e.kind==="EXPLICIT_SOURCE_REFERENCE"||e.kind==="RECORDED_SOURCE_POINTER")?"rgba(255,169,96,.28)":"rgba(74,147,198,.15)";
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
  }
  visible.sort((a,b)=>b.p.depth-a.p.depth);
  for(const {n,p} of visible){
   const r=Math.max(1.2,Math.min(32,n.size*p.scale*.5));
   const color=(n.id===this.selectedId?[1,1,1]:n.color).map(v=>Math.round(v*255));
   if(visible.length<3000&&this.quality!=="low"){
    const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*3);
    g.addColorStop(0,"rgba("+color.join(",")+",.7)");g.addColorStop(1,"rgba("+color.join(",")+",0)");
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,r*3,0,Math.PI*2);ctx.fill();
   }
   ctx.fillStyle="rgb("+color.join(",")+")";ctx.beginPath();ctx.arc(p.x,p.y,Math.max(1,r*.32),0,Math.PI*2);ctx.fill();
  }
 }
 nearest(x,y){
  let candidate=null,min=Infinity,hub=null,hubDistance=Infinity;
  for(const n of this.scene.nodes){
   const p=projectPoint(n.p,this.camera,this.width,this.height);if(!p)continue;
   const d=Math.hypot(x-p.x,y-p.y),tol=Math.max(9,Math.min(32,n.size*p.scale*.75));
   if(d<tol&&d<min){candidate=n;min=d;}
   if((n.type==="repository"||n.type==="pivot")&&d<tol&&d<hubDistance){hub=n;hubDistance=d;}
  }
  // The interactive cluster core remains selectable even inside a crowded real record cloud.
  return hub||candidate;
 }
 preset(which){
  const c=this.camera;
  if(which==="top"){c.yaw=0;c.pitch=1.45;}
  else if(which==="edge"){c.yaw=0;c.pitch=.02;}
  else{c.yaw=.58;c.pitch=.43;}
  this.render();
 }
 select(id){this.selectedId=id;if(this.gl)this.upload();this.render();}
 focusOn(p){this.camera.focus=[...p];this.render();}
 reset(dist=680){this.camera={yaw:.58,pitch:.43,distance:dist,focus:[0,0,0]};this.select(null);}
 project(n){return projectPoint(n.p,this.camera,this.width,this.height);}
}
