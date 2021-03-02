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

/**
 * Freezes time and puts all units into the idle animation. This doesn't literally
 * pause the game, but it effectively does.
 */
export function setGameFrozen(freeze: boolean) {
    Tutorial.SetTimeFrozen(freeze);
    let entity: CBaseEntity | undefined = Entities.First();
    while (entity !== undefined) {
        if (entity.IsBaseNPC()) {
            if (entity.IsAlive() && entity.IsCreep() || entity.IsHero()) {
                if (freeze) {
                    entity.StartGesture(GameActivity.DOTA_IDLE);
                } else {
                    entity.RemoveGesture(GameActivity.DOTA_IDLE);
                }
            }
        }
        entity = Entities.Next(entity);
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

/** Updates the goal display.
  * @param goals Goals to display in the UI.
  */
export function setGoalsUI(goals: Goal[]) {
    CustomGameEventManager.Send_ServerToAllClients("set_goals", { goals });
}
/*
 * Destroy all neutrals on the map
*/
export function DestroyNeutrals() {
    const units = Entities.FindAllByClassname("npc_dota_creep_neutral");
    units.forEach(x => x.Destroy());
}

/**
 * Returns the duration of the given sound in seconds.
 * @param soundName Name of the sound.
 */
export function getSoundDuration(soundName: string) {
    const anyEntity = getOrError(Entities.Next(undefined), "Could not find any entity")
    return anyEntity.GetSoundDuration(soundName, "")
}


/**
 * Prints all key values of an event. (though it actually would work on any array, I guess)
 * @param event An event that should be printed.
 */
export function printEventTable(event: any) {
    for (const key in event) {
        print(key, event[key])
    }
}

/**
 * Shows a "dota" error message to the player.
 * @param message The error message that should be shown to the player.
 */
export function displayDotaErrorMessage(message: string) {
    FireGameEvent("dota_hud_error_message", { reason: 80, message: message })
}
        
/**
 * Checks if a point is inside an array of points
 * @param point The point to check
 * @param polygon The array of points to check against
 */        
export function isPointInsidePolygon(point: Vector, polygon: Vector[]) {
    let oddNodes = false;
    let j = polygon.length;
    for (let i = 1; i < polygon.length; i++) {
        if (
            (polygon[i].y < point.y && polygon[j].y >= point.y) ||
            (polygon[j].y < point.y && polygon[i].y >= point.y)
        ) {
        }
        if (
            polygon[i].x +
                ((point.y - polygon[i].y) / (polygon[j].y - polygon[i].y)) *
                    (polygon[j].x - polygon[i].x) <
            point.x
        ) {
            oddNodes = !oddNodes;
        }
        j = i;
    }
    return oddNodes;
}
