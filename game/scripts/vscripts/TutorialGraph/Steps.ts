import { createDummy, findAllPlayersID, getPlayerHero, getSoundDuration, setGoalsUI, setUnitVisibilityThroughFogOfWar } from "../util"
import * as dg from "../Dialog"
import * as tg from "./Core"

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
export const goToLocation = (location: tg.StepArgument<Vector>) => {
    let checkTimer: string | undefined = undefined

    return tg.step((context, complete) => {
        const actualLocation = tg.getArg(location, context)

        MinimapEvent(DotaTeam.GOODGUYS, getPlayerHero() as CBaseEntity, actualLocation.x, actualLocation.y, MinimapEventType.TUTORIAL_TASK_ACTIVE, 1);

        // Wait until a hero is at the goal location
        const checkIsAtGoal = () => {

            if (isHeroNearby(actualLocation, 200)) {
                MinimapEvent(DotaTeam.GOODGUYS, getPlayerHero() as CBaseEntity, actualLocation.x, actualLocation.y, MinimapEventType.TUTORIAL_TASK_FINISHED, 0.1);
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
 * @param removeOnStop Whether to remove the unit when stop is called on this step. Also removes the key from context if the entry is still the unit.
 */
export const spawnUnit = (unitName: tg.StepArgument<string>, spawnLocation: tg.StepArgument<Vector>, team: tg.StepArgument<DotaTeam>, entityKey?: tg.StepArgument<string>, removeOnStop?: boolean) => {
    let unit: CDOTA_BaseNPC | undefined = undefined
    let actualEntityKey: string | undefined = undefined

    return tg.step((context, complete) => {
        const actualUnitName = tg.getArg(unitName, context)
        const actualSpawnLocation = tg.getArg(spawnLocation, context)
        const actualTeam = tg.getArg(team, context)
        actualEntityKey = tg.getOptionalArg(entityKey, context)

        CreateUnitByNameAsync(actualUnitName, actualSpawnLocation, true, undefined, undefined, actualTeam,
            createdUnit => {
                if (actualEntityKey) {
                    context[actualEntityKey] = createdUnit
                }

                unit = createdUnit

                complete()
            }
        )
    }, context => {
        if (removeOnStop && unit) {
            if (actualEntityKey && context[actualEntityKey] === unit) {
                context[actualEntityKey] = undefined
            }

            if (IsValidEntity(unit)) {
                unit.RemoveSelf()
            }

            unit = undefined
        }
    })
}

/**
 * Creates a tutorial step that moves a unit.
 * @param unit The unit to move.
 * @param moveLocation Location to move the unit to.
 */
export const moveUnit = (unit: tg.StepArgument<CDOTA_BaseNPC>, moveLocation: tg.StepArgument<Vector>) => {
    let checkTimer: string | undefined = undefined
    let delayCheckTimer: string | undefined = undefined

    return tg.step((context, complete) => {
        const actualUnit = tg.getArg(unit, context)
        const actualMoveLocation = tg.getArg(moveLocation, context)

        const order: ExecuteOrderOptions = {
            UnitIndex: actualUnit.GetEntityIndex(),
            OrderType: UnitOrder.MOVE_TO_POSITION,
            Position: actualMoveLocation,
            Queue: true
        }

        ExecuteOrderFromTable(order)

        const checkIsIdle = () => {
            if (actualUnit && actualUnit.IsIdle()) {
                complete()
            } else {
                checkTimer = Timers.CreateTimer(0.1, () => checkIsIdle())
            }
        }

        delayCheckTimer = Timers.CreateTimer(0.1, () => checkIsIdle())
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
export const spawnAndKillUnit = (unitName: tg.StepArgument<string>, spawnLocation: tg.StepArgument<Vector>, visibleThroughFog?: tg.StepArgument<boolean>) => {
    let unit: CDOTA_BaseNPC | undefined = undefined
    let checkTimer: string | undefined = undefined

    return tg.step((context, complete) => {
        const actualUnitName = tg.getArg(unitName, context)
        const actualSpawnLocation = tg.getArg(spawnLocation, context)
        const actualVisibleThroughFog = tg.getOptionalArg(visibleThroughFog, context)

        unit = CreateUnitByName(actualUnitName, actualSpawnLocation, true, undefined, undefined, DotaTeam.NEUTRALS)

        if (actualVisibleThroughFog) {
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
            if (IsValidEntity(unit)) {
                unit.RemoveSelf()
            }

            unit = undefined
        }
    })
}

/**
 * Creates a tutorial step that changes a unit's face direction.
 * @param getUnitFunc Function that returns a CDota_BaseNPC entity.
 * @param faceTowards Point to face towards.
 */
export const faceTowards = (unit: tg.StepArgument<CDOTA_BaseNPC>, faceTowards: tg.StepArgument<Vector>) => {
    return tg.step((context, complete) => {
        const actualUnit = tg.getArg(unit, context)
        const actualFaceTowards = tg.getArg(faceTowards, context)

        actualUnit.FaceTowards(actualFaceTowards)
        complete()
    })
}

/**
 * Waits for an amount of time until completion
 * @param waitSeconds Time to wait before completion
 */
export const wait = (waitSeconds: tg.StepArgument<number>) => {
    let waitTimer: string | undefined = undefined

    return tg.step((context, complete) => {
        const actualWaitSeconds = tg.getArg(waitSeconds, context)
        waitTimer = Timers.CreateTimer(actualWaitSeconds, () => complete())
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
export const setCameraTarget = (target: tg.StepArgument<CBaseEntity | undefined>) => {
    let playerIds: PlayerID[] | undefined = undefined
    return tg.step((context, complete) => {
        const actualTarget = tg.getArg(target, context)

        playerIds = findAllPlayersID()
        // Focus all cameras on the target
        playerIds.forEach(playerId => PlayerResource.SetCameraTarget(playerId, actualTarget))

        complete()
    }, context => {
        if (playerIds) {
            playerIds.forEach(playerId => PlayerResource.SetCameraTarget(playerId, undefined))
            playerIds = undefined
        }
    })
}

/**
 * Moves the camera to a unit, with lerp
 * @param target Unit to move the camera to.
 * @param lerp Speed at which the camera moves
 */
export const moveCameraToUnit = (target: CBaseEntity, lerp: number) => {
    let playerIds = findAllPlayersID();

    playerIds.forEach(playerId => {
        let player = PlayerResource.GetPlayer(playerId);

        if (player) {
            CustomGameEventManager.Send_ServerToPlayer(player, "move_camera", {
                unitTargetEntIndex: target.GetEntityIndex(),
                lerp: lerp
            })
        }
    })
}

/**
 * Moves the camera to a position, with lerp
 * @param position Point to move the camera to.
 * @param lerp Speed at which the camera moves
 */
export const moveCameraToPosition = (position: Vector, lerp: number) => {
    let playerIds = findAllPlayersID();

    playerIds.forEach(playerId => {
        let player = PlayerResource.GetPlayer(playerId);
        if (player) {
            CustomGameEventManager.Send_ServerToPlayer(player, "move_camera", {
                cameraTargetX: position.x,
                cameraTargetY: position.y,
                cameraTargetZ: position.z,
                lerp: lerp
            })
        }
    })
}

/**
 * Pans the camera from the start location to the end location with the speed at each timestep calculated using a given function.
 * @param startLocation Start location for the pan.
 * @param endLocation End location for the pan.
 * @param getSpeed Function that returns the speed in units per second to move given the start, end and current location.
 */
export const panCamera = (startLocation: tg.StepArgument<Vector>, endLocation: tg.StepArgument<Vector>, getSpeed: (startLocation: Vector, endLocation: Vector, location: Vector) => number) => {
    let cameraTimer: string | undefined = undefined
    let playerIds: PlayerID[] | undefined = undefined
    let cameraDummy: CDOTA_BaseNPC | undefined = undefined

    const cleanup = () => {
        if (cameraTimer) {
            Timers.RemoveTimer(cameraTimer)
            cameraTimer = undefined
        }

        if (playerIds) {
            playerIds.forEach(playerId => PlayerResource.SetCameraTarget(playerId, undefined))
            playerIds = undefined
        }

        if (cameraDummy) {
            if (IsValidEntity(cameraDummy)) {
                cameraDummy.RemoveSelf()
            }
            cameraDummy = undefined
        }
    }

    return tg.step((context, complete) => {
        const updateInterval = FrameTime()
        const actualStartLocation = tg.getArg(startLocation, context)
        const actualEndLocation = tg.getArg(endLocation, context)
        cameraDummy = createDummy(actualStartLocation)

        // Focus all cameras on the dummy
        playerIds = findAllPlayersID()
        playerIds.forEach(playerId => PlayerResource.SetCameraTarget(playerId, cameraDummy))

        // Order the dummy to move to the target location. Periodically update the speed using the passed function.
        const updateDummy = () => {
            if (!cameraDummy || !IsValidEntity(cameraDummy)) {
                error("Camera dummy was invalid")
            }

            const currentLocation = cameraDummy.GetAbsOrigin()
            const distance = actualEndLocation.__sub(currentLocation).Length2D()

            // Stop when we are close enough.
            if (distance > 10) {
                // Query the speed for the current location.
                const speed = getSpeed(actualStartLocation, actualEndLocation, currentLocation)

                // Order the dummy to move to the target location and update its speed.
                cameraDummy.SetBaseMoveSpeed(speed)
                cameraDummy.MoveToPosition(actualEndLocation)

                cameraTimer = Timers.CreateTimer(updateInterval, () => updateDummy())
            } else {
                cameraDummy.SetAbsOrigin(actualEndLocation)
                cleanup()
                complete()
            }
        }

        updateDummy()
    }, context => {
        cleanup()
    })
}

/**
 * Pans the camera from the start location to the end location exponentially (ie. starting out faster and getting slower the closer we are to the target).
 * @param startLocation Start location for the pan.
 * @param endLocation End location for the pan.
 * @param alpha Value that should be between 0 and 1. Values towards 0 are slower and towards 1 are faster.
 */
export const panCameraExponential = (startLocation: tg.StepArgument<Vector>, endLocation: tg.StepArgument<Vector>, alpha: number) => {
    return panCamera(startLocation, endLocation, (startLoc, endLoc, loc) => {
        // Speed proportional to the remaining distance.
        const remainingDistance = endLoc.__sub(loc).Length2D()
        return alpha * remainingDistance
    })
}

/**
 * Pans the camera from the start location to the end location linearly (ie. with constant speed) over a given duration.
 * @param startLocation Start location for the pan.
 * @param endLocation End location for the pan.
 * @param duration How long the pan should last.
 */
export const panCameraLinear = (startLocation: tg.StepArgument<Vector>, endLocation: tg.StepArgument<Vector>, duration: number) => {
    return panCamera(startLocation, endLocation, (startLoc, endLoc, loc) => {
        // Constant speed (speed = distance / duration).
        return endLoc.__sub(startLoc).Length2D() / duration
    })
}

/**
 * Creates a tutorial step that waits for the hero to upgrade an ability
 * @param ability the ability that needs to be upgraded.
 */
export const upgradeAbility = (ability: tg.StepArgument<CDOTABaseAbility>) => {
    let checkTimer: string | undefined = undefined

    return tg.step((context, complete) => {
        const actualAbility = tg.getArg(ability, context);
        const desiredLevel = actualAbility.GetLevel() + 1;
        actualAbility.SetUpgradeRecommended(true);
        const checkAbilityLevel = () => {
            if (desiredLevel == actualAbility.GetLevel()) {
                actualAbility.SetUpgradeRecommended(false);
                complete();
            } else {
                checkTimer = Timers.CreateTimer(.1, () => checkAbilityLevel())
            }
        }
        checkAbilityLevel();
    }, context => {
        if (checkTimer) {
            const actualAbility = tg.getArg(ability, context);
            Timers.RemoveTimer(checkTimer)
            actualAbility.SetUpgradeRecommended(false);
            checkTimer = undefined
        }
    })
}

/**
 * Waits for the player to move their camera from its initial location.
 */
export const waitForCameraMovement = () => {
    let listenerId: CustomGameEventListenerID | undefined = undefined

    return tg.step((context, complete) => {
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
 * Waits for a command to be executed. See panorama's DOTAKeybindCommand_t for the commands. Overrides the default behavior for the command so this can only be used if we merely want to detect the hotkey.
 * @param command Command to wait for. See DOTAKeybindCommand_t.
 */
export const waitForCommand = (command: number) => {
    let listenerId: CustomGameEventListenerID | undefined = undefined

    return tg.step((context, complete) => {
        listenerId = CustomGameEventManager.RegisterListener("command_detected", (source, event) => {
            if (event.command === command) {
                if (listenerId) {
                    CustomGameEventManager.UnregisterListener(listenerId)
                    listenerId = undefined
                }

                complete()
            }
        })

        CustomGameEventManager.Send_ServerToAllClients("detect_command", { command });
    }, context => {
        if (listenerId) {
            CustomGameEventManager.UnregisterListener(listenerId)
            listenerId = undefined
        }
    })
}

/**
 * Waits until a modifier key was held down.
 * @param key Modifier key to wait for.
 */
export const waitForModifierKey = (key: ModifierKey) => {
    let listenerId: CustomGameEventListenerID | undefined = undefined

    return tg.step((context, complete) => {
        listenerId = CustomGameEventManager.RegisterListener("modifier_key_detected", (source, event) => {
            if (event.key === key) {
                if (listenerId) {
                    CustomGameEventManager.UnregisterListener(listenerId)
                    listenerId = undefined
                }

                complete()
            }
        })

        CustomGameEventManager.Send_ServerToAllClients("detect_modifier_key", { key });
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
export const immediate = (fn: (context: tg.TutorialContext) => void, stopFn?: (context: tg.TutorialContext) => void) => {
    return tg.step((context, complete) => {
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
export const playGlobalSound = (soundName: tg.StepArgument<string>, waitForCompletion?: tg.StepArgument<boolean>, extraDelaySeconds?: tg.StepArgument<number>) => {
    const defaultExtraDelaySeconds = 0.5
    let waitTimer: string | undefined = undefined

    return tg.step((context, complete) => {
        const actualSoundName = tg.getArg(soundName, context)
        const actualWaitForCompletion = tg.getOptionalArg(waitForCompletion, context)
        const actualExtraDelaySeconds = tg.getOptionalArg(extraDelaySeconds, context)

        EmitGlobalSound(actualSoundName)

        if (actualWaitForCompletion) {
            const soundDuration = getSoundDuration(actualSoundName) + (actualExtraDelaySeconds !== undefined ? actualExtraDelaySeconds : defaultExtraDelaySeconds)

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

export const completeOnCheck = (checkFn: (context: tg.TutorialContext) => boolean, checkPeriodSeconds: tg.StepArgument<number>) => {
    let checkTimer: string | undefined = undefined

    return tg.step((context, complete) => {
        const actualCheckPeriodSeconds = tg.getArg(checkPeriodSeconds, context)

        // Wait until the check is true
        const check = () => {
            if (checkFn(context)) {
                complete()
            } else {
                checkTimer = Timers.CreateTimer(actualCheckPeriodSeconds, () => check())
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

/**
 * Updates the goal UI periodically using the given function returning goals. Never completes and should be used together with forkAny().
 * @param getGoals Goals or function returning goals that gets called periodically to display in the UI.
 */
export const trackGoals = (goals: tg.StepArgument<Goal[]>) => {
    let timer: string | undefined = undefined

    return tg.step((context, complete) => {
        const track = () => {
            const actualGoals = tg.getArg(goals, context)
            setGoalsUI(actualGoals)

            timer = Timers.CreateTimer(0.5, () => track())
        }

        track()
    }, context => {
        if (timer) {
            Timers.RemoveTimer(timer)
            timer = undefined
        }

        setGoalsUI([])
    })
}

/**
 * Creates a step that tracks goals at the same time as executing a given step. Completes when the given step was completed.
 * @param goals Goals to track.
 * @param step Step to execute.
 */
export const withGoals = (goals: tg.StepArgument<Goal[]>, step: tg.TutorialStep) => {
    let timer: string | undefined = undefined

    return tg.step((context, complete) => {
        const track = () => {
            const actualGoals = tg.getArg(goals, context)
            setGoalsUI(actualGoals)

            timer = Timers.CreateTimer(0.5, () => track())
        }

        track()

        step.start(context, () => {
            if (timer) {
                Timers.RemoveTimer(timer)
                timer = undefined
            }

            complete()
        })
    }, context => {
        if (timer) {
            Timers.RemoveTimer(timer)
            timer = undefined
        }

        setGoalsUI([])

        step.stop(context)
    })
}

/**
 * Plays a dialog with sound and text and waits for the sound to finish before completing.
 * @param soundName Name of the sound
 * @param text Text to display during the dialog
 * @param unit Unit that is talking
 * @param extraDelaySeconds Extra delay to add to the wait time. Defaults to 0.5s.
 */
export const audioDialog = (soundName: tg.StepArgument<string>, text: tg.StepArgument<string>, unit: tg.StepArgument<CDOTA_BaseNPC>, extraDelaySeconds?: tg.StepArgument<number>) => {
    const defaultExtraDelaySeconds = 0.5
    let waitTimer: string | undefined = undefined

    return tg.step((context, complete) => {
        const actualSoundName = tg.getArg(soundName, context)
        const actualUnit = tg.getArg(unit, context)
        const actualText = tg.getArg(text, context)
        const actualExtraDelaySeconds = tg.getOptionalArg(extraDelaySeconds, context)

        const duration = dg.playAudio(actualSoundName, actualText, actualUnit, actualExtraDelaySeconds === undefined ? defaultExtraDelaySeconds : 0.5)

        waitTimer = Timers.CreateTimer(duration, () => complete())
    }, context => {
        if (waitTimer) {
            Timers.RemoveTimer(waitTimer)
            waitTimer = undefined
        }
    })
}

/**
 * Plays a text-only dialog and waits for a passed amount of time to finish before completing.
 * @param text Text to display during the dialog
 * @param unit Unit that is talking
 * @param waitSeconds Time to wait for in seconds.
 */
export const textDialog = (text: tg.StepArgument<string>, unit: tg.StepArgument<CDOTA_BaseNPC>, waitSeconds: tg.StepArgument<number>) => {
    let waitTimer: string | undefined = undefined
    let actualUnit: CDOTA_BaseNPC | undefined = undefined

    return tg.step((context, complete) => {
        actualUnit = tg.getArg(unit, context)
        const actualText = tg.getArg(text, context)
        const actualWaitSeconds = tg.getArg(waitSeconds, context)

        dg.playText(actualText, actualUnit, actualWaitSeconds)

        waitTimer = Timers.CreateTimer(actualWaitSeconds, () => {
            waitTimer = undefined
            actualUnit = undefined
            complete()
        })
    }, context => {
        if (waitTimer) {
            Timers.RemoveTimer(waitTimer)
            waitTimer = undefined
        }

        if (actualUnit) {
            dg.stop(actualUnit)
            actualUnit = undefined
        }
    })
}

/**
 * Step which never completes. Useful in conjunction with forkAny() to prevent one of the branches from completing.
 */
export const neverComplete = () => {
    return tg.step(_ => { })
}

/**
 * Creates a particle system at a location and optionally destroys it and complets after a given time. If no duration is passed it will never complete.
 * @param particleName Name of the particle system.
 * @param location Location to spawn the particles at.
 * @param duration Optional duration after which to destroy the particles and complete.
 */
export const createParticleAtLocation = (particleName: tg.StepArgument<string>, location: tg.StepArgument<Vector>, duration?: tg.StepArgument<number>) => {
    let timer: string | undefined = undefined
    let particle: ParticleID | undefined = undefined

    return tg.step((context, complete) => {
        const actualParticleName = tg.getArg(particleName, context)
        const actualLocation = tg.getArg(location, context)
        const actualDuration = tg.getOptionalArg(duration, context)

        if (particle) {
            ParticleManager.DestroyParticle(particle, true)
        }

        particle = ParticleManager.CreateParticle(actualParticleName, ParticleAttachment.CUSTOMORIGIN, undefined)
        ParticleManager.SetParticleControl(particle, 1, actualLocation)

        if (actualDuration !== undefined) {
            timer = Timers.CreateTimer(actualDuration, () => {
                if (particle) {
                    ParticleManager.DestroyParticle(particle, false)
                    particle = undefined
                }

                complete()
            })
        }
    }, context => {
        if (timer) {
            Timers.RemoveTimer(timer)
            timer = undefined
        }

        if (particle) {
            ParticleManager.DestroyParticle(particle, false)
            particle = undefined
        }
    })
}

/**
 * Creates a particle system attached to a unit and optionally destroys it and complets after a given time. If no duration is passed it will never complete.
 * @param particleName Name of the particle system.
 * @param unit Unit to attach the particles to.
 * @param duration Optional duration after which to destroy the particles and complete.
 */
export const createParticleAttachedToUnit = (particleName: tg.StepArgument<string>, unit: tg.StepArgument<CDOTA_BaseNPC>, duration?: tg.StepArgument<number>) => {
    let timer: string | undefined = undefined
    let particle: ParticleID | undefined = undefined

    return tg.step((context, complete) => {
        const actualParticleName = tg.getArg(particleName, context)
        const actualUnit = tg.getArg(unit, context)
        const actualDuration = tg.getOptionalArg(duration, context)

        if (particle) {
            ParticleManager.DestroyParticle(particle, true)
        }

        particle = ParticleManager.CreateParticle(actualParticleName, ParticleAttachment.ABSORIGIN_FOLLOW, actualUnit)

        if (actualDuration !== undefined) {
            timer = Timers.CreateTimer(actualDuration, () => {
                if (particle) {
                    ParticleManager.DestroyParticle(particle, false)
                    particle = undefined
                }

                complete()
            })
        }
    }, context => {
        if (timer) {
            Timers.RemoveTimer(timer)
            timer = undefined
        }

        if (particle) {
            ParticleManager.DestroyParticle(particle, false)
            particle = undefined
        }
    })
}
