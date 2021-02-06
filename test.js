const bio = require('bufio');
const assert = require('bsert');

const bw = bio.write(); // 构建 BufferWriter对象
console.log(bw); 
bw.writeU64(100);
console.log(bw); 
bw.writeString('foo')
console.log(bw); 

const data = bw.render(); //构建 Buffer对象

const br = bio.read(data); //构建 BufferReader对象
assert(br.readU64() === 100);
assert(br.readString(3) === 'foo')