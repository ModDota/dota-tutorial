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
 * Creates a tutorial step that spawns a unit.
 * @param unitName Name of the unit to spawn.
 * @param spawnLocation Location to spawn the unit at.
 * @param team Team the unit belongs to.
 * @param entityKey Entity key for storing CBaseEntity member in the context.
 */
export const spawnUnit = (unitName: string, spawnLocation: Vector, team: DotaTeam, entityKey?: string) => {
    return step((context, complete) => {
        CreateUnitByNameAsync(unitName, spawnLocation, true, undefined, undefined, team,
            (createdUnit) => {

            if (entityKey) {
                context[entityKey] = createdUnit
            }

            complete()
        })
    })
}

/**
 * Creates a tutorial step that moves a unit.
 * @param getUnitFunc Function that returns a CDota_BaseNPC entity.
 * @param moveLocation Location to spawn the unit at.
 */
export const moveUnit = (getUnitFunc: () => CDOTA_BaseNPC, moveLocation: Vector) => {
    let unit: CDOTA_BaseNPC
    let checkTimer: string | undefined = undefined
    let delayCheckTimer: string | undefined = undefined

    return step((context, complete) => {
        unit = getUnitFunc()

        const order: ExecuteOrderOptions = {
            UnitIndex: unit.GetEntityIndex(),
            OrderType: UnitOrder.MOVE_TO_POSITION,
            Position: moveLocation,
            Queue: true
        }

        ExecuteOrderFromTable(order)
        
        const checkIsIdle = (unit: CDOTA_BaseNPC) => {
            if (unit && unit.IsIdle()) {
                complete()
            } else {
                checkTimer = Timers.CreateTimer(1, () => checkIsIdle(unit))
            }
        }

         delayCheckTimer = Timers.CreateTimer(0.1, () => checkIsIdle(unit))
    },
    context => {
        if (checkTimer) {
            Timers.RemoveTimer(checkTimer)
            checkTimer = undefined
        }
        if (delayCheckTimer) {
            Timers.RemoveTimer(delayCheckTimer)
            delayCheckTimer = undefined
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
 * Creates a tutorial step that sets a unit's movement capability.
 * @param getUnitFunc Function that returns a CDOTA_BaseNPC type.
 * @param unitMoveCap UnitMoveCapability enum for setting move capability.
 */
export const setUnitMoveCapability = (getUnitFunc: () => CDOTA_BaseNPC, unitMoveCap: UnitMoveCapability) => {
    return step((context, complete) => {
        getUnitFunc().SetMoveCapability(unitMoveCap)
        complete()
    })
}

/**
 * Creates a tutorial step that changes a unit's face direction.
 * @param getUnitFunc Function that returns a CDota_BaseNPC entity.
 * @param faceTowards Point to face towards.
 */
export const faceTowards = (getUnitFunc: () => CDOTA_BaseNPC, faceTowards: Vector) => {
    return step((context, complete) => {
        getUnitFunc().FaceTowards(faceTowards)
        complete()
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
export const setCameraTarget = (entityReturnFunc: () => CBaseEntity | undefined) => {
    let playerIds: PlayerID[] | undefined = undefined
    
    return step((context, complete) => {
        playerIds = findAllPlayersID()
        // Focus all cameras on the target
        playerIds.forEach(playerId => PlayerResource.SetCameraTarget(playerId, entityReturnFunc()))

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
    const desiredLevel = ability.GetLevel() + 1;

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
                listenerId = undefined
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
 * @param stopFn Optional function to call on stop. Gets passed the context.
 */
export const immediate = (fn: (context: TutorialContext) => void, stopFn?: (context: TutorialContext) => void) => {
    return step((context, complete) => {
        fn(context)
        complete()
    }, context => {
        if (stopFn) {
            stopFn(context)
        }
    })
}

/**
 * Plays a global sound and optionally waits for its completion.
 * @param soundName Name of the sound
 * @param waitForCompletion Whether to wait for the sound to complete or not. Default is false.
 * @param extraDelaySeconds Extra delay to add to the wait time if true was passed for waitForCompletion. Defaults to 0.5s.
 */
export const playGlobalSound = (soundName: string, waitForCompletion?: boolean, extraDelaySeconds?: number) => {
    const defaultExtraDelaySeconds = 0.5
    let waitTimer: string | undefined = undefined

    return step((context, complete) => {
        EmitGlobalSound(soundName)

        if (waitForCompletion) {
            // Get any entity so we can get the duration of the sound (not sure why that's needed)
            const anyEntity = Entities.Next(undefined)
            if (!anyEntity) {
                error("Could not find any entity to get duration of sound")
            }

            const soundDuration = anyEntity.GetSoundDuration(soundName, "") + (extraDelaySeconds !== undefined ? extraDelaySeconds : defaultExtraDelaySeconds)

            waitTimer = Timers.CreateTimer(soundDuration, () => complete())
        } else {
            complete()
        }
    }, context => {
        if (waitTimer) {
            Timers.RemoveTimer(waitTimer)
            waitTimer = undefined
        }
    })
}

export const completeOnCheck = (checkFn: (context: TutorialContext) => boolean, checkPeriodSeconds: number) => {
    let checkTimer: string | undefined = undefined

    return step((context, complete) => {
        // Wait until the check is true
        const check = () => {
            if (checkFn(context)) {
                complete()
            } else {
                checkTimer = Timers.CreateTimer(checkPeriodSeconds, () => check())
            }
        }

        check()
    }, context => {
        if (checkTimer) {
            Timers.RemoveTimer(checkTimer)
            checkTimer = undefined
        }
    })
}
