/*!
 * mine.js - mining function for bcoin
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const assert = require('bsert');
const hash256 = require('bcrypto/lib/hash256');

/**
 * Hash until the nonce overflows.
 * @alias module:mining.mine
 * @param {Buffer} data
 * @param {Buffer} target - Big endian.
 * @param {Number} min
 * @param {Number} max
 * @returns {Number} Nonce or -1.
 */

function mine(data, target, min, max) {
  let nonce = min;

  //1. Buffer.writeUInt32LE(value, offset, ?)以小端序，将value写入buffer中指定的offset位置; 
  //2. 前面76个字节(FF)是：比特币的区块头固定为80个字节，nonce是四个字节
  data.writeUInt32LE(nonce, 76, true);

  // The heart and soul of the miner: match the target.
  while (nonce <= max) {
    // Hash and test against the next target.
    if (rcmp(hash256.digest(data), target) <= 0) //1.生成当前交易数据包的哈希摘要，并与target比较; 2.hash256.digest()操作返回的是一个Buffer.alloc(32)
      return nonce;

    // Increment the nonce to get a different hash.
    nonce += 1;

    // Update the raw buffer.
    data.writeUInt32LE(nonce, 76, true); //交易数据包跟你当前使用的nonce也有关系，因此此处需要更新
  }

  return -1;
}

/**
 * "Reverse" comparison so we don't have
 * to waste time reversing the block hash.
 * @ignore
 * @param {Buffer} a
 * @param {Buffer} b
 * @returns {Number}
 */

function rcmp(a, b) {
  assert(a.length === b.length); //a,b都是buffer结构的：Buffer.alloc(32)

  for (let i = a.length - 1; i >= 0; i--) {
    if (a[i] < b[i])
      return -1;
    if (a[i] > b[i])
      return 1;
  }

  return 0;
}

/*
 * Expose
 */

module.exports = mine;
