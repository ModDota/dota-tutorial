import "./modifiers/modifier_visible_through_fog"
import "./modifiers/modifier_tutorial_pacifist"

/**
 * Get a list of all valid players currently in the game.
 */
export function findAllPlayersID(): PlayerID[] {
    const players: PlayerID[] = [];

    for (let playerID = 0; playerID < DOTA_MAX_TEAM_PLAYERS; playerID++) {
        if (PlayerResource.IsValidPlayer(playerID)) {
            players.push(playerID);
        }
    }

    return players;
}

/**
 * Get the player ID of the real player in the game.
 */
export function findRealPlayerID(): PlayerID {
    let playerIDs = findAllPlayersID();
    const realPlayerID = playerIDs.filter(playerID => !PlayerResource.IsFakeClient(playerID))[0];

    return realPlayerID;
}

/**
 * @returns The player's hero of the real player in the game.
 */
export function getPlayerHero(): CDOTA_BaseNPC_Hero | undefined {
    return GameRules.Addon.playerHero;
}

/**
 * Set whether the player hero can earn XP from all sources. Defaults to false.
 */
export function setCanPlayerHeroEarnXP(canEarnXP: boolean) {
    GameRules.Addon.canPlayerHeroEarnXP = canEarnXP;
}

/**
 * Check if the hero can currently earn XP from all sources.
 * @returns whether the hero can currently earn XP.
 */
export function canPlayerHeroEarnXP(): boolean {
    return GameRules.Addon.canPlayerHeroEarnXP;
}

/**
 * Sets whether a unit can be shown through the fog of war.
 */
export function setUnitVisibilityThroughFogOfWar(unit: CDOTA_BaseNPC, visible: boolean) {
    if (visible) {
        unit.AddNewModifier(undefined, undefined, "modifier_visible_through_fog", {});
    }
    else {
        unit.RemoveModifierByName("modifier_visible_through_fog");
    }
}

export function setUnitPacifist(unit: CDOTA_BaseNPC, isPacifist: boolean, duration?: number) {
    if (isPacifist) {
        unit.AddNewModifier(undefined, undefined, "modifier_tutorial_pacifist", { duration: duration });
    }
    else {
        unit.RemoveModifierByName("modifier_tutorial_pacifist");
    }
}

/*
 * Returns the object if it is not undefined or calls error.
 * @param obj Object to check and return.
 * @param msg Optional message to pass for error.
 */
export function getOrError<T>(obj: T | undefined, msg?: string): T {
    if (obj === undefined) {
        error(msg ?? "Object was undefined")
    }

    return obj
}

/**
 * Updates the goal display.
 * @param goals Goals to display in the UI.
 */
export function setGoalsUI(goals: Goal[]) {
    CustomGameEventManager.Send_ServerToAllClients("set_goals", { goals });
}
