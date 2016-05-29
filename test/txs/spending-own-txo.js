/* global describe,it */
'use strict'
let should = require('should')
let asink = require('asink')
let Agent = require('../../lib/agent.js')
let Wallet = require('../../lib/wallet.js')
let DestinationOwnTxo = require('../../lib/txs/spending-own-txo.js')

let PrivKey = require('yours-bitcoin/lib/priv-key')
let PubKey = require('yours-bitcoin/lib/pub-key')
let BN = require('yours-bitcoin/lib/bn')
let TxVerifier = require('yours-bitcoin/lib/tx-verifier')
let TxOutMap = require('yours-bitcoin/lib/tx-out-map')
let Interp = require('yours-bitcoin/lib/interp')

describe('DestinationOwnTxo', function () {
  it('should exist', function () {
    should.exist(DestinationOwnTxo)
    should.exist(new DestinationOwnTxo())
  })

  describe('#asyncBuild', function () {
    it('should create destination tx', function () {
      return asink(function *() {
        // each party initializes itself locally
        let alice = new Agent('Alice')
        yield alice.asyncInitialize(PrivKey.fromRandom(), PrivKey.fromRandom(), PrivKey.fromRandom())
        let bob = new Agent('Bob')
        yield bob.asyncInitialize(PrivKey.fromRandom(), PrivKey.fromRandom(), PrivKey.fromRandom())

        // right now Alice and Bob communicate by storing a reference to one another
        // eventually this will be replaced by some form of remote proceedure calls
        alice.remoteAgent = bob
        bob.remoteAgent = alice

        // Alice opens a channel to bob
        alice.funder = true
        let publicAlice = yield alice.asyncToPublic()
        yield bob.asyncOpenChannel(BN(1e6), publicAlice)

        // alice sends some funds to bob
        alice.sender = true
        bob.sender = false

        yield bob.asyncSend(BN(4e5), BN(6e5))

        let txVerifier, error, commitmentTxo, txOutMap

        // once Bob's commitment tranaction is on the blockchain, he can spend his output like this:
        commitmentTxo = bob.commitmentTxos[0]
        let bobsSpendingTxo = new DestinationOwnTxo()
        yield bobsSpendingTxo.asyncBuild(commitmentTxo, bob.destination)

        should.exist(bobsSpendingTxo)

        txOutMap = new TxOutMap()
        txOutMap.addTx(commitmentTxo.txb.tx)
        txVerifier = new TxVerifier(bobsSpendingTxo.txb.tx, txOutMap)
        error = txVerifier.verifyStr(Interp.SCRIPT_VERIFY_P2SH | Interp.SCRIPT_VERIFY_CHECKLOCKTIMEVERIFY | Interp.SCRIPT_VERIFY_CHECKSEQUENCEVERIFY)
        if (error) {
          console.log(txVerifier.interp.getDebugString())
        }
        error.should.equal(false)

        // same test for alice
        commitmentTxo = alice.commitmentTxos[0]
        let alicesSpendingTxo = new DestinationOwnTxo()
        yield alicesSpendingTxo.asyncBuild(commitmentTxo, alice.destination)

        should.exist(alicesSpendingTxo)
        txOutMap = new TxOutMap()
        txOutMap.addTx(commitmentTxo.txb.tx)
        txVerifier = new TxVerifier(alicesSpendingTxo.txb.tx, txOutMap)
        error = txVerifier.verifyStr(Interp.SCRIPT_VERIFY_P2SH | Interp.SCRIPT_VERIFY_CHECKLOCKTIMEVERIFY | Interp.SCRIPT_VERIFY_CHECKSEQUENCEVERIFY)
        if (error) {
          console.log(txVerifier.interp.getDebugString())
        }
        error.should.equal(false)
      }, this)
    })

    it('should not be able to create destination tx from other tx', function () {
      return asink(function *() {
        // each party initializes itself locally
        let alice = new Agent('Alice')
        yield alice.asyncInitialize(PrivKey.fromRandom(), PrivKey.fromRandom(), PrivKey.fromRandom())
        let bob = new Agent('Bob')
        yield bob.asyncInitialize(PrivKey.fromRandom(), PrivKey.fromRandom(), PrivKey.fromRandom())

        // right now Alice and Bob communicate by storing a reference to one another
        // eventually this will be replaced by some form of remote proceedure calls
        alice.remoteAgent = bob
        bob.remoteAgent = alice

        // Alice opens a channel to bob
        alice.funder = true
        let publicAlice = yield alice.asyncToPublic()
        yield bob.asyncOpenChannel(BN(1e6), publicAlice)

        // alice sends some funds to bob
        alice.sender = true
        bob.sender = false

        yield bob.asyncSend(BN(4e5), BN(6e5))

        let txVerifier, error, commitmentTxo, txOutMap

        // it is important that bob cannot spend the transactions in the other.commitmentTxos array
        try {
          commitmentTxo = bob.other.commitmentTxos[0]
          let bobsSpendingTxo = new DestinationOwnTxo()
          yield bobsSpendingTxo.asyncBuild(commitmentTxo, bob.destination)

          // this is to simulate that the above should throw an error
          true.should.equal(false)
        } catch (err) {
          err.message.should.equal("Cannot read property 'length' of undefined")
        }
      }, this)
    })
  })
})
