// The CRT receives this small texture, never an enlarged mosaic of it.
export function downsamplePhoto(image,resolution){
  const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height;
  const scale=Math.min(1,resolution/Math.max(width,height));
  const targetWidth=Math.max(1,Math.round(width*scale)),targetHeight=Math.max(1,Math.round(height*scale));
  let source=image,currentWidth=width,currentHeight=height;
  do{
    const nextWidth=Math.max(targetWidth,Math.ceil(currentWidth/2));
    const nextHeight=Math.max(targetHeight,Math.ceil(currentHeight/2));
    const canvas=document.createElement('canvas');canvas.width=nextWidth;canvas.height=nextHeight;
    const context=canvas.getContext('2d');context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
    context.fillStyle='#000';context.fillRect(0,0,nextWidth,nextHeight);context.drawImage(source,0,0,nextWidth,nextHeight);
    source=canvas;currentWidth=nextWidth;currentHeight=nextHeight;
  }while(currentWidth>targetWidth||currentHeight>targetHeight);
  return source;
}
