# Private Payroll / Splits System — Product Proposal

## What is the product?

A privacy-preserving payroll, contractor payout, and revenue-splits platform built on the **Midnight Network** using **Compact 0.23**. An employer or organization funds a public total budget and distributes it across multiple recipients (employees, contributors, contractors, or revenue-share partners), with each recipient's individual compensation kept strictly private — while anyone can mathematically verify that the total disbursed exactly equals the funded budget with zero discrepancy.

The disbursement workflow is secured and enforced by zero-knowledge (ZK) circuits:
1. **Private Allocations & Commitments:** The employer assigns individual salaries and blinding salts client-side, committing on-chain hashes (`persistentHash(amount, salt)`) without publishing numerical values.
2. **Zero-Knowledge Sum-Proof:** The employer generates a ZK proof (`finalize_round` / `prove_total`) proving that the sum of all hidden allocations equals the public budget and matches all on-chain commitments.
3. **Private Witness Claiming:** Recipients claim their funds in zero knowledge by proving knowledge of their private `(amount, salt)` without exposing payout values or relative distributions to observers.

## Why Midnight?

Traditional transparent blockchains force an unsustainable trade-off between verifiability and confidentiality. On public ledgers, publishing payroll or profit splits exposes sensitive compensation data, triggering strategic poaching by competitors, workplace friction, and regulatory breaches. Conventional workarounds — such as off-chain Trusted Execution Environments (TEEs), centralized databases, or fragile Multi-Party Computation (MPC) networks — rely on trusted third parties and represent severe single points of failure.

Midnight's dual-state architecture and selective disclosure model are load-bearing for this product:

- **Strict Client-Side Privacy:** Individual salary amounts and cryptographic blinding salts never leave the local client environment (employer wallet / recipient wallet). Zero plaintext compensation data is ever transmitted across the network or stored on the public ledger.
- **ZK Commitment Integrity & Authenticity:** During assignment, allocations are cryptographically bound via `persistentHash([amount, salt])` into on-chain `RecipientCommitment` structs, preventing post-assignment tampering or front-running.
- **Zero-Knowledge Solvency & Sum Proof:** The `finalize_round` circuit verifies in zero knowledge that all private allocations correspond to their on-chain commitments and that `sum(amounts) == round.budget`, guaranteeing complete solvency and zero fund leakage without disclosing individual values.
- **Private Witness-Based Claiming:** In `claim_amount`, recipients verify ownership and knowledge of their private allocation against their recorded commitment, securely toggling their `claimed: true` state on-chain without revealing the amount received.
- **Verifiable Solvency & Independent Auditability:** The public `verify_total()` view allows auditors, tax regulators, and participants to independently confirm that the payout round is fully solvent, finalized, and adhering to budget constraints without exposing confidential employee compensation sheets.

This satisfies Midnight's core thesis: **prove what matters (mathematical solvency and rule adherence), keep commercial and personal data private.**

## Data Model

| Field | Type | Visibility | Purpose |
| :--- | :--- | :--- | :--- |
| `round.budget` | `Uint<64>` | Public | Total funded round budget (disbursed tokens) |
| `round.employer` | `Bytes<32>` | Public | Address / public key hash of the employer organization |
| `round.status` | `Uint<8>` | Public | Round lifecycle status (`0` = Uninitialized, `1` = Assigning, `2` = Finalized) |
| `round.assigned_count` | `Uint<8>` | Public | Count of assigned recipient slots (0..4) |
| `commitments[i].recipient_id` | `Bytes<32>` | Public | Intended recipient address for slot `i` |
| `commitments[i].commitment_hash` | `Bytes<32>` | Public | `persistentHash(amount, salt)` cryptographic commitment |
| `commitments[i].is_assigned` | `Boolean` | Public | Flag indicating if slot `i` commitment has been registered |
| `commitments[i].claimed` | `Boolean` | Public | Flag indicating if recipient `i` has claimed their disbursement |
| `sum_proof.valid` | `Boolean` | Public | On-chain cryptographic attestation of verified sum equality |
| `Employer allocation amount` | `Uint<64>` | Private | Individual recipient payout amount (client witness) |
| `Employer blinding salt` | `Bytes<32>` | Private | Entropy ensuring preimage unpredictability (client witness) |
| `Recipient claim amount` | `Uint<64>` | Private | Private allocation provided by recipient to authorize payout |
| `Recipient claim salt` | `Bytes<32>` | Private | Private salt provided by recipient to authorize payout |
| `Caller address` | `Bytes<32>` | Private | Local witness identity evaluated during authorization checks |

## Mainnet Feasibility

### 1. Gas & ZK Proving Performance

Midnight offloads ZK proof generation to client-side proving (via the local proof server / WASM runtime), keeping on-chain verification gas costs constant and lightweight ($O(1)$ verification complexity per circuit execution). On Midnight Mainnet, transaction verification fees remain predictable and independent of private salary values or arithmetic circuit depth.

### 2. Scalability Beyond 4 Recipients

The 4-recipient fixed model serves as an efficient and clean prototype. On Mainnet, arbitrary $N$-recipient enterprise scalability can be achieved via:

- **Merkle Tree Commitment Accumulators:** Storing recipient commitments in Compact `MerkleTree` / Sparse Merkle Tree (SMT) state structures, supporting thousands of concurrent employees or DAO contributors.
- **Batched & Incremental Sum Accumulation:** Structuring payout rounds with incremental sum accumulators or recursive SNARK batching, enabling large organizations to prove solvency across multiple transaction batches without exceeding witness memory boundaries.
- **Shielded Token Settlement (Zswap / Kachina):** Direct integration with Midnight's shielded token engine (`ShieldedCoinInfo` / `sendShielded`), executing confidential value transfer atomically upon successful claim verification.

### 3. Regulatory & Enterprise Compliance

Enterprises face mandatory audit, reporting, and tax withholding requirements alongside privacy obligations. Midnight enables automated compliance reporting where accredited auditors, tax authorities, or enterprise accountants can receive cryptographically verified zero-knowledge attestations (e.g. proof of minimum wage compliance, payroll tax withholding correctness, or statutory benefits allocation) without exposing proprietary contractor rates or company-wide salary tables.

### 4. Decentralized Identity & KYC Integration

By pairing Midnight's Compact contracts with W3C Verifiable Credentials (VCs) or Atala PRISM decentralized identity, organizations can enforce participant eligibility (e.g. verified employee status, tax residency, jurisdiction-specific labor compliance, or AML/KYC verification) directly within the circuit before assigning commitments, preserving pseudonymity on public block explorers while maintaining strict organizational compliance.
