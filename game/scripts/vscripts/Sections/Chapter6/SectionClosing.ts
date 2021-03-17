import * as tut from "../../Tutorial/Core"
import * as tg from "../../TutorialGraph/index"
import * as dg from "../../Dialog"
import { RequiredState } from "../../Tutorial/RequiredState"
import { GoalTracker } from "../../Goals"
import { centerCameraOnHero, getOrError, getPlayerHero, unitIsValidAndAlive } from "../../util"
import { modifier_closing_npc } from "../../modifiers/modifier_closing_npc"

const sectionName: SectionName = SectionName.Chapter6_Closing

let graph: tg.TutorialStep | undefined = undefined

const requiredState: RequiredState = {
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    slacksLocation: Vector(-6100, -5700, 256),
    sunsFanLocation: Vector(-5900, -5750, 256),

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
    topDireT1TowerStanding: false,
    topDireT2TowerStanding: false
}

const INTERACTION_DISTANCE = 200;

class ClosingNpc {
    private _unit: CDOTA_BaseNPC | undefined

    private spawned = false

    private dialogToken: DialogToken | undefined

    constructor(public readonly name: string, public readonly location: Vector, readonly text: string, readonly soundName?: string) {

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
            unit.AddNewModifier(unit, undefined, modifier_closing_npc.name, {})

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

    interact() {
        if (this.spawned && this.unit && unitIsValidAndAlive(this.unit)) {
            // Play dialog
            if (this.soundName) {
                this.dialogToken = dg.playAudio(this.soundName, this.text, this.unit, undefined, () => this.dialogToken = undefined)
            } else {
                this.dialogToken = dg.playText(this.text, this.unit, 5, () => this.dialogToken = undefined)
            }
        }
    }
}

const npcs = [
    // TODO: Pass in the actual text and sound keys once we have them

    // Personalities / Guides
    new ClosingNpc(CustomNpcKeys.PurgePugna, Vector(-7250, -6400, 384), LocalizationKey.Script_6_Purge, LocalizationKey.Script_6_Purge),
    new ClosingNpc(CustomNpcKeys.GodzMudGolem, Vector(-7200, -6750, 384), LocalizationKey.Script_6_Opening_9, LocalizationKey.Script_6_Opening_9),
    new ClosingNpc(CustomNpcKeys.DotaU, Vector(-6900, -7050, 384), LocalizationKey.Script_6_DotaU, LocalizationKey.Script_6_DotaU),
    new ClosingNpc(CustomNpcKeys.Liquipedia, Vector(-6650, -6900, 384), LocalizationKey.Script_6_Liquipedia, LocalizationKey.Script_6_Liquipedia),

    // Modders
    new ClosingNpc(CustomNpcKeys.Flam3s, Vector(-5850, -4400, 256), LocalizationKey.Script_6_Flam3s),
    new ClosingNpc(CustomNpcKeys.Perry, Vector(-7050, -4700, 256), LocalizationKey.Script_6_Perry),
    new ClosingNpc(CustomNpcKeys.PongPing, Vector(-6750, -4400, 256), LocalizationKey.Script_6_PongPing),
    new ClosingNpc(CustomNpcKeys.Shush, Vector(-6450, -4400, 256), LocalizationKey.Script_6_Shush),
    new ClosingNpc(CustomNpcKeys.SinZ, Vector(-6150, -4400, 256), LocalizationKey.Script_6_SinZ),
    new ClosingNpc(CustomNpcKeys.SmashTheState, Vector(-5850, -4700, 256), LocalizationKey.Script_6_SmashTheState),
    new ClosingNpc(CustomNpcKeys.Tora, Vector(-5850, -5000, 256), LocalizationKey.Script_6_Tora),
    new ClosingNpc(CustomNpcKeys.Toyoka, Vector(-7050, -5000, 256), LocalizationKey.Script_6_Toyoka),
    new ClosingNpc(CustomNpcKeys.VicFrank, Vector(-7050, -5300, 256), LocalizationKey.Script_6_VicFrank),
    new ClosingNpc(CustomNpcKeys.Yoyo, Vector(-7050, -5600, 256), LocalizationKey.Script_6_Yoyo),

    // Helpers
    new ClosingNpc(CustomNpcKeys.ValkyrjaRuby, Vector(-6250, -5500, 256), LocalizationKey.Script_6_valkyrjaRuby),
]

const spawnNpcs = () => npcs.forEach(npc => npc.spawn())
const waitNpcsSpawned = () => tg.completeOnCheck(_ => npcs.every(npc => npc.unit !== undefined), 0.1)
const clearNpcs = () => npcs.forEach(npc => npc.destroy())

let sectionTimer: string;

function onStart(complete: () => void) {
    print("Starting", sectionName)

    const goalTracker = new GoalTracker()

    const playerHero = getOrError(getPlayerHero(), "Can not get player hero")

    const slacks = (GameRules.Addon.context[CustomNpcKeys.SlacksMudGolem] as CDOTA_BaseNPC)
    const sunsFan = (GameRules.Addon.context[CustomNpcKeys.SunsFanMudGolem] as CDOTA_BaseNPC)

    sectionTimer = Timers.CreateTimer(() => sectionTimerUpdate())

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

    if (sectionTimer) {
        Timers.RemoveTimer(sectionTimer);
    }

    const slacks = (GameRules.Addon.context[CustomNpcKeys.SlacksMudGolem] as CDOTA_BaseNPC)
    const sunsFan = (GameRules.Addon.context[CustomNpcKeys.SunsFanMudGolem] as CDOTA_BaseNPC)

    slacks.RemoveNoDraw()
    sunsFan.RemoveNoDraw()

    clearNpcs()
}

let talkTarget: ClosingNpc | undefined;

function sectionTimerUpdate() {
    const playerHero = getPlayerHero();
    if (playerHero && talkTarget) {
        const distance = (playerHero.GetAbsOrigin() - talkTarget.location as Vector).Length2D();
        if (distance < INTERACTION_DISTANCE) {
            talkTarget.interact();
            talkTarget = undefined;
        }
    }

    return 0.2;
}

function orderFilter(order: ExecuteOrderFilterEvent) {
    if (!order.entindex_target) {
        talkTarget = undefined;
        return true;
    }

    const target = EntIndexToHScript(order.entindex_target);

    const closingNpc = npcs.find(npc => npc.unit === target);
    if (closingNpc) {
        talkTarget = closingNpc;
        order.order_type = UnitOrder.MOVE_TO_TARGET;
    } else {
        talkTarget = undefined;
    }

    return true;
}

export const sectionClosing = new tut.FunctionalSection(
    sectionName,
    requiredState,
    onStart,
    onStop,
    orderFilter
)
