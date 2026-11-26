# Dailymotion runtime DOM ownership fix

## What changed

The Dailymotion SDK creates and removes iframe/player DOM nodes itself. The previous React component conditionally switched between a React-rendered SDK mount and a React-rendered fallback iframe. That could cause React reconciliation and Dailymotion teardown to race, producing:

`Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.`

The dedicated Dailymotion component now gives each initialization attempt a unique, imperative mount node inside a stable React-owned root. React never renders or reconciles the SDK-created iframe/player children. Cleanup first deactivates callbacks and detaches that isolated mount, then safely requests SDK teardown. If SDK initialization fails, the hosted iframe fallback is inserted imperatively into the same isolated mount.

YouTube and Vimeo code paths were not changed. No database schema or migration was changed.

## Apply

Keep your existing `.env` and PostgreSQL volume. Replace the project files with this ZIP, then run:

```powershell
npx prisma generate
npm run dev
```

For a production compile check:

```powershell
npm run build
```
