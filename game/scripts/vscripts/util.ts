/**
 * Get a list of all valid players currently in the game.
 */
export function findAllPlayers(): PlayerID[] {
    const result: PlayerID[] = [];
    for (const pID of $range(0, DOTALimits_t.DOTA_MAX_PLAYERS)) {
        if (PlayerResource.IsValidPlayerID(pID)) {
            result.push(pID)
        }
    }

    return result;
}