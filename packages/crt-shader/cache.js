// Resource ownership stays with the caller when an item exceeds the budget.
export class ByteCache {
  constructor(limit,dispose=()=>{}){
    if(!Number.isFinite(limit)||limit<0)throw new RangeError('Cache budget must be finite and nonnegative.');
    this.limit=limit;this.dispose=dispose;this.items=new Map();this.bytes=0;
  }
  get(key){
    const entry=this.items.get(key);
    if(entry){this.items.delete(key);this.items.set(key,entry);return entry.value;}
  }
  take(key){const entry=this.items.get(key);if(entry){this.items.delete(key);this.bytes-=entry.bytes;return entry.value;}}
  set(key,value,bytes){
    const previous=this.items.get(key);
    if(previous?.value===value){this.items.delete(key);this.bytes-=previous.bytes;}
    else this.delete(key);
    if(bytes>this.limit||this.limit===0)return false;
    while(this.bytes+bytes>this.limit)this.delete(this.items.keys().next().value);
    this.items.set(key,{value,bytes});this.bytes+=bytes;return true;
  }
  delete(key){const entry=this.items.get(key);if(entry){this.items.delete(key);this.bytes-=entry.bytes;this.dispose(entry.value);}}
  clear(){for(const key of this.items.keys())this.delete(key);}
}
