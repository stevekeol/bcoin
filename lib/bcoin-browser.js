/*!
 * Bcoin.js - a javascript bitcoin library.
 * Copyright (c) 2014-2015, Fedor Indutny (MIT License).
 * Copyright (c) 2014-2017, Christopher Jeffrey (MIT License).
 * https://github.com/Bcoin-org/Bcoin
 */

'use strict';

/**
 * A Bcoin "environment" which exposes all
 * constructors for primitives, the blockchain,
 * mempool, wallet, etc. It also exposes a
 * global worker pool.
 *
 * @exports Bcoin
 * @type {Object}
 */

const Bcoin = exports;

/**
 * Set the default network.
 * @param {String} network
 */

Bcoin.set = function set(network) {
  Bcoin.Network.set(network);
  return Bcoin;
};

/*
 * Expose
 */

// Logger
Bcoin.logger = require('blgr');

// Blockchain
Bcoin.blockchain = require('./blockchain');
Bcoin.Chain = require('./blockchain/chain');
Bcoin.ChainEntry = require('./blockchain/chainentry');

// Blockstore
Bcoin.blockstore = require('./blockstore');

// BTC
Bcoin.btc = require('./btc');
Bcoin.Amount = require('./btc/amount');
Bcoin.URI = require('./btc/uri');

// Client
Bcoin.client = require('./client');
Bcoin.NodeClient = require('./client/node');
Bcoin.WalletClient = require('./client/wallet');

// Coins
Bcoin.coins = require('./coins');
Bcoin.Coins = require('./coins/coins');
Bcoin.CoinEntry = require('./coins/coinentry');
Bcoin.CoinView = require('./coins/coinview');

// HD
Bcoin.hd = require('./hd');
Bcoin.HDPrivateKey = require('./hd/private');
Bcoin.HDPublicKey = require('./hd/public');
Bcoin.Mnemonic = require('./hd/mnemonic');

// Index
Bcoin.indexer = require('./indexer');
Bcoin.Indexer = require('./indexer/indexer');
Bcoin.TXIndexer = require('./indexer/txindexer');
Bcoin.AddrIndexer = require('./indexer/addrindexer');

// Mempool
Bcoin.mempool = require('./mempool');
Bcoin.Fees = require('./mempool/fees');
Bcoin.Mempool = require('./mempool/mempool');
Bcoin.MempoolEntry = require('./mempool/mempoolentry');

// Miner
Bcoin.mining = require('./mining');
Bcoin.Miner = require('./mining/miner');

// Net
Bcoin.net = require('./net');
Bcoin.packets = require('./net/packets');
Bcoin.Peer = require('./net/peer');
Bcoin.Pool = require('./net/pool');

// Node
Bcoin.node = require('./node');
Bcoin.Node = require('./node/node');
Bcoin.FullNode = require('./node/fullnode');
Bcoin.SPVNode = require('./node/spvnode');

// Primitives
Bcoin.primitives = require('./primitives');
Bcoin.Address = require('./primitives/address');
Bcoin.Block = require('./primitives/block');
Bcoin.Coin = require('./primitives/coin');
Bcoin.Headers = require('./primitives/headers');
Bcoin.Input = require('./primitives/input');
Bcoin.InvItem = require('./primitives/invitem');
Bcoin.KeyRing = require('./primitives/keyring');
Bcoin.MerkleBlock = require('./primitives/merkleblock');
Bcoin.MTX = require('./primitives/mtx');
Bcoin.Outpoint = require('./primitives/outpoint');
Bcoin.Output = require('./primitives/output');
Bcoin.TX = require('./primitives/tx');

// Protocol
Bcoin.protocol = require('./protocol');
Bcoin.consensus = require('./protocol/consensus');
Bcoin.Network = require('./protocol/network');
Bcoin.networks = require('./protocol/networks');
Bcoin.policy = require('./protocol/policy');

// Script
Bcoin.script = require('./script');
Bcoin.Opcode = require('./script/opcode');
Bcoin.Program = require('./script/program');
Bcoin.Script = require('./script/script');
Bcoin.ScriptNum = require('./script/scriptnum');
Bcoin.SigCache = require('./script/sigcache');
Bcoin.Stack = require('./script/stack');
Bcoin.Witness = require('./script/witness');

// Utils
Bcoin.utils = require('./utils');
Bcoin.util = require('./utils/util');

// Wallet
Bcoin.wallet = require('./wallet');
Bcoin.WalletDB = require('./wallet/walletdb');

// Workers
Bcoin.workers = require('./workers');
Bcoin.WorkerPool = require('./workers/workerpool');

// Package Info
Bcoin.pkg = require('./pkg');
