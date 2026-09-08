# Final recovery snapshot timing

Create the stable recovery branch only after the merged `main` workflow finishes successfully, so the snapshot points to the exact production-delivered SHA rather than the pre-merge audit branch.
