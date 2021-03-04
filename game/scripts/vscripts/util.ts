import "./modifiers/modifier_visible_through_fog"
import "./modifiers/modifier_tutorial_pacifist"
import "./modifiers/modifier_dummy"

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
 * Makes the player hero (un-)able to attack and move.
 * @param frozen Whether or not to freeze the hero.
 */
export function freezePlayerHero(frozen: boolean) {
    const hero = getOrError(getPlayerHero(), "Could not find player hero")
    setUnitPacifist(hero, frozen)
    hero.SetMoveCapability(frozen ? UnitMoveCapability.NONE : UnitMoveCapability.GROUND)
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
 * Highlights a panel along a path
 * @param path The path along the ui to take, such as "HUDElements/lower_hud/center_with_stats/center_block/inventory"
 * @param duration Optional time in seconds after which to remove the highlight
 */
export function highlightUiElement(path: string, duration?: number) {
    CustomGameEventManager.Send_ServerToAllClients("highlight_element", { path, duration });
}

/**
 * Manually removes a highlighted panel, along the path, if it exists
 * @param path The path along the ui to take, such as "HUDElements/lower_hud/center_with_stats/center_block/inventory"
 */
export function removeHighlight(path: string) {
    CustomGameEventManager.Send_ServerToAllClients("remove_highlight", { path });
}

/**
 * Checks if a point is inside an array of points
 * @param point The point to check
 * @param polygon The array of points to check against
 */
export function isPointInsidePolygon(point: Vector, polygon: Vector[]) {
    let inside = false;
    let j = polygon.length - 1;

    for (let i = 0; i < polygon.length; j = i++) {
        if (polygon[i].y > point.y != polygon[j].y > point.y &&
            point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x) {
            inside = !inside;
        }
    }
    return inside
}

/**
 * Spawns an untargetable, invisible dummy unit.
 * @param location Location to spawn the dummy at.
 */
export function createDummy(location: Vector) {
    const dummy = CreateUnitByName("npc_dummy_unit", location, true, undefined, undefined, DotaTeam.GOODGUYS)
    dummy.AddNewModifier(dummy, undefined, "modifier_dummy", {})
    return dummy
}

/**
 * Orders a unit to use an ability.
 * @param caster Unit that will use the ability.
 * @param target Target of the ability.
 * @param abilityName Name of the ability.
 * @param orderType Type of unit order used for casting the ability with ExecuteOrderFromTable.
 */
export const useAbility = (caster: CDOTA_BaseNPC, target: CDOTA_BaseNPC | Vector, abilityName: string, orderType: UnitOrder) => {
    const ability = caster.FindAbilityByName(abilityName) as CDOTABaseAbility

    let order: ExecuteOrderOptions = {
        UnitIndex: caster.GetEntityIndex(),
        OrderType: orderType,
        AbilityIndex: ability.GetEntityIndex(),
        Queue: true
    };

    if (typeof target === typeof CDOTA_BaseNPC) {
        if (orderType === UnitOrder.CAST_TARGET)
            order.TargetIndex = (target as CDOTA_BaseNPC).GetEntityIndex()
        else
            order.Position = (target as CDOTA_BaseNPC).GetAbsOrigin()
    } else {
        order.Position = (target as Vector)
    }

    ExecuteOrderFromTable(order)
}
