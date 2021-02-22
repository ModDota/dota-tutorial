import { findAllPlayers } from "../util"
import { step } from "./Core"

const isHeroNearby = (location: Vector, radius: number) => FindUnitsInRadius(
    DOTATeam_t.DOTA_TEAM_GOODGUYS, location, undefined, radius,
    DOTA_UNIT_TARGET_TEAM.DOTA_UNIT_TARGET_TEAM_BOTH,
    DOTA_UNIT_TARGET_TYPE.DOTA_UNIT_TARGET_BASIC | DOTA_UNIT_TARGET_TYPE.DOTA_UNIT_TARGET_HERO,
    DOTA_UNIT_TARGET_FLAGS.DOTA_UNIT_TARGET_FLAG_NONE,
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
export const spawnAndKillUnit = (unitName: string, spawnLocation: Vector) => {
    let unit: CDOTA_BaseNPC | undefined = undefined
    let checkTimer: string | undefined = undefined

    return step((context, complete) => {
        unit = CreateUnitByName(unitName, spawnLocation, true, undefined, undefined, DOTATeam_t.DOTA_TEAM_NEUTRALS)

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
        playerIds = findAllPlayers()

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
