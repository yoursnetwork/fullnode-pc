'use strict'
let Struct = require('yours-bitcoin/lib/struct')
let asink = require('asink')
let Script = require('yours-bitcoin/lib/script')
let PrivKey = require('yours-bitcoin/lib/priv-key')
let PubKey = require('yours-bitcoin/lib/pub-key')
let Address = require('yours-bitcoin/lib/address')
let KeyPair = require('yours-bitcoin/lib/key-pair')
let TxBuilder = require('yours-bitcoin/lib/tx-builder')
let Scripts = require('../scripts.js')
let SpendingTxoBuilder = require('./spending-txo-builder.js')

class SpendingOwnTxo extends SpendingTxoBuilder {
  constructor () {
    super()
    this.fromObject({})
  }

  /*
   * Builds a transaction that spends from the commitment transaction.
   * Used if the agent himself published the commitment transaction.
   * Requires payee to present their htlc secret.
   * Spends from the first branch of the rhtlc script
   */
  asyncBuild (commitmentTxo, spending) {
    return asink(function *() {
      return yield this.asyncBuildTxo(spending, commitmentTxo.txb.tx,
        Scripts.spendFromRhtlc(commitmentTxo.htlcSecret), commitmentTxo.rhtlcRedeemScript,
        1, commitmentTxo.rhtlcOutNum)
    }, this)
  }
}

module.exports = SpendingOwnTxo