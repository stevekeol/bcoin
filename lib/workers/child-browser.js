/*!
 * child.js - child processes for bcoin
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

/* global register */

'use strict';

const assert = require('bsert');
const EventEmitter = require('events');

/**
 * Child
 * Represents a child process.
 * @alias module:workers.Child
 * @extends EventEmitter
 * @ignore
 */

class Child extends EventEmitter {
  /**
   * Represents a child process.
   * @constructor
   * @param {String} file
   */

  constructor(file) {
    super();

    this.init(file);
  }

  /**
   * Test whether child process support is available.
   * @returns {Boolean}
   */

  static hasSupport() {
    return typeof global.postMessage === 'function';
  }

  /**
   * Initialize child process. Bind to events.
   * @private
   * @param {String} file
   */

  init(file) {
    if (process.env.BMOCHA)
      register(file, [__dirname, file]); // ? 全局暴露的 register ??

    this.child = new global.Worker(file);

    this.child.onerror = (event) => {
      this.emit('error', new Error('Child error.'));
      this.emit('exit', 1, null);
    };

    // 收到运行file工作内容的子线程发送的message时
    this.child.onmessage = (event) => {
      let data;
      if (typeof event.data === 'string') {
        data = Buffer.from(event.data, 'hex'); // 将event中的data（string）转换为16进制
        assert(data.length === event.data.length / 2);
      } else {
        assert(event.data && typeof event.data === 'object');
        assert(event.data.data && typeof event.data.data.length === 'number');
        data = event.data.data;
        data.__proto__ = Buffer.prototype; // 将event中的data（Buffer）重新构造出来
      }
      this.emit('data', data); // 以data事件，发送该data到事件中心
    };
  }

  /**
   * Send data to child process.
   * @param {Buffer} data
   * @returns {Boolean}
   */

  write(data) {
    if (this.child.postMessage.length === 2) {
      data.__proto__ = Uint8Array.prototype; // 将data重新构造为非符号8位数组
      this.child.postMessage({ data }, [data]);
    } else {
      this.child.postMessage(data.toString('hex'));
    }
    return true;
  }

  /**
   * Destroy the child process.
   */

  destroy() {
    this.child.terminate();
    this.emit('exit', 15 | 0x80, 'SIGTERM'); // 向事件中心发送exit事件，告知有worker终止了
  }
}

/*
 * Expose
 */

module.exports = Child;
