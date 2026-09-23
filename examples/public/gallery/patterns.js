const palette=['#ff6052','#ffc64a','#c4fa94','#88dce3','#bbadff','#fff9de'];
function pattern(id,name,draw){
  const canvas=document.createElement('canvas');canvas.width=48;canvas.height=36;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#080910';ctx.fillRect(0,0,48,36);draw(ctx);
  return {id,name,url:canvas.toDataURL()};
}
export const testPatterns=[
  pattern('test-squares','Color squares + single pixels',ctx=>{
    palette.forEach((color,i)=>{ctx.fillStyle=color;ctx.fillRect(6+i*7,7,1,1);ctx.fillRect(4+i*7,16,5,5);});
  }),
  pattern('test-lines','One-pixel horizontal lines',ctx=>{
    palette.forEach((color,i)=>{ctx.fillStyle=color;ctx.fillRect(4+i*7,12,5,1);ctx.fillRect(4+i*7,23,5,1);});
  }),
  pattern('test-rgb','RGB edges + color blending',ctx=>{
    ['#ff3030','#30ff50','#3870ff'].forEach((color,i)=>{ctx.fillStyle=color;ctx.fillRect(6+i*12,5,12,9);});
    ['#ffed58','#ff65cf','#5cecff'].forEach((color,i)=>{ctx.fillStyle=color;ctx.fillRect(6+i*12,21,10,9);});
  }),
  pattern('test-dither','Dither patterns',ctx=>{
    const pairs=[['#f7ab9e','#492b78'],['#fff9de','#202029'],['#88dce3','#265a8a']];
    pairs.forEach(([a,b],i)=>{for(let y=5;y<31;y++)for(let x=0;x<12;x++){ctx.fillStyle=((y<17?x+y:x)%2)?a:b;ctx.fillRect(4+i*14+x,y,1,1);}});
  })
];
