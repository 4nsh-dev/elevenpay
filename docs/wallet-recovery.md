# Wallet recovery — reveal, verify, remind (device-only)

The recovery phrase now has a complete lifecycle in the app: a gated reveal
screen, a positional verify quiz, and a persistent backup reminder — all
without the phrase (or any recovery state) ever touching Supabase.

## Requirements → implementation

| Requirement | How it works |
| --- | --- |
| Reveal phrase | `/recovery` screen: acknowledgments → OS auth → 12 numbered word chips |
| Verify phrase | 3-question positional quiz ("Word #4?") graded locally against memory |
| Backup reminder | Wallet-tab banner until verified; "Later" snoozes for 24h; Profile row shows status |
| Secure confirmation | Mnemonic read goes through SecureStore `requireAuthentication` — the OS biometric/passcode prompt cannot be skipped |
| No database storage | Phrase stays in `expo-secure-store`; backup status is also SecureStore, keyed per owner; zero Supabase reads/writes |
| WDK best practices | Reuses `wdkService.revealRecoveryPhrase` (SecureStore-gated, `WHEN_UNLOCKED_THIS_DEVICE_ONLY`); words are transient state, auto-hide in 60s, dropped on unmount; no clipboard, no logging |

## Flow

```
Wallet banner / Profile row
        |
        v
/recovery (intro) --ack x2--> OS biometric/passcode (SecureStore gate)
        |                              |
        v                              v
   refuse/error                (revealed) 12 word chips, 60s auto-hide
                                       |
                                       v
                               (verify) 3 positional questions
                                |               |
                            mismatch        all correct
                                |               |
                                v               v
                        retry / re-reveal   markPhraseVerified
                                                |
                                                v
                              (done) isBackedUp=true, banner gone
```

## Storage (all on-device, none in Supabase)

| Key | Contents | Options |
| --- | --- | --- |
| `elevenpay.wdk.wallet.<owner>.mnemonic` | The phrase (pre-existing) | `requireAuthentication`, `WHEN_UNLOCKED_THIS_DEVICE_ONLY` |
| `elevenpay.recovery.<owner>.backup-status` | `backedUpAt` / `snoozedAt` ISO stamps | `WHEN_UNLOCKED_THIS_DEVICE_ONLY` |

The wallet store's existing `isBackedUp` flag is now hydrated from the
persisted status on the Wallet and Profile screens, so the reminder survives
app restarts without any server round-trip.

## Hygiene details

- Words are held in a ref/state only while the screen is mounted; the unmount
  cleanup wipes the ref, and the reveal stage auto-hides after 60 seconds.
- The verify quiz shows 4 options per question (real words + neutral decoys),
  so a shoulder-surfer watching only the quiz cannot reconstruct the phrase.
- A failed quiz clears the answers and offers re-reveal (no partial credit).
- The screen never renders the phrase and the quiz at the same time.
- Copy-to-clipboard is intentionally not offered for the phrase.
- Restore path already existed (`create-or-restore` screen) and is unchanged.

## Files

```
src/features/recovery/backup-status.ts   (new)  device-only backup flag + reminder logic
src/features/recovery/use-recovery.ts    (new)  reveal/verify state machine
src/features/recovery/index.ts           (new)  feature exports
app/recovery.tsx                         (new)  staged recovery screen
app/(tabs)/wallet.tsx                    (mod)  backup reminder banner
app/(tabs)/profile.tsx                   (mod)  security row with backup status
```
