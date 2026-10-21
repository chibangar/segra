# Highlight regression checks

Run `dotnet run --project Tests/Highlights` from the repository root. This executable
uses the actual bookmark, title formatter and CS2 state tracker without starting OBS.
Run `npm test --prefix Frontend` for the combined library filters.

CS2 GSI supplies aggregate counters and inventory snapshots, not per-kill weapon
events. Weapons inferred from ammo consumption are marked `WeaponIsInferred` and
displayed with `?`. One Tap and collateral labels are supported in event metadata,
but the GSI tracker does not assign them without per-shot confirmation. Existing
recordings without contextual metadata cannot recover map or weapon retroactively.

Automatic titles are flagged in metadata so exporting a trim regenerates the title
from the exported events. A user rename clears that flag. Clips across different
rounds show a total kill count rather than claiming an ACE.
