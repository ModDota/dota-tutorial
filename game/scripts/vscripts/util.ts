/**
 * Get a list of all valid players currently in the game.
 */
export function findAllPlayersID(): PlayerID[]
{
    const players: PlayerID[] = [];

    for (let playerID = 0; playerID < DOTA_MAX_TEAM_PLAYERS; playerID++)
    {
        if (PlayerResource.IsValidPlayer(playerID))
        {
            players.push(playerID);
        }
    }

    return players;
}

/**
 * Get the player ID of the real player in the game.
 */
export function findRealPlayerID(): PlayerID
{
    let playerIDs = findAllPlayersID();
    const realPlayerID = playerIDs.filter(playerID => !PlayerResource.IsFakeClient(playerID))[0];

    return realPlayerID;
}

/**
 * Get the currently assigned hero of the real player in the game.
 */
export function getPlayerHero(): CDOTA_BaseNPC_Hero
{
    const playerID = findRealPlayerID();

    return PlayerResource.GetPlayer(playerID)!.GetAssignedHero();
}

/**
 * Set whether the player hero can earn XP from all sources. Defaults to false.
 */
export function setCanPlayerHeroEarnXP(canEarnXP: boolean)
{
    GameRules.Addon.canPlayerHeroEarnXP = canEarnXP;
}

/**
 * Check if the hero can currently earn XP from all sources.
 * @returns whether the hero can currently earn XP.
 */
export function canPlayerHeroEarnXP(): boolean
{
    return GameRules.Addon.canPlayerHeroEarnXP;
}
