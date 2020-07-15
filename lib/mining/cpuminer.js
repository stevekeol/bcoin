/*!
 * cpuminer.js - inefficient cpu miner for bcoin (because we can)
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License)
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/bcoin-org/bcoin
 */

'use strict';

const assert = require('bsert');
const EventEmitter = require('events');
const { Lock } = require('bmutex');
const util = require('../utils/util');
const mine = require('./mine');

/**
 * CPU miner.
 * @alias module:mining.CPUMiner
 */

class CPUMiner extends EventEmitter {
  /**
   * Create a CPU miner.
   * @constructor
   * @param {Miner} miner
   */

  constructor(miner) {
    super();

    this.opened = false;
    this.miner = miner;
    this.network = this.miner.network;
    this.logger = this.miner.logger.context('cpuminer');
    this.workers = this.miner.workers; //boolean值
    this.chain = this.miner.chain;
    this.locker = new Lock();

    this.running = false;
    this.stopping = false;
    this.job = null;
    this.stopJob = null;

    this.init();
  }

  /**
   * Initialize the miner.
   * @private
   */

  init() {
    this.chain.on('tip', (tip) => {
      if (!this.job)
        return;

      if (this.job.attempt.prevBlock.equals(tip.prevBlock)) //当前希望尝试的区块，是否是最新的区块
        this.job.destroy();
    });
  }

  /**
   * Open the miner.
   * @returns {Promise}
   */

  async open() {
    assert(!this.opened, 'CPUMiner is already open.'); //assert(expression, desc)当expression为false时，打印desc。
    this.opened = true;
  }

  /**
   * Close the miner.
   * @returns {Promise}
   */

  async close() {
    assert(this.opened, 'CPUMiner is not open.');
    this.opened = false;
    return this.stop();
  }

  /**
   * Start mining.
   * @method
   */

  start() {
    assert(!this.running, 'Miner is already running.');
    this._start().catch(() => {});
  }

  /**
   * Start mining.
   * @method
   * @private
   * @returns {Promise}
   */

  async _start() {
    assert(!this.running, 'Miner is already running.');

    this.running = true;
    this.stopping = false;

    for (;;) {
      this.job = null;

      try {
        this.job = await this.createJob(); //此处仅仅是创建一个Job，并没有开启挖矿
      } catch (e) {
        if (this.stopping)
          break;
        this.emit('error', e);
        break;
      }

      if (this.stopping)
        break;

      let block;
      try {
        block = await this.mineAsync(this.job); //
      } catch (e) {
        if (this.stopping)
          break;
        this.emit('error', e);
        break;
      }

      if (this.stopping)
        break;

      if (!block) //当没有挖到区块时，继续重新挖矿，不执行下面的操作
        continue;

      let entry;
      try {
        entry = await this.chain.add(block); //尝试将挖到的区块加入本地该链
      } catch (e) {
        if (this.stopping)
          break;

        if (e.type === 'VerifyError') {
          this.logger.warning('Mined an invalid block!');
          this.logger.error(e);
          continue;
        }

        this.emit('error', e);
        break;
      }

      if (!entry) {
        this.logger.warning('Mined a bad-prevblk (race condition?)');
        continue;
      }

      if (this.stopping)
        break;

      // Log the block hex as a failsafe (in case we can't send it).
      this.logger.info('Found block: %d (%h).', entry.height, entry.hash);

      this.emit('block', block, entry); //？？将block和entry，以事件block广播出去？
    }

    const job = this.stopJob; //此处job挂载null

    if (job) { //在wait()中，job挂载了resolve和reject。因此此处判断，如果挂载了，就执行resolve()操作。
      this.stopJob = null;
      job.resolve();
    }
  }
  

  /**
   * Stop mining.
   * @method
   * @returns {Promise}
   */

  async stop() {
    const unlock = await this.locker.lock();
    try {
      return await this._stop();
    } finally {
      unlock();
    }
  }

  /**
   * Stop mining (without a lock).
   * @method
   * @returns {Promise}
   */

  async _stop() {
    if (!this.running)
      return;

    assert(this.running, 'Miner is not running.');
    assert(!this.stopping, 'Miner is already stopping.');

    this.stopping = true;

    if (this.job) {
      this.job.destroy();
      this.job = null;
    }

    await this.wait();

    this.running = false;
    this.stopping = false;
    this.job = null;
  }

  /**
   * Wait for `done` event.
   * @private
   * @returns {Promise}
   */

  wait() {
    return new Promise((resolve, reject) => {
      assert(!this.stpoJob);
      this.stopJob = { resolve, reject };
    });
  }

  /**
   * Create a mining job.
   * @method
   * @param {ChainEntry?} tip
   * @param {Address?} address
   * @returns {Promise} - Returns {@link Job}.
   */

  async createJob(tip, address) {
    const attempt = await this.miner.createBlock(tip, address);
    return new CPUJob(this, attempt);
  }

  /**
   * Mine a single block.
   * @method
   * @param {ChainEntry?} tip
   * @param {Address?} address
   * @returns {Promise} - Returns [{@link Block}].
   */

  async mineBlock(tip, address) {
    const job = await this.createJob(tip, address);
    return await this.mineAsync(job);
  }

  /**
   * Notify the miner that a new
   * tx has entered the mempool.
   */

  notifyEntry() {
    if (!this.running)
      return;

    if (!this.job)
      return;

    if (util.now() - this.job.start > 10) {
      this.job.destroy();
      this.job = null;
    }
  }

  /**
   * Hash until the nonce overflows.
   * @param {CPUJob} job
   * @returns {Number} nonce
   */

  findNonce(job) {
    const data = job.getHeader();
    const target = job.attempt.target;
    const interval = CPUMiner.INTERVAL;

    let min = 0;
    let max = interval;
    let nonce;

    while (max <= 0xffffffff) { //0xffffffff是比特币核心的默认设置：事件序列号的最大值为无符号四字节最大值
      nonce = mine(data, target, min, max);

      if (nonce !== -1) //即找到符合要求的Nonce了
        break;

      this.sendStatus(job, max); //当寻找nonce失败时，向主网发送状态码？

      min += interval; //开启下一轮的nonce寻找过程(nonce是介于min和max中间的)
      max += interval;
    }

    return nonce;
  }

  /**
   * Hash until the nonce overflows.
   * @method
   * @param {CPUJob} job
   * @returns {Promise} Returns Number.
   */

  async findNonceAsync(job) {
    
    //findNonce和findNonceAsync适用于不同场景: 
    //设置 workers = null的地方：\bcoin\lib\wallet\walletdb.js; \bcoin\lib\node\node.js; \bcoin\lib\mining\miner.js; \bcoin\lib\mempool\mempool.js; \bcoin\lib\blockchain\chain.js
    //this.workers默认为true。 但是this.workers什么时候改变呢？ 那时再直接调用findNonce()
    if (!this.workers) //
      return this.findNonce(job);

    const data = job.getHeader();
    const target = job.attempt.target;
    const interval = CPUMiner.INTERVAL;

    let min = 0;
    let max = interval;
    let nonce;

    while (max <= 0xffffffff) {
      nonce = await this.workers.mine(data, target, min, max); //mine()耗时是一次挖矿尝试的时长，还是固定interval的时长？

      if (nonce !== -1)
        break;

      if (job.destroyed) //当。。的时候，直接返回当前的nonce
        return nonce;

      this.sendStatus(job, max); //每一次尝试找nonce后，都应该向全网发送挖矿状态. max的作用是?

      min += interval;
      max += interval;
    }

    return nonce;
  }

  /**
   * Mine synchronously until the block is found.
   * @param {CPUJob} job
   * @returns {Block}
   */

  mine(job) {
    job.start = util.now();

    let nonce;
    for (;;) {
      nonce = this.findNonce(job);

      if (nonce !== -1)
        break;

      job.updateNonce();

      this.sendStatus(job, 0);
    }

    return job.commit(nonce);
  }

  /**
   * Mine asynchronously until the block is found.
   * @method
   * @param {CPUJob} job
   * @returns {Promise} - Returns {@link Block}.
   */

  async mineAsync(job) {
    let nonce;

    job.start = util.now();

    for (;;) {
      nonce = await this.findNonceAsync(job);

      if (nonce !== -1)
        break;

      if (job.destroyed) //job.destoryed的状态改变的时机在各个阶段都有？
        return null; //

      job.updateNonce(); //job.updateNonce()作用是？

      this.sendStatus(job, 0); //sendStatus()的第二个参数是？
    }

    return job.commit(nonce);
  }

  /**
   * Send a progress report (emits `status`).
   * @param {CPUJob} job
   * @param {Number} nonce
   */

  sendStatus(job, nonce) {
    const attempt = job.attempt;
    const tip = attempt.prevBlock;
    const hashes = job.getHashes(nonce);
    const hashrate = job.getRate(nonce);

    this.logger.info(
      'Status: hashrate=%dkhs hashes=%d target=%d height=%d tip=%h',
      Math.floor(hashrate / 1000),
      hashes,
      attempt.bits, //即target，参考[miner.js]_createBlock()中
      attempt.height,
      tip);

    this.emit('status', job, hashes, hashrate);
  }
}

/**
 * Nonce range interval.
 * @const {Number}
 * @default
 */

CPUMiner.INTERVAL = 0xffffffff / 1500 | 0; //1500看不懂？

/**
 * Mining Job
 * @ignore
 */

class CPUJob {
  /**
   * Create a mining job.
   * @constructor
   * @param {CPUMiner} miner
   * @param {BlockTemplate} attempt
   */

  constructor(miner, attempt) {
    this.miner = miner;
    this.attempt = attempt;
    this.destroyed = false;
    this.committed = false;
    this.start = util.now();
    this.nonce1 = 0;
    this.nonce2 = 0;
    this.refresh();
  }

  /**
   * Get the raw block header.
   * @param {Number} nonce
   * @returns {Buffer}
   */

  getHeader() {
    const attempt = this.attempt;
    const n1 = this.nonce1;
    const n2 = this.nonce2;
    const time = attempt.time;
    const root = attempt.getRoot(n1, n2);
    const data = attempt.getHeader(root, time, 0);
    return data;
  }

  /**
   * Commit job and return a block.
   * @param {Number} nonce
   * @returns {Block}
   */

  commit(nonce) {
    const attempt = this.attempt;
    const n1 = this.nonce1;
    const n2 = this.nonce2;
    const time = attempt.time;

    assert(!this.committed, 'Job already committed.');
    this.committed = true;

    const proof = attempt.getProof(n1, n2, time, nonce);

    return attempt.commit(proof);
  }

  /**
   * Mine block synchronously.
   * @returns {Block}
   */

  mine() {
    return this.miner.mine(this);
  }

  /**
   * Mine block asynchronously.
   * @returns {Promise}
   */

  mineAsync() {
    return this.miner.mineAsync(this);
  }

  /**
   * Refresh the block template.
   */

  refresh() {
    return this.attempt.refresh();
  }

  /**
   * Increment the extraNonce.
   */

  updateNonce() {
    if (++this.nonce2 === 0x100000000) {
      this.nonce2 = 0;
      this.nonce1++;
    }
  }

  /**
   * Destroy the job.
   */

  destroy() {
    assert(!this.destroyed, 'Job already destroyed.');
    this.destroyed = true;
  }

  /**
   * Calculate number of hashes computed.
   * @param {Number} nonce
   * @returns {Number}
   */

  getHashes(nonce) {
    const extra = this.nonce1 * 0x100000000 + this.nonce2;
    return extra * 0xffffffff + nonce;
  }

  /**
   * Calculate hashrate.
   * @param {Number} nonce
   * @returns {Number}
   */

  getRate(nonce) {
    const hashes = this.getHashes(nonce);
    const seconds = util.now() - this.start;
    return Math.floor(hashes / Math.max(1, seconds));
  }

  /**
   * Add a transaction to the block.
   * @param {TX} tx
   * @param {CoinView} view
   */

  addTX(tx, view) {
    return this.attempt.addTX(tx, view);
  }

  /**
   * Add a transaction to the block
   * (less verification than addTX).
   * @param {TX} tx
   * @param {CoinView?} view
   */

  pushTX(tx, view) {
    return this.attempt.pushTX(tx, view);
  }
}

/*
 * Expose
 */

module.exports = CPUMiner;
