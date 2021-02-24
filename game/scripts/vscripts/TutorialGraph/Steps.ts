import { findAllPlayersID, setUnitVisibilityThroughFogOfWar } from "../util"
import { step, TutorialContext } from "./Core"

const isHeroNearby = (location: Vector, radius: number) => FindUnitsInRadius(
    DotaTeam.BADGUYS, location, undefined, radius,
    UnitTargetTeam.BOTH,
    UnitTargetType.HERO,
    UnitTargetFlags.INVULNERABLE + UnitTargetFlags.OUT_OF_WORLD + UnitTargetFlags.MAGIC_IMMUNE_ENEMIES,
    0, false
).length > 0

/**
 * Creates a tutorial step that waits for a hero to go to a location.
 * @param location Target location
 */
export const goToLocation = (location: Vector) => {
    let checkTimer: string | undefined = undefined

    return step((context, complete) => {
        Tutorial.CreateLocationTask(location)

        // Wait until a hero is at the goal location
        const checkIsAtGoal = () => {
            if (isHeroNearby(location, 200)) {
                complete()
            } else {
                checkTimer = Timers.CreateTimer(1, () => checkIsAtGoal())
            }
        }

        checkIsAtGoal()
    }, context => {
        if (checkTimer) {
            Timers.RemoveTimer(checkTimer)
            checkTimer = undefined
        }
    })
}

/**
 * Creates a tutorial step that spawns a unit and waits until it dies.
 * @param unitName Name of the unit to spawn.
 * @param spawnLocation Location to spawn the unit at.
 */
export const spawnAndKillUnit = (unitName: string, spawnLocation: Vector, visibleThroughFog?: boolean) => {
    let unit: CDOTA_BaseNPC | undefined = undefined
    let checkTimer: string | undefined = undefined

    return step((context, complete) => {
        unit = CreateUnitByName(unitName, spawnLocation, true, undefined, undefined, DotaTeam.NEUTRALS)

        if (visibleThroughFog) {
            setUnitVisibilityThroughFogOfWar(unit, true);
        }

        // Wait until the unit dies
        const checkIsDead = () => {
            if (unit && !unit.IsAlive()) {
                complete()
            } else {
                checkTimer = Timers.CreateTimer(1, () => checkIsDead())
            }
        }

        checkIsDead()
    }, context => {
        if (checkTimer) {
            Timers.RemoveTimer(checkTimer)
            checkTimer = undefined
        }

        if (unit) {
            unit.RemoveSelf()
            unit = undefined
        }
    })
}

/**
 * Waits for an amount of time until completion
 * @param waitSeconds Time to wait before completion
 */
export const wait = (waitSeconds: number) => {
    let waitTimer: string | undefined = undefined

    return step((context, complete) => {
        waitTimer = Timers.CreateTimer(waitSeconds, () => complete())
    }, context => {
        if (waitTimer) {
            Timers.RemoveTimer(waitTimer)
            waitTimer = undefined
        }
    })
}

/**
 * Focuses the camera to a target or frees it.
 * @param target Target to focus the camera on. Can be undefined for freeing the camera.
 */
export const setCameraTarget = (target: CBaseEntity | undefined) => {
    let playerIds: PlayerID[] | undefined = undefined

    return step((context, complete) => {
        playerIds = findAllPlayersID()

        // Focus all cameras on the target
        playerIds.forEach(playerId => PlayerResource.SetCameraTarget(playerId, target))

        complete()
    }, context => {
        if (playerIds) {
            playerIds.forEach(playerId => PlayerResource.SetCameraTarget(playerId, undefined))
            playerIds = undefined
        }
    })
}

/**
 * Creates a tutorial step that waits for the hero to upgrade an ability
 * @param ability the ability that needs to be upgraded.
 */
export const upgradeAbility = (ability: CDOTABaseAbility) => {
    let checkTimer: string | undefined = undefined
    let abilityLevel = ability.GetLevel();
    let desiredLevel = ability.GetLevel() + 1;

    return step((context, complete) => {
        const checkAbilityLevel = () => {
            abilityLevel = ability.GetLevel();
            if (desiredLevel == abilityLevel) {
                complete();
            } else {
                checkTimer = Timers.CreateTimer(.1, () => checkAbilityLevel())
            }
        }
        checkAbilityLevel();
    }, context => {
        if (checkTimer) {
            Timers.RemoveTimer(checkTimer)
            checkTimer = undefined
        }
    })
}

/**
 * Waits for the player to move their camera from its initial location.
 */
export const waitForCameraMovement = () => {
    let listenerId: CustomGameEventListenerID | undefined = undefined

    return step((context, complete) => {
        listenerId = CustomGameEventManager.RegisterListener("camera_movement_detected", _ => {
            if (listenerId) {
                CustomGameEventManager.UnregisterListener(listenerId)
            }
            complete()
        })

        CustomGameEventManager.Send_ServerToAllClients("detect_camera_movement", {});
    }, context => {
        if (listenerId) {
            CustomGameEventManager.UnregisterListener(listenerId)
            listenerId = undefined
        }
    })
}

/**
 * Calls a function and completes immediately.
 * @param fn Function to call. Gets passed the context.
 */
export const immediate = (fn: (context: TutorialContext) => void) => {
    return step((context, complete) => {
        fn(context)
        complete()
    }, context => {
    })
}
