/// Records a 32-byte fingerprint (sha256 hash) on Sui as an event, with the chain's own clock time.
///
/// The app hashes each odds reading and each user pick before kickoff and calls `record`.
/// Only the hash goes onchain. Anyone with the saved record can rebuild the hash and find this
/// event, which proves the record existed at `timestamp_ms` and hasn't changed since.
///
/// Anyone can call `record`. That's fine: the app only trusts events whose `recorder` is the
/// app's own wallet address.
module total_recall::stamp;

use sui::clock::Clock;
use sui::event;

/// What was stamped.
const KIND_READING: u8 = 1;
const KIND_PICK: u8 = 2;

const EBadHashLength: u64 = 0;
const EUnknownKind: u64 = 1;
const ERefTooLong: u64 = 2;

public struct Stamped has copy, drop {
    /// 1 = odds reading, 2 = user pick version.
    kind: u8,
    /// sha256 of the record, 32 bytes.
    hash: vector<u8>,
    /// The app's id for the record (a UUID as text), so the event can be traced back.
    ref_id: vector<u8>,
    /// Sui's clock when the transaction ran, in milliseconds since 1 Jan 1970.
    timestamp_ms: u64,
    /// Who called this. The app checks this is its own wallet.
    recorder: address,
}

public fun record(kind: u8, hash: vector<u8>, ref_id: vector<u8>, clock: &Clock, ctx: &TxContext) {
    assert!(kind == KIND_READING || kind == KIND_PICK, EUnknownKind);
    assert!(hash.length() == 32, EBadHashLength);
    assert!(ref_id.length() <= 64, ERefTooLong);
    event::emit(Stamped {
        kind,
        hash,
        ref_id,
        timestamp_ms: clock.timestamp_ms(),
        recorder: ctx.sender(),
    });
}
