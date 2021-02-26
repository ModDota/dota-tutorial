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

export function setUnitPacifist(unit: CDOTA_BaseNPC, isPacifist: boolean, duration?: number)
{
    if (isPacifist) {
        unit.AddNewModifier(undefined, undefined, "modifier_tutorial_pacifist", {duration: duration});
    }
    else {
        unit.RemoveModifierByName("modifier_tutorial_pacifist");
    }
}

/**
 * Moves the camera to a unit's position. The player can't control the camera
 * while it is being moved.
 * @param target Unit to move the camera to.
 * @param duration Time in seconds it takes to move the camera
 */
export const moveCameraToUnit = (target: CBaseEntity, duration: number) => {
    let playerId = findRealPlayerID();
    let player = PlayerResource.GetPlayer(playerId);
  
    if (player) {
        CustomGameEventManager.Send_ServerToPlayer(player, "move_camera", {
            unitTargetEntIndex: target.GetEntityIndex(),
            lerp: duration
        });
    }
  }
  
  /**
  * Moves the camera to a position. The player can't control the camera
  * while it is being moved.
  * @param position Point to move the camera to.
  * @param duration Time in seconds it takes to move the camera
  */
  export const moveCameraToPosition = (position: Vector, duration: number) => {
    let playerId = findRealPlayerID();
    let player = PlayerResource.GetPlayer(playerId);
    
    if (player) {
        CustomGameEventManager.Send_ServerToPlayer(player, "move_camera", {
            cameraTargetX: position.x,
            cameraTargetY: position.y,
            cameraTargetZ: position.z,
            lerp: duration
        });
    }
  }