# Demo Video Script: Midnight Private Payroll & Splits

> **Project:** Midnight Private Payroll & Splits  
> **Smart Contract:** Compact 0.23 on Midnight Network  
> **Format:** Screen Recording + Voiceover (1080p / 60fps / 16:9)  
> **Target Audience:** Hackathon Judges, Web3 Developers, Enterprise Finance & Payroll Teams  

---

## 📋 Table of Contents
1. [Pre-Recording Checklist & Environment Setup](#-pre-recording-checklist--environment-setup)
2. [Format A: 60-Second Fast-Paced Hackathon Demo Script](#-format-a-60-second-fast-paced-hackathon-demo-script)
3. [Format B: 2.5-Minute Full Technical Walkthrough Script](#-format-b-25-minute-full-technical-walkthrough-script)
4. [Word-for-Word Voiceover Narration Sheets](#-word-for-word-voiceover-narration-sheets)
5. [Visual Effects, Callouts & B-Roll Guidance](#-visual-effects-callouts--b-roll-guidance)
6. [Post-Production & Audio Sync Tips](#-post-production--audio-sync-tips)

---

## 🛠 Pre-Recording Checklist & Environment Setup

### 1. Application Setup
- [ ] Start the local dApp frontend:
  ```bash
  npm run dev
  ```
  Open browser at `http://localhost:5173`.
- [ ] Ensure contract is compiled and build is clean:
  ```bash
  npm run compile && npm run build
  ```
- [ ] Have a terminal window open, sized cleanly, ready to run:
  ```bash
  npm test
  ```

### 2. Browser & Display Setup
- [ ] Set browser window resolution to **1920x1080 (1080p)** at 100% zoom.
- [ ] Clear browser cache / local storage or click **"Reset Demo"** in header to start from clean uninitialized state.
- [ ] Enable cursor highlight / mouse click ring effect in screen recording software (e.g. OBS Studio, ScreenFlow, Loom, or Camtasia).
- [ ] Ensure dark mode theme is active with high contrast styling.

### 3. Audio & Voice Setup
- [ ] Use a dedicated condenser or dynamic microphone with noise reduction.
- [ ] Tone: Confident, crisp, clear, energetic, and professional.
- [ ] Pronounce key terms clearly:
  - *Midnight* (`/ˈmɪd.naɪt/`)
  - *Compact* (`/ˈkɒm.pækt/`)
  - *Zero-Knowledge / ZK* (`/ziː-keɪ/` or `/zɛd-keɪ/`)
  - *persistentHash* (`/pərˈsɪs.tənt hæʃ/`)
  - *tDUST* (`/tiː dʌst/`)

---

## ⚡ Format A: 60-Second Fast-Paced Hackathon Demo Script

*Ideal for 1-minute video submissions and social teasers.*

| Timestamp | Scene / Screen | What to DO (On-Screen Action) | What to SAY (Voiceover Audio) |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:10** | **Intro & Problem** | Open on Landing Page (`App.tsx`). Hover over the Header and Dual-State diagram. | *"On transparent blockchains, company payroll and contractor payouts expose every single salary to the entire world. Midnight solves this with Zero-Knowledge Private Payroll."* |
| **0:10 - 0:20** | **1. Create Round** | Go to **Create Round** tab. Select Employer wallet. Set budget to `10,000 tDUST`. Click **"Create & Fund Payout Round"**. | *"As the employer, we initialize a round with a public budget of 10,000 tokens and 4 recipient addresses. Zero salary data touches the chain."* |
| **0:20 - 0:32** | **2. Assign Amounts** | Switch to **Assign Amounts** tab. Show private allocations (2500, 3500, 1800, 2200). Click **"Commit All Private Allocations"**. | *"Next, we assign individual salaries client-side. Blinding salts generate cryptographic commitments via persistentHash — only hashes go on-chain, keeping exact amounts strictly confidential."* |
| **0:32 - 0:42** | **3. ZK Finalization** | Go to **Finalize Round** tab. Click **"Generate ZK Sum Proof & Finalize"**. Show `Finalized` badge and `sum_proof.valid = true`. | *"To finalize, the employer generates a ZK proof via the `prove_total` circuit, mathematically proving all 4 hidden amounts sum exactly to 10,000 tokens with zero fund leakage."* |
| **0:42 - 0:52** | **4. Private Claim** | Switch wallet persona to **Alice (`Alice - Senior Engineer`)**. Go to **Claim** tab. Click **"Submit Private Claim"**. | *"Alice connects her wallet and submits her private witness to claim. Midnight authenticates the commitment in ZK without exposing her salary to coworkers or observers."* |
| **0:52 - 1:00** | **5. Audit & Tests** | Quick click on **Audit** tab (show 100% solvency) then cut to terminal running `npm test` (**10/10 tests pass**). | *"Auditors verify full solvency in one click via `verify_total()`. With 10 out of 10 automated tests passing, Private Payroll makes confidential Web3 compensation a reality!"* |

---

## 🎬 Format B: 2.5-Minute Full Technical Walkthrough Script

*Ideal for in-depth evaluations, technical reviews, and product demos.*

```
 ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
 │ 1. Create Round │ ────> │ 2. Assign (ZK)  │ ────> │ 3. Finalize Sum │
 │ Budget + 4 Addr │       │ hash(amt, salt) │       │ prove_total ZK  │
 └─────────────────┘       └─────────────────┘       └─────────────────┘
                                                               │
                                                               ▼
 ┌─────────────────┐                                 ┌─────────────────┐
 │ 5. Public Audit │ <────────────────────────────── │ 4. Recipient    │
 │ verify_total()  │   Read-only Solvency Check      │    Claim Amount │
 └─────────────────┘                                 └─────────────────┘
```

---

### Scene 1: Introduction & The Blockchain Payroll Dilemma
- **Duration:** 0:00 – 0:25 (25 seconds)
- **Visual Focus:** dApp Header, Navigation Bar, Architecture Card.

#### What to DO:
1. Start recording with the browser displaying the Midnight Private Payroll dApp.
2. Slowly move cursor over the header badge displaying `Compact 0.23` and `Simulated Persona / Lace Preprod`.
3. Point cursor to the Status Banner highlighting:
   - *Public State:* Total Budget, Recipient IDs, Claim Status Flags.
   - *Private Witness State:* Individual Amounts, Blinding Salts.

#### What to SAY:
> *"Welcome to the demonstration of Midnight Private Payroll and Splits — a privacy-preserving compensation system built on the Midnight Network using Compact 0.23.*
>
> *On traditional transparent blockchains, deploying payroll or revenue sharing creates an unacceptable dilemma: all salary amounts, contractor rates, and bonuses are permanently visible on-chain. This causes severe workplace friction and leaks critical business intelligence.*
>
> *Midnight solves this using dual-state Zero-Knowledge smart contracts. Let's see how it works across a complete disbursement lifecycle."*

---

### Scene 2: Creating and Funding the Payout Round (Employer)
- **Duration:** 0:25 – 0:50 (25 seconds)
- **Visual Focus:** `CreateRound.tsx` Tab, Budget Input, Recipient Slot List.

#### What to DO:
1. Click on the **"Create Round"** tab.
2. In the top-right wallet bar, ensure **"Employer (Organization HQ)"** is selected.
3. In the **"Total Round Budget"** field, highlight the default `10000` tDUST.
4. Point cursor to the 4 recipient address cards:
   - Slot 0: Alice (`Senior Engineer`)
   - Slot 1: Bob (`Product Designer`)
   - Slot 2: Charlie (`DevOps Engineer`)
   - Slot 3: Dave (`Security Auditor`)
5. Click the purple button **"Create & Fund Payout Round"** (or **"Deploy & Initialize Contract"**).
6. Observe the status card update: Status turns green `Assigning`, Round Budget shows `10,000 tDUST`, Assigned Count shows `0 / 4`.

#### What to SAY:
> *"We begin from the perspective of the Employer. In the Create Round tab, we configure a public total budget of 10,000 tokens and register the public addresses of our four recipients.*
>
> *When we initialize the round, the smart contract records the public budget and recipient public keys on the Midnight ledger. Notice that at this stage, no individual compensation amounts have been declared or published."*

---

### Scene 3: Client-Side Allocations & Blinding Salt Commitments
- **Duration:** 0:50 – 1:20 (30 seconds)
- **Visual Focus:** `AssignAmounts.tsx` Tab, Allocation Input Sliders/Fields, Dynamic Hash Output, Running Total Calculator.

#### What to DO:
1. Navigate to the **"Assign Amounts"** tab.
2. Highlight the 4 private allocation fields:
   - Alice: `2500`
   - Bob: `3500`
   - Charlie: `1800`
   - Dave: `2200`
3. Point out the live **Running Total** indicator showing `10,000 / 10,000 (100% matched)`.
4. Point out the **Blinding Salt** (`Bytes<32>` hex strings) generated locally in client memory.
5. Highlight the calculated `Commitment Hash` box below each recipient, computed via `persistentHash([amount, salt])`.
6. Click **"Commit All 4 Private Allocations"** (or assign them consecutively).
7. Watch each card display a green checkmark `Assigned on Ledger`.

#### What to SAY:
> *"Now, the employer enters the private compensation amounts. Here Alice receives 2,500, Bob gets 3,500, Charlie gets 1,800, and Dave gets 2,200.*
>
> *Crucially, these numbers never leave the employer's local device in plaintext. Instead, the dApp combines each amount with a cryptographically secure 32-byte blinding salt and computes an on-chain commitment using Compact's `persistentHash` primitive.*
>
> *We click 'Commit All Allocations'. Only the commitment hashes are stored on the Midnight ledger. To any outside observer, these hashes reveal zero information about the underlying salaries."*

---

### Scene 4: Zero-Knowledge Sum Proof (`prove_total` / `finalize_round`)
- **Duration:** 1:20 – 1:45 (25 seconds)
- **Visual Focus:** `FinalizeRound.tsx` Tab, Solvency Comparison, ZK Proof Generation Loader, Finalized Status.

#### What to DO:
1. Click the **"Finalize Round"** tab.
2. Point cursor to the Solvency Summary card:
   - Total Funded Budget: `10,000 tDUST`
   - Hidden Allocated Sum: `10,000 tDUST`
   - Solvency Delta: `0 tDUST (Exact Match)`
3. Click the glowing button **"Generate ZK Sum Proof & Finalize"**.
4. Show the proving spinner (*"Executing prove_total circuit witness..."*).
5. Watch the success banner appear:
   - Round Status: `Finalized`
   - `sum_proof.valid`: `true`
   - On-chain attestation confirmed.

#### What to SAY:
> *"With all four commitments recorded, the employer must finalize the payout round by proving solvency.*
>
> *We execute the `prove_total` ZK circuit. The Midnight smart contract verifies in zero-knowledge that: first, all four private allocations correspond to their on-chain commitments; and second, the sum of all hidden allocations equals exactly the 10,000 token public budget.*
>
> *The circuit outputs a cryptographic proof, setting `sum_proof.valid` to true on-chain. We have now mathematically guaranteed 100% solvency and zero fund leakage — without ever revealing a single salary."*

---

### Scene 5: Recipient Private Claim Portal
- **Duration:** 1:45 – 2:10 (25 seconds)
- **Visual Focus:** Wallet Switcher in Header, `ClaimAmount.tsx` Tab, Private Witness Inputs, Claim Success Confirmation.

#### What to DO:
1. Open the Account Selector dropdown in the top header.
2. Switch wallet from **Employer** to **"Alice (Senior Engineer)"**.
3. Navigate to the **"Claim Amount"** tab.
4. Show that Alice's portal detects her registered address (`midnight1_alice_recip`).
5. Show her local private witness inputs:
   - Claim Amount: `2500`
   - Claim Salt: `0x4a9f...`
6. Click the purple button **"Submit Private Claim in Zero-Knowledge"**.
7. Watch the claim confirmation appear:
   - Claim Status: `Claimed on Ledger (true)`
   - Disbursed Amount: `2,500 tDUST` (visible only in Alice's local view).

#### What to SAY:
> *"Now let's switch roles to an employee. We select Alice's wallet from the persona selector.*
>
> *Navigating to the Claim tab, Alice provides her private amount of 2,500 tokens and her corresponding blinding salt. When she clicks 'Submit Private Claim', the `claim_amount` circuit verifies her witness against her on-chain commitment in zero-knowledge.*
>
> *Her payout is authenticated, and the on-chain ledger marks her slot as claimed. Observers on the blockchain only see a boolean flag `claimed: true` — nobody learns how much Alice was paid."*

---

### Scene 6: Independent Public Solvency Audit Dashboard
- **Duration:** 2:10 – 2:30 (20 seconds)
- **Visual Focus:** `AuditPage.tsx` Tab, Auditor / Observer View, Ledger State Table, One-Click Verification.

#### What to DO:
1. Switch wallet to **"Auditor / Public Observer"** or keep current wallet.
2. Click on the **"Audit & Verify"** tab.
3. Review the on-chain state inspection card:
   - Budget: `10,000 tDUST`
   - Status: `Finalized`
   - Assigned Slots: `4 / 4`
   - Commitments: 4 opaque hashes
   - Claimed Statuses: `Alice: true | Bob: false | Charlie: false | Dave: false`
4. Click the button **"Run verify_total() Audit"**.
5. Show the green verified result:
   - ✅ `Mathematical Solvency Verified: 100%`
   - ✅ `Budget Compliance Confirmed`
   - 🔒 `Zero Plaintext Leaks Detected`

#### What to SAY:
> *"Finally, any auditor, tax authority, or public observer can visit the Audit tab.*
>
> *By invoking the read-only `verify_total()` circuit, the auditor inspects the on-chain ledger state and cryptographically verifies that the payout round is fully solvent, finalized, and strictly compliant with the funded budget — all without requiring access to confidential company payroll spreadsheets."*

---

### Scene 7: Automated Test Suite & Malicious Edge-Case Verification
- **Duration:** 2:30 – 2:50 (20 seconds)
- **Visual Focus:** Terminal Window running `npm test`, test execution logs, 10/10 test results.

#### What to DO:
1. Switch window to the terminal.
2. Run the test command:
   ```bash
   npm test
   ```
3. Highlight the passing test output:
   - `tests/happy_path.test.ts`:
     - ✅ Deterministic commitment hashing
     - ✅ Complete 5-step lifecycle (Init -> Assign -> Finalize -> Claim -> Audit)
     - ✅ Strict privacy assertion (zero amounts in ledger state)
   - `tests/rejections.test.ts`:
     - ❌ Rejection: `sum != budget`
     - ❌ Rejection: incomplete assignments before finalization
     - ❌ Rejection: tampered amount or invalid salt
     - ❌ Rejection: double-claim attempts
     - ❌ Rejection: unauthorized caller access control

#### What to SAY:
> *"Our implementation is backed by a comprehensive automated test suite with 10 out of 10 tests passing in Vitest.*
>
> *We rigorously test both the happy path and critical edge cases — proving that the Compact contract rejects invalid sums, incomplete assignments, tampered salts, unauthorized callers, and double-claim attempts."*

---

### Scene 8: Architecture Summary & Conclusion
- **Duration:** 2:50 – 3:00 (10 seconds)
- **Visual Focus:** GitHub Repository / Summary Slide with links and credentials.

#### What to DO:
1. Display the GitHub repository README and Product Proposal.
2. Highlight the key links: GitHub repo `d35r0n/private-payroll`, Compact 0.23 contracts, test suite.

#### What to SAY:
> *"Midnight Private Payroll eliminates the transparency paradox of blockchain finance — proving what matters while keeping commercial compensation strictly private. Thank you for watching!"*

---

## 🎙 Word-for-Word Voiceover Narration Sheets

### Script 1: 60-Second High-Impact Narration
```text
[0:00 - 0:10]
On transparent blockchains, company payroll and contractor payouts expose every single salary to the entire world. Midnight solves this forever with Zero-Knowledge Private Payroll.

[0:10 - 0:20]
As the employer, we initialize a payout round with a public budget of 10,000 tokens and register four recipient addresses. Zero salary information touches the chain.

[0:20 - 0:32]
Next, we assign individual salaries client-side. Blinding salts generate cryptographic commitments via persistentHash — only hashes go on-chain, keeping exact amounts strictly confidential.

[0:32 - 0:42]
To finalize, the employer submits a ZK proof via the prove_total circuit, mathematically proving all four hidden allocations sum exactly to 10,000 tokens with zero fund leakage.

[0:42 - 0:52]
Alice connects her wallet and submits her private witness to claim. Midnight authenticates the commitment in ZK without exposing her salary to coworkers or observers.

[0:52 - 1:00]
Auditors verify full solvency in one click via verify_total(). With 10 out of 10 automated tests passing, Private Payroll makes confidential Web3 compensation a reality!
```

---

### Script 2: Full 2.5-Minute Comprehensive Narration
```text
[0:00 - 0:25]
Welcome to the demonstration of Midnight Private Payroll and Splits — a privacy-preserving compensation system built on the Midnight Network using Compact 0.23.

On traditional transparent blockchains, deploying payroll or revenue sharing creates an unacceptable dilemma: all salary amounts, contractor rates, and bonuses are permanently visible on-chain. This causes severe workplace friction and leaks critical business intelligence.

Midnight solves this using dual-state Zero-Knowledge smart contracts. Let's see how it works across a complete disbursement lifecycle.

[0:25 - 0:50]
We begin from the perspective of the Employer. In the Create Round tab, we configure a public total budget of 10,000 tokens and register the public addresses of our four recipients.

When we initialize the round, the smart contract records the public budget and recipient public keys on the Midnight ledger. Notice that at this stage, no individual compensation amounts have been declared or published.

[0:50 - 1:20]
Now, the employer enters the private compensation amounts. Here Alice receives 2,500, Bob gets 3,500, Charlie gets 1,800, and Dave gets 2,200.

Crucially, these numbers never leave the employer's local device in plaintext. Instead, the dApp combines each amount with a cryptographically secure 32-byte blinding salt and computes an on-chain commitment using Compact's persistentHash primitive.

We click 'Commit All Allocations'. Only the commitment hashes are stored on the Midnight ledger. To any outside observer, these hashes reveal zero information about the underlying salaries.

[1:20 - 1:45]
With all four commitments recorded, the employer must finalize the payout round by proving solvency.

We execute the prove_total ZK circuit. The Midnight smart contract verifies in zero-knowledge that: first, all four private allocations correspond to their on-chain commitments; and second, the sum of all hidden allocations equals exactly the 10,000 token public budget.

The circuit outputs a cryptographic proof, setting sum_proof.valid to true on-chain. We have now mathematically guaranteed 100% solvency and zero fund leakage — without ever revealing a single salary.

[1:45 - 2:10]
Now let's switch roles to an employee. We select Alice's wallet from the persona selector.

Navigating to the Claim tab, Alice provides her private amount of 2,500 tokens and her corresponding blinding salt. When she clicks 'Submit Private Claim', the claim_amount circuit verifies her witness against her on-chain commitment in zero-knowledge.

Her payout is authenticated, and the on-chain ledger marks her slot as claimed. Observers on the blockchain only see a boolean flag 'claimed: true' — nobody learns how much Alice was paid.

[2:10 - 2:30]
Finally, any auditor, tax authority, or public observer can visit the Audit tab.

By invoking the read-only verify_total() circuit, the auditor inspects the on-chain ledger state and cryptographically verifies that the payout round is fully solvent, finalized, and strictly compliant with the funded budget — all without requiring access to confidential company payroll spreadsheets.

[2:30 - 2:50]
Our implementation is backed by a comprehensive automated test suite with 10 out of 10 tests passing in Vitest.

We rigorously test both the happy path and critical edge cases — proving that the Compact contract rejects invalid sums, incomplete assignments, tampered salts, unauthorized callers, and double-claim attempts.

[2:50 - 3:00]
Midnight Private Payroll eliminates the transparency paradox of blockchain finance — proving what matters while keeping commercial compensation strictly private. Thank you for watching!
```

---

## 🎨 Visual Effects, Callouts & B-Roll Guidance

When editing the video, insert the following graphic callouts, text overlays, and zooms:

| Scene | Visual Element | Text Overlay / Graphic Callout | Placement / Timing |
| :--- | :--- | :--- | :--- |
| **Scene 1** | Red Cross vs Green Shield Graphic | ❌ Transparent Chains: *Every salary public*<br>✅ Midnight ZK: *Provable Solvency + Zero Leakage* | Center Screen / [0:05] |
| **Scene 2** | Highlight Box | 📦 **Public Ledger State:** `budget = 10,000` | Over Round Status Card / [0:35] |
| **Scene 3** | Animated Formula Overlay | `commitment = persistentHash([amount, salt])` | Over Assign Form / [1:00] |
| **Scene 4** | ZK Circuit Badge | ⚡ **ZK Circuit:** `prove_total` (`sum(amounts) == budget`) | Center Screen / [1:30] |
| **Scene 5** | Privacy Callout | 🔒 **Public Ledger:** `claimed = true` (Amount = **Hidden**) | Bottom Right / [1:55] |
| **Scene 6** | Solvency Checkmark | 🛡️ **100% Solvency Confirmed** (`verify_total()`) | Center Screen / [2:20] |
| **Scene 7** | Terminal Zoom | 🚀 **10 / 10 Passing Tests (Vitest)** | Full Screen Terminal / [2:35] |

---

## 💡 Post-Production & Audio Sync Tips

1. **Screen Capture Settings:** Record at `1920x1080` (or `2560x1440` downscaled) at `60 FPS` to ensure smooth UI animations, tab transitions, and crisp code typography.
2. **Speed Adjustments:** If transaction confirmations or proof generation takes several seconds in real time, speed up the waiting spinner to 200%–400% so the viewer never waits on loading spinners.
3. **Background Music:** Use low-volume, modern lo-fi or ambient tech background music at **-22 dB to -26 dB** so speech remains clear and prominent at **-6 dB**.
4. **Subtitles / Captions:** Add burned-in or CC captions. Many judges and viewers watch videos with sound muted on mobile devices.
5. **Video Export:** Export as `.mp4` using H.264 / AAC at 15–20 Mbps bitrate for optimal clarity and small file size.
