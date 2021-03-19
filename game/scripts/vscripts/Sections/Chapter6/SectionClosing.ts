import * as tut from "../../Tutorial/Core"
import * as tg from "../../TutorialGraph/index"
import * as dg from "../../Dialog"
import { RequiredState } from "../../Tutorial/RequiredState"
import { GoalTracker } from "../../Goals"
import { centerCameraOnHero, createPathParticle, Distance2D, getOrError, getPlayerCameraLocation, getPlayerHero, unitIsValidAndAlive } from "../../util"
import { modifier_closing_npc } from "../../modifiers/modifier_closing_npc"
import { addWorldText, removeWorldText } from "../../WorldText"

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
    topDireT2TowerStanding: false,
    outpostTeam: DotaTeam.GOODGUYS,
}

const INTERACTION_DISTANCE = 200;
const MAX_INTERACTION_DISTANCE = 300;

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
        CustomGameEventManager.Send_ServerToAllClients("credits_interact", { name: this.name, description: this.text });
    }

    stopInteracting() {
        CustomGameEventManager.Send_ServerToAllClients("credits_interact_stop", {});
        if (this.dialogToken) {
            dg.stop(this.dialogToken);
            this.dialogToken = undefined;
        }
    }
}

const npcs = [
    // TODO: Pass in the actual text and sound keys once we have them

    // Personalities / Guides
    new ClosingNpc(CustomNpcKeys.PurgePugna, Vector(-7250, -6400, 384), LocalizationKey.Script_6_Purge, LocalizationKey.Script_6_Purge),
    new ClosingNpc(CustomNpcKeys.Coccia, Vector(-7050, -6050, 384), "TODO"),
    new ClosingNpc(CustomNpcKeys.Tsunami, Vector(-7270, -6800, 384), LocalizationKey.Script_6_Tsunami, LocalizationKey.Script_6_Tsunami),
    new ClosingNpc(CustomNpcKeys.DotaU, Vector(-6900, -7050, 384), LocalizationKey.Script_6_DotaU, LocalizationKey.Script_6_DotaU),
    new ClosingNpc(CustomNpcKeys.DotaFromZero, Vector(-5170, -5300, 256), LocalizationKey.Script_6_DFZ, LocalizationKey.Script_6_DFZ),
    new ClosingNpc(CustomNpcKeys.BSJ, Vector(-4800, -5450, 256), "TODO"),
    new ClosingNpc(CustomNpcKeys.Bowie, Vector(-4440, -5620, 256), "TODO"),
    new ClosingNpc(CustomNpcKeys.Angermania, Vector(-4530, -5940, 256), LocalizationKey.Script_6_anger, LocalizationKey.Script_6_anger),
    new ClosingNpc(CustomNpcKeys.RedditDota, Vector(-4820, -6330, 256), LocalizationKey.Script_6_Reddit, LocalizationKey.Script_6_Reddit),
    new ClosingNpc(CustomNpcKeys.Liquipedia, Vector(-5150, -6540, 256), LocalizationKey.Script_6_Liquipedia, LocalizationKey.Script_6_Liquipedia),

    // Modders
    new ClosingNpc(CustomNpcKeys.Flam3s, Vector(-5850, -3300, 256), LocalizationKey.Script_6_Flam3s),
    new ClosingNpc(CustomNpcKeys.Perry, Vector(-5150, -3540, 256), LocalizationKey.Script_6_Perry),
    new ClosingNpc(CustomNpcKeys.PongPing, Vector(-5750, -3850, 256), LocalizationKey.Script_6_PongPing),
    new ClosingNpc(CustomNpcKeys.Shush, Vector(-5450, -3850, 256), LocalizationKey.Script_6_Shush),
    new ClosingNpc(CustomNpcKeys.SinZ, Vector(-5330, -4250, 256), LocalizationKey.Script_6_SinZ),
    new ClosingNpc(CustomNpcKeys.SmashTheState, Vector(-5400, -4600, 256), LocalizationKey.Script_6_SmashTheState),
    new ClosingNpc(CustomNpcKeys.Tora, Vector(-6300, -4160, 256), LocalizationKey.Script_6_Tora),
    new ClosingNpc(CustomNpcKeys.Toyoka, Vector(-6700, -4600, 256), LocalizationKey.Script_6_Toyoka),
    new ClosingNpc(CustomNpcKeys.VicFrank, Vector(-5940, -4680, 256), LocalizationKey.Script_6_VicFrank),
    new ClosingNpc(CustomNpcKeys.Yoyo, Vector(-6550, -3880, 256), LocalizationKey.Script_6_Yoyo),

    // Helpers
    new ClosingNpc(CustomNpcKeys.ValkyrjaRuby, Vector(-6250, -5500, 256), LocalizationKey.Script_6_valkyrjaRuby),
]

const spawnNpcs = () => npcs.forEach(npc => npc.spawn())
const waitNpcsSpawned = () => tg.completeOnCheck(_ => npcs.every(npc => npc.unit !== undefined), 0.1)
const clearNpcs = () => npcs.forEach(npc => npc.destroy())

let sectionTimer: string;
let pathParticleID: ParticleID | undefined = undefined

let worldTexts = new Set<number>()
function clearWorldTexts() {
    worldTexts.forEach(removeWorldText)
    worldTexts.clear()
}

function cleanup() {
    clearNpcs()
    clearWorldTexts()
    if (pathParticleID) {
        ParticleManager.DestroyParticle(pathParticleID, false)
        ParticleManager.ReleaseParticleIndex(pathParticleID)
        pathParticleID = undefined
    }
}

function onStart(complete: () => void) {
    print("Starting", sectionName)

    const goalTracker = new GoalTracker()
    const goalDestroyTowers = goalTracker.addNumeric(LocalizationKey.Goal_6_Closing_1, 2);
    const goalDestroyAncient = goalTracker.addBoolean(LocalizationKey.Goal_6_Closing_2);

    const playerHero = getOrError(getPlayerHero(), "Can not get player hero")

    const topTower = getDireAncientTower("top")
    const botTower = getDireAncientTower("bot")
    let towersToDestroy: CDOTA_BaseNPC_Building[] = [];
    if (topTower && unitIsValidAndAlive(topTower)) towersToDestroy.push(topTower)
    if (botTower && unitIsValidAndAlive(botTower)) towersToDestroy.push(botTower)
    const ancient = Entities.FindByName(undefined, "dota_badguys_fort") as CDOTA_BaseNPC

    const pathLocations: Vector[] = [Vector(-4422, -3970, 256), Vector(-3966, -3467, 136.75), Vector(-2366, -2057, 133.000000), Vector(-922, -786, 128), Vector(-49, 44, 128), Vector(1559, 1173, 128), Vector(3442, 2938, 136), Vector(4105, 3560, 256), Vector(5093, 4629, 264)]

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

        tg.immediate(_ => {
            worldTexts.add(addWorldText("Modders", Vector(-6700, -4800, 256)))
            worldTexts.add(addWorldText("Resources", Vector(-5500, -6000, 256)))
            worldTexts.add(addWorldText("Resources", Vector(-7000, -6500, 384)))
        }),

        // Main logic
        tg.forkAny([
            tg.seq([
                // Play dialog
                tg.audioDialog(LocalizationKey.Script_6_Closing_1, LocalizationKey.Script_6_Closing_1, slacks),
                tg.audioDialog(LocalizationKey.Script_6_Closing_2, LocalizationKey.Script_6_Closing_2, sunsFan),
                tg.audioDialog(LocalizationKey.Script_6_Closing_3, LocalizationKey.Script_6_Closing_3, slacks),
                tg.audioDialog(LocalizationKey.Script_6_Closing_4, LocalizationKey.Script_6_Closing_4, sunsFan),

                tg.withHighlights(tg.forkAny([
                    tg.seq([
                        tg.immediate(_ => {
                            goalDestroyTowers.start()
                            pathParticleID = createPathParticle([...pathLocations, ancient.GetAbsOrigin()])
                        }),
                        tg.completeOnCheck(_ => {
                            towersToDestroy = towersToDestroy.filter(tower => unitIsValidAndAlive(tower))
                            goalDestroyTowers.setValue(2 - towersToDestroy.length)

                            return towersToDestroy.length === 0
                        }, 0.1),
                    ]),

                    tg.seq([
                        tg.panCameraExponential(_ => getPlayerCameraLocation(), ancient.GetAbsOrigin(), 2),
                        tg.audioDialog(LocalizationKey.Script_6_Closing_4, LocalizationKey.Script_6_Closing_4, sunsFan), // This needs to be edited with the new line for Sunsfan for destroying the ancient and the towers protecting it
                        tg.panCameraExponential(ancient.GetAbsOrigin(), _ => playerHero.GetAbsOrigin(), 2),
                        tg.audioDialog(LocalizationKey.Script_6_Closing_4, LocalizationKey.Script_6_Closing_4, sunsFan), // This needs to be edited with the new line for Slacks for getting a Divine Rapier, and to destroy the ancient
                        tg.immediate(() => {
                            playerHero.AddItemByName("item_rapier")
                            const tpScroll = playerHero.AddItemByName("item_tpscroll")
                            Timers.CreateTimer(FrameTime(), () => {
                                tpScroll.EndCooldown()
                            })
                        }),
                        tg.neverComplete(),
                    ]),
                ]), {
                    type: "arrow_enemy",
                    units: towersToDestroy,
                    attach: true,
                }),

                tg.withHighlights(tg.seq([
                    tg.immediate(_ => {
                        goalDestroyTowers.complete()
                        goalDestroyAncient.start()
                    }),
                    tg.completeOnCheck(() => { return !unitIsValidAndAlive(ancient) }, 0.1),
                ]), {
                    type: "arrow_enemy",
                    units: [ancient],
                    attach: true,
                })
            ]),

            // Make everyone stare at you, little bit creepy
            tg.loop(true, tg.seq([
                tg.completeOnCheck(_ => playerHero.IsIdle(), 0.1),
                tg.immediate(_ => npcs.forEach(npc => npc.unit!.FaceTowards(playerHero.GetAbsOrigin()))),
                tg.wait(0.1),
            ])),
        ]),

        // Should never happen currently
        tg.immediate(_ => cleanup()),
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

    cleanup()
}

let talkTarget: ClosingNpc | undefined;
let interactingWith: ClosingNpc | undefined;

function sectionTimerUpdate() {
    const playerHero = getPlayerHero();
    if (playerHero && talkTarget) {
        const distance = Distance2D(playerHero.GetAbsOrigin(), talkTarget.location);
        if (distance < INTERACTION_DISTANCE) {

            // First cancel old interaction
            if (interactingWith) {
                interactingWith.stopInteracting();
            }

            talkTarget.interact();
            interactingWith = talkTarget;
            talkTarget = undefined;
        }
    }

    if (playerHero && interactingWith) {
        const distance = (playerHero.GetAbsOrigin() - interactingWith.location as Vector).Length2D();
        if (distance > MAX_INTERACTION_DISTANCE) {
            interactingWith.stopInteracting();
            interactingWith = undefined;
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

function getDireAncientTower(towerLoc: "top" | "bot"): CDOTA_BaseNPC_Building | undefined {
    const enemyTowerAncientTopLocation = Vector(4944, 4776, 256)
    const enemyTowerAncientBotLocation = Vector(5280, 4432, 256)

    const tower = towerLoc === "top" ?
        Entities.FindByClassnameNearest("npc_dota_tower", enemyTowerAncientTopLocation, 200) as CDOTA_BaseNPC_Building :
        Entities.FindByClassnameNearest("npc_dota_tower", enemyTowerAncientBotLocation, 200) as CDOTA_BaseNPC_Building

    return tower
}
