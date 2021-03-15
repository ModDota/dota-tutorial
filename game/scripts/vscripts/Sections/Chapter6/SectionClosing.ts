import * as tut from "../../Tutorial/Core"
import * as tg from "../../TutorialGraph/index"
import * as dg from "../../Dialog"
import { RequiredState } from "../../Tutorial/RequiredState"
import { GoalTracker } from "../../Goals"
import { centerCameraOnHero, getOrError, getPlayerHero, unitIsValidAndAlive } from "../../util"

const sectionName: SectionName = SectionName.Chapter6_Closing

let graph: tg.TutorialStep | undefined = undefined

const requiredState: RequiredState = {
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    slacksLocation: Vector(-6980, -6000, 384),
    sunsFanLocation: Vector(-6250, -5950, 256),

    heroLocation: Vector(-6850, -6500, 384),
    heroLocationTolerance: 2000,
    heroLevel: 25,
    heroAbilityMinLevels: [4, 4, 4, 3],
    heroItems: {
        "item_greater_crit": 1,
        "item_assault": 1,
        "item_power_treads": 1,
        "item_heart": 1,
        "item_aegis": 1,
    },
}

class ClosingNpc {
    private _unit: CDOTA_BaseNPC | undefined

    private spawned = false

    private interactDistance = 200
    private interacting = false
    private dialogToken: DialogToken | undefined

    constructor(public readonly name: string, public readonly location: Vector, readonly text: string, readonly soundName: string) {

    }

    public get playing() {
        return this.dialogToken !== undefined
    }

    public get unit() {
        return this._unit
    }

    spawn() {
        this.spawned = true

        CreateUnitByNameAsync(this.name, this.location, true, undefined, undefined, DotaTeam.GOODGUYS, unit => {
            this._unit = unit

            // destroy() could have been called before this callback was called
            if (!this.spawned) {
                if (unitIsValidAndAlive(this._unit)) {
                    this._unit.RemoveSelf()
                }

                this._unit = undefined
            }
        })
    }

    destroy() {
        this.spawned = false

        if (this._unit) {
            if (unitIsValidAndAlive(this._unit)) {
                this._unit.RemoveSelf()
            }

            this._unit = undefined
        }
    }

    update() {
        if (this.spawned && this.unit && unitIsValidAndAlive(this.unit)) {
            const hero = getOrError(getPlayerHero(), "Can not get player hero")

            const distance = hero.GetAbsOrigin().__sub(this.location).Length2D()

            if (this.interacting) {
                // Player leaves
                if (distance > this.interactDistance) {
                    // Stop dialog if it was still in progress
                    this.interacting = false
                    if (this.dialogToken !== undefined) {
                        dg.stop(this.dialogToken)
                        this.dialogToken = undefined
                    }
                }
            } else {
                // Player enters
                if (distance <= this.interactDistance) {
                    // Play dialog
                    this.interacting = true
                    this.dialogToken = dg.playAudio(this.soundName, this.text, this.unit, undefined, () => this.dialogToken = undefined)
                }
            }
        }
    }
}

const npcs = [
    new ClosingNpc(CustomNpcKeys.PurgePugna, Vector(-7250, -6500, 384), LocalizationKey.Script_6_Purge, LocalizationKey.Script_6_Purge),
    new ClosingNpc(CustomNpcKeys.GodzMudGolem, Vector(-7250, -6800, 384), LocalizationKey.Script_6_Opening_9, LocalizationKey.Script_6_Opening_9),
]

const spawnNpcs = () => npcs.forEach(npc => npc.spawn())
const waitNpcsSpawned = () => tg.completeOnCheck(_ => npcs.every(npc => npc.unit !== undefined), 0.1)
const clearNpcs = () => npcs.forEach(npc => npc.destroy())

function onStart(complete: () => void) {
    print("Starting", sectionName)

    const goalTracker = new GoalTracker()

    const playerHero = getOrError(getPlayerHero(), "Can not get player hero")

    const slacks = (GameRules.Addon.context[CustomNpcKeys.SlacksMudGolem] as CDOTA_BaseNPC)
    const sunsFan = (GameRules.Addon.context[CustomNpcKeys.SunsFanMudGolem] as CDOTA_BaseNPC)

    // Make Slacks and SUNSfan invisible at the start until we fade back in
    slacks.AddNoDraw()
    sunsFan.AddNoDraw()

    graph = tg.withGoals(_ => goalTracker.getGoals(), tg.seq([
        // Fade to black and wait some time until the clients are hopefully faded out.
        tg.immediate(_ => CustomGameEventManager.Send_ServerToAllClients("fade_screen", {})),
        tg.wait(1.5),

        // Spawn our NPCs and make Slacks and SUNSfan visible again
        tg.immediate(_ => spawnNpcs()),
        tg.immediate(_ => slacks.RemoveNoDraw()),
        tg.immediate(_ => sunsFan.RemoveNoDraw()),
        tg.immediate(_ => centerCameraOnHero()),

        // Wait to fade back in
        tg.wait(2),

        // Hopefully every npc will be spawned by now and this completes immediately
        waitNpcsSpawned(),

        // Main logic
        tg.fork([
            // Play dialog
            tg.seq([
                tg.audioDialog(LocalizationKey.Script_6_Closing_1, LocalizationKey.Script_6_Closing_1, slacks),
                tg.audioDialog(LocalizationKey.Script_6_Closing_2, LocalizationKey.Script_6_Closing_2, sunsFan),
                tg.audioDialog(LocalizationKey.Script_6_Closing_3, LocalizationKey.Script_6_Closing_3, slacks),
                tg.audioDialog(LocalizationKey.Script_6_Closing_4, LocalizationKey.Script_6_Closing_4, sunsFan),
            ]),

            tg.loop(true, tg.seq([
                tg.immediate(_ => npcs.forEach(npc => npc.update())),
                tg.wait(0.1),
            ])),

            // Make everyone stare at you, little bit creepy
            tg.loop(true, tg.seq([
                tg.completeOnCheck(_ => playerHero.IsIdle(), 0.1),
                tg.immediate(_ => npcs.forEach(npc => npc.unit!.FaceTowards(playerHero.GetAbsOrigin()))),
                tg.wait(0.1),
            ])),
        ]),

        // Should never happen currently
        tg.immediate(_ => clearNpcs()),
    ]))

    graph.start(GameRules.Addon.context, () => {
        print("Completed", sectionName)
        complete()
    })
}

function onStop() {
    print("Stopping", sectionName)

    if (graph) {
        graph.stop(GameRules.Addon.context)
        graph = undefined
    }

    const slacks = (GameRules.Addon.context[CustomNpcKeys.SlacksMudGolem] as CDOTA_BaseNPC)
    const sunsFan = (GameRules.Addon.context[CustomNpcKeys.SunsFanMudGolem] as CDOTA_BaseNPC)

    slacks.RemoveNoDraw()
    sunsFan.RemoveNoDraw()

    clearNpcs()
}

export const sectionClosing = new tut.FunctionalSection(
    sectionName,
    requiredState,
    onStart,
    onStop
)
