/*!
 * workers.js - worker processes for bcoin
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const bio = require('bufio'); //结构化读写buffer的工具库

/**
 * Framer
 * @alias module:workers.Framer
 */

class Framer {
  /**
   * Create a framer.
   * @constructor
   */

  constructor() {}

  // 构建数据/消息帧（返回的是 Buffer 结构）
  packet(payload) {
    const size = 10 + payload.getSize();
    const bw = bio.write(size); //创建size大小的BufferWriter对象

    bw.writeU32(payload.id); //写入4字节的内容
    bw.writeU8(payload.cmd); //写入1字节的内容
    bw.seek(4); //BufferWriter对象游标offet向右偏移4字节

    payload.toWriter(bw);

    bw.writeU8(0x0a); // 写入一个字节的分隔符

    const msg = bw.render(); //将BufferWriter对象构建为Buffer对象
    msg.writeUInt32LE(msg.length - 10, 5, true); //在offset=5的位置，写上payload.getSize()的大小

    return msg;
  }
}

/*
 * Expose
 */

module.exports = Framer;
