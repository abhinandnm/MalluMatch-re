# MalluMatch Rollback & Backup Guide

This guide ensures you can always return to a stable state if something goes wrong.

## 🛡️ Option 1: The Modern Way (Git Snapshots)
Git is the fastest and most efficient way to "checkpoint" your work.

### 1. Create a Snapshot
Before you start a big change, run these commands:
```powershell
git add .
git commit -m "Snapshot: Before trying [feature name]"
```

### 2. Roll Back
If things break, you can "undo" back to that snapshot:
```powershell
git reset --hard HEAD
```
*⚠️ WARNING: This will delete any unsaved changes since your last snapshot.*

---

## 📂 Option 2: The Manual Way (Physical Backup)
If you want a separate copy of your files, I've created a `backups/` folder.

### 1. Create a Manual Backup
I have created a snapshot for you in:
`backups/snapshot_YYYYMMDD_HHMM` (Check the folder for the exact timestamp).

### 2. How to Roll Back manually
1.  Close your editor/server.
2.  Rename your current `MalluMatch` folder to `MalluMatch_BROKEN`.
3.  Copy the files from inside `backups/snapshot_...` back into a new `MalluMatch` folder.
4.  Run `npm install` in both `frontend` and `backend` (since `node_modules` are not backed up to save space).

---

## 🚀 Pro Tip
Always keep your `.env` files safe! They contain your passwords and keys, and aren't usually included in Git snapshots for security.
