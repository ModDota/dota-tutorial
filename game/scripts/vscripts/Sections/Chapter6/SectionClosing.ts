import * as tut from "../../Tutorial/Core"
import * as tg from "../../TutorialGraph/index"
import * as dg from "../../Dialog"
import { RequiredState } from "../../Tutorial/RequiredState"
import { GoalTracker } from "../../Goals"
import { centerCameraOnHero, createPathParticle, Distance2D, getOrError, getPlayerCameraLocation, getPlayerHero, unitIsValidAndAlive } from "../../util"
import { modifier_closing_npc } from "../../modifiers/modifier_closing_npc"
import { addWorldTextAtLocation, removeWorldText } from "../../WorldText"

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
        "item_mysterious_hat": 1
    },
    topDireT1TowerStanding: false,
    topDireT2TowerStanding: false,
    outpostTeam: DOTATeam_t.DOTA_TEAM_GOODGUYS,
}

const INTERACTION_DISTANCE = 200;
const MAX_INTERACTION_DISTANCE = 500;

let canInteract = false

class ClosingNpc {
    private _unit: CDOTA_BaseNPC | undefined

    private spawned = false

    private dialogToken: DialogToken | undefined

    private canBeDestroyed = true;

    constructor(public readonly name: string, public readonly location: Vector, readonly text: string, readonly soundName?: string) {

    }

    public static fromExistingUnit(unit: CDOTA_BaseNPC, name: string, location: Vector, text: string, soundName?: string): ClosingNpc {
        const npc = new ClosingNpc(name, location, text, soundName);
        npc._unit = unit;
        npc.spawned = true;

        npc.canBeDestroyed = false;

        return npc;
    }

    public get playing() {
        return this.dialogToken !== undefined
    }

    public get unit() {
        return this._unit
    }

    spawn() {
        if (!this.spawned) {
            this.spawned = true

            CreateUnitByNameAsync(this.name, this.location, true, undefined, undefined, DOTATeam_t.DOTA_TEAM_GOODGUYS, unit => {
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
    }

    destroy() {
        this.stopInteracting()

        if (this.canBeDestroyed) {
            this.spawned = false

            if (this._unit) {
                if (unitIsValidAndAlive(this._unit)) {
                    this._unit.RemoveSelf()
                }

                this._unit = undefined
            }
        } else {
            print(this.name)
        }
    }

    interact() {
        if (this.spawned && this.unit && unitIsValidAndAlive(this.unit)) {
            // Play dialog
            if (this.soundName) {
                this.dialogToken = dg.playAudio(this.soundName, this.text, this.unit, undefined, () => this.dialogToken = undefined)
            } else {
                this.dialogToken = dg.playText(this.text, this.unit, 20, () => this.dialogToken = undefined)
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
    // Personalities / Guides
    new ClosingNpc(CustomNpcKeys.PurgePugna, Vector(-7250, -6400, 384), LocalizationKey.Script_6_Purge, LocalizationKey.Script_6_Purge),
    new ClosingNpc(CustomNpcKeys.Coccia, Vector(-7050, -6050, 384), LocalizationKey.Script_6_Alex, LocalizationKey.Script_6_Alex),
    new ClosingNpc(CustomNpcKeys.Tsunami, Vector(-7270, -6800, 384), LocalizationKey.Script_6_Tsunami, LocalizationKey.Script_6_Tsunami),
    new ClosingNpc(CustomNpcKeys.DotaU, Vector(-6900, -7050, 384), LocalizationKey.Script_6_DotaU, LocalizationKey.Script_6_DotaU),
    new ClosingNpc(CustomNpcKeys.DotaFromZero, Vector(-5100, -5700, 256), LocalizationKey.Script_6_DFZ, LocalizationKey.Script_6_DFZ),
    new ClosingNpc(CustomNpcKeys.BSJ, Vector(-6000, -6400, 256), LocalizationKey.Script_6_BSJ, LocalizationKey.Script_6_BSJ),
    new ClosingNpc(CustomNpcKeys.Bowie, Vector(-4650, -5700, 256), LocalizationKey.Script_6_Bowie, LocalizationKey.Script_6_Bowie),
    new ClosingNpc(CustomNpcKeys.Angermania, Vector(-4350, -6050, 256), LocalizationKey.Script_6_anger, LocalizationKey.Script_6_anger),
    new ClosingNpc(CustomNpcKeys.RedditDota, Vector(-4550, -6330, 256), LocalizationKey.Script_6_Reddit, LocalizationKey.Script_6_Reddit),
    new ClosingNpc(CustomNpcKeys.Liquipedia, Vector(-5150, -6450, 256), LocalizationKey.Script_6_Liquipedia, LocalizationKey.Script_6_Liquipedia),
    new ClosingNpc(CustomNpcKeys.ZQ, Vector(-4850, -6600, 256), LocalizationKey.Script_6_ZQ, LocalizationKey.Script_6_ZQ),
    new ClosingNpc(CustomNpcKeys.Yodi, Vector(-5600, -6500, 256), LocalizationKey.Script_6_Yodi, LocalizationKey.Script_6_Yodi),
    new ClosingNpc(CustomNpcKeys.Dotabuff, Vector(-4100, -6650, 256), LocalizationKey.Script_6_Dotabuff, LocalizationKey.Script_6_Dotabuff),
    new ClosingNpc(CustomNpcKeys.Sniper, Vector(-4900, -6000, 256), LocalizationKey.Script_6_Jenkins, LocalizationKey.Script_6_Jenkins),
    new ClosingNpc(CustomNpcKeys.Sheepsticked, Vector(-4100, -5450, 256), LocalizationKey.Script_6_Sheepsticked),
    new ClosingNpc(CustomNpcKeys.Mirana, Vector(-3950, -4900, 256), LocalizationKey.Script_6_Sheever),
    new ClosingNpc(CustomNpcKeys.ODPixel, Vector(-3900, -4500, 256), LocalizationKey.Script_6_ODPixel),
    new ClosingNpc(CustomNpcKeys.Kunkka, Vector(-3700, -5450, 256), LocalizationKey.Script_6_Mason),
    new ClosingNpc(CustomNpcKeys.Ursa, Vector(-5150, -5000, 256), LocalizationKey.Script_6_Cap),
    new ClosingNpc(CustomNpcKeys.EmberSpirit, Vector(-4800, -4300, 256), LocalizationKey.Script_6_Blitz),
    new ClosingNpc(CustomNpcKeys.Grimstroke, Vector(-4950, -4700, 256), LocalizationKey.Script_6_Trent),
    new ClosingNpc(CustomNpcKeys.Undying, Vector(-3850, -5150, 256), LocalizationKey.Script_6_Synderen),
    new ClosingNpc(CustomNpcKeys.Zuus, Vector(-4500, -4150, 256), LocalizationKey.Script_6_Lyrical),
    new ClosingNpc(CustomNpcKeys.StormSpirit, Vector(-4325, -4500, 256), LocalizationKey.Script_6_PyrionFlax),
    new ClosingNpc(CustomNpcKeys.Riki, Vector(-4700, -3800, 256), LocalizationKey.Script_6_Arteezy),
    new ClosingNpc(CustomNpcKeys.Awesomedota, Vector(-4000, -6250, 256), LocalizationKey.Script_6_Awesome, LocalizationKey.Script_6_Awesome),
    new ClosingNpc(CustomNpcKeys.DotaFire, Vector(-5475, -5650, 256), LocalizationKey.Script_6_DotaFire, LocalizationKey.Script_6_DotaFire),
    new ClosingNpc(CustomNpcKeys.Torte, Vector(-4800, -6270, 256), LocalizationKey.Script_6_Torte, LocalizationKey.Script_6_Torte),

    // Modders
    new ClosingNpc(CustomNpcKeys.Flam3s, Vector(-5850, -3300, 256), LocalizationKey.Script_6_Flam3s),
    new ClosingNpc(CustomNpcKeys.Perry, Vector(-5150, -3540, 256), LocalizationKey.Script_6_Perry),
    new ClosingNpc(CustomNpcKeys.PongPing, Vector(-5750, -3850, 256), LocalizationKey.Script_6_PongPing),
    new ClosingNpc(CustomNpcKeys.Shush, Vector(-5450, -3850, 256), LocalizationKey.Script_6_Shush, LocalizationKey.Script_6_Shush),
    new ClosingNpc(CustomNpcKeys.SinZ, Vector(-5600, -4250, 256), LocalizationKey.Script_6_SinZ),
    new ClosingNpc(CustomNpcKeys.SmashTheState, Vector(-5800, -4600, 256), LocalizationKey.Script_6_SmashTheState),
    new ClosingNpc(CustomNpcKeys.Tora, Vector(-6300, -4160, 256), LocalizationKey.Script_6_Tora),
    new ClosingNpc(CustomNpcKeys.Toyoka, Vector(-6700, -4600, 256), LocalizationKey.Script_6_Toyoka),
    new ClosingNpc(CustomNpcKeys.VicFrank, Vector(-6200, -4680, 256), LocalizationKey.Script_6_VicFrank),
    new ClosingNpc(CustomNpcKeys.Yoyo, Vector(-6550, -3880, 256), LocalizationKey.Script_6_Yoyo, LocalizationKey.Script_6_Yoyo),

    // Helpers
    new ClosingNpc(CustomNpcKeys.ValkyrjaRuby, Vector(-6250, -5500, 256), LocalizationKey.Script_6_valkyrjaRuby, LocalizationKey.Script_6_valkyrjaRuby),
    new ClosingNpc(CustomNpcKeys.Translators, Vector(-6900, -5200, 256), LocalizationKey.Script_6_Translators),
    new ClosingNpc(CustomNpcKeys.Indiegogo, Vector(-6975, -5500, 256), LocalizationKey.Script_6_Indiegogo),
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
    stopParty()
    if (pathParticleID) {
        ParticleManager.DestroyParticle(pathParticleID, false)
        ParticleManager.ReleaseParticleIndex(pathParticleID)
        pathParticleID = undefined
    }
}

function onStart(complete: () => void) {
    print("Starting", sectionName)

    const goalTracker = new GoalTracker()
    const goalTalkToNpcs = goalTracker.addBoolean(LocalizationKey.Goal_6_Closing_3);
    const goalDestroyTier1 = goalTracker.addBoolean(LocalizationKey.Goal_6_Closing_2a);
    const goalDestroyTier2 = goalTracker.addBoolean(LocalizationKey.Goal_6_Closing_2b);
    const goalDestroyTier3 = goalTracker.addBoolean(LocalizationKey.Goal_6_Closing_2c);
    const goalDestroyTier4s = goalTracker.addNumeric(LocalizationKey.Goal_6_Closing_1, 2);
    const goalDestroyAncient = goalTracker.addBoolean(LocalizationKey.Goal_6_Closing_2);

    const playerHero = getOrError(getPlayerHero(), "Can not get player hero")

    const midTier1Tower = getTower(DOTATeam_t.DOTA_TEAM_BADGUYS, "mid", 1);
    const midTier2Tower = getTower(DOTATeam_t.DOTA_TEAM_BADGUYS, "mid", 2);
    const midTier3Tower = getTower(DOTATeam_t.DOTA_TEAM_BADGUYS, "mid", 3);
    const topTier4Tower = getTower(DOTATeam_t.DOTA_TEAM_BADGUYS, "top", 4);
    const botTier4Tower = getTower(DOTATeam_t.DOTA_TEAM_BADGUYS, "bot", 4);

    const ancient = Entities.FindByName(undefined, "dota_badguys_fort") as CDOTA_BaseNPC

    const pathLocations: Vector[] = [Vector(-4422, -3970, 256), Vector(-3966, -3467, 136.75), Vector(-2366, -2057, 133.000000), Vector(-922, -786, 128), Vector(-49, 44, 128), Vector(1559, 1173, 128), Vector(3442, 2938, 136), Vector(4105, 3560, 256), Vector(5093, 4629, 264)]

    const slacks = (GameRules.Addon.context[CustomNpcKeys.SlacksMudGolem] as CDOTA_BaseNPC)
    const sunsFan = (GameRules.Addon.context[CustomNpcKeys.SunsFanMudGolem] as CDOTA_BaseNPC)

    sectionTimer = Timers.CreateTimer(() => sectionTimerUpdate())

    // Make Slacks and SUNSfan invisible at the start until we fade back in
    slacks.AddNoDraw()
    sunsFan.AddNoDraw()

    canInteract = false

    graph = tg.withGoals(_ => goalTracker.getGoals(), tg.seq([
        // Fade to black and wait some time until the clients are hopefully faded out.
        tg.immediate(_ => CustomGameEventManager.Send_ServerToAllClients("fade_screen", {})),

        tg.wait(1.5),

        // Spawn our NPCs and make Slacks and SUNSfan visible again
        tg.immediate(_ => spawnNpcs()),
        tg.wait(1),
        tg.immediate(_ => slacks.RemoveNoDraw()),
        tg.immediate(_ => sunsFan.RemoveNoDraw()),
        tg.immediate(_ => {
            // Add slacks and sunsfan to closing npcs if not there yet
            if (!npcs.some(npc => npc.unit === slacks)) {
                npcs.push(
                    ClosingNpc.fromExistingUnit(slacks, CustomNpcKeys.SlacksMudGolem, slacks.GetAbsOrigin(), LocalizationKey.Script_6_Slacks, LocalizationKey.Script_6_Slacks),
                    ClosingNpc.fromExistingUnit(sunsFan, CustomNpcKeys.SunsFanMudGolem, sunsFan.GetAbsOrigin(), LocalizationKey.Script_6_SUNSfan, LocalizationKey.Script_6_SUNSfan),
                )
            }
        }),
        tg.immediate(_ => centerCameraOnHero()),

        tg.immediate(_ => {
            worldTexts.add(addWorldTextAtLocation("Modders", Vector(-6700, -4800, 256), "credit_section"))
            worldTexts.add(addWorldTextAtLocation("Resources", Vector(-5500, -5900, 256), "credit_section"))
            worldTexts.add(addWorldTextAtLocation("Resources", Vector(-7000, -6500, 384), "credit_section"))
            worldTexts.add(addWorldTextAtLocation("Voice actors", Vector(-4600, -4850, 256), "credit_section"))
        }),

        // Hopefully every npc will be spawned by now and this completes immediately
        waitNpcsSpawned(),

        // Turn all npcs to player to get decent orientation
        tg.immediate(_ => npcs.forEach(npc => { if (npc.unit) { npc.unit!.FaceTowards(playerHero.GetAbsOrigin()) } })),

        // Spawn some party stuff
        tg.immediate(_ => startParty()),

        // Fade back in
        tg.immediate(_ => CustomGameEventManager.Send_ServerToAllClients("fade_screen_in", {})),

        // Main logic
        tg.seq([
            // Play dialog
            tg.audioDialog(LocalizationKey.Script_6_Surprise, LocalizationKey.Script_6_Surprise, getOrError(Entities.FindByName(undefined, "ent_dota_fountain_good")) as CDOTA_BaseNPC),
            tg.audioDialog(LocalizationKey.Script_6_Closing_1, LocalizationKey.Script_6_Closing_1, slacks),
            tg.immediate(() => goalTalkToNpcs.start()),
            tg.audioDialog(LocalizationKey.Script_6_Closing_2, LocalizationKey.Script_6_Closing_2, sunsFan),
            tg.audioDialog(LocalizationKey.Script_6_Closing_3, LocalizationKey.Script_6_Closing_3, slacks),
            tg.audioDialog(LocalizationKey.Script_6_Closing_4, LocalizationKey.Script_6_Closing_4, sunsFan),

            tg.forkAny([
                tg.seq([
                    // Create path particle down mid lane
                    tg.immediate(_ => {
                        pathParticleID = createPathParticle([...pathLocations, ancient.GetAbsOrigin()])
                    }),
                    // Goal: Destroy T1
                    tg.immediate(_ => goalDestroyTier1.start()),
                    tg.withHighlights(
                        tg.completeOnCheck(_ => !unitIsValidAndAlive(midTier1Tower), 0.1),
                        {type: "arrow_enemy", units: midTier1Tower ? [midTier1Tower] : [], attach: true}
                    ),
                    tg.immediate(_ => goalDestroyTier1.complete()),
                    // Goal:Destroy T2
                    tg.immediate(_ => goalDestroyTier2.start()),
                    tg.withHighlights(
                        tg.completeOnCheck(_ => !unitIsValidAndAlive(midTier2Tower), 0.1),
                        {type: "arrow_enemy", units: midTier2Tower ? [midTier2Tower] : [], attach: true}
                    ),
                    tg.immediate(_ => goalDestroyTier2.complete()),
                    // Goal: Destroy T3
                    tg.immediate(_ => goalDestroyTier3.start()),
                    tg.withHighlights(
                        tg.completeOnCheck(_ => !unitIsValidAndAlive(midTier3Tower), 0.1),
                        {type: "arrow_enemy", units: midTier3Tower ? [midTier3Tower] : [], attach: true}
                    ),
                    tg.immediate(_ => goalDestroyTier3.complete()),
                    // Goal: Destroy T4s
                    tg.immediate(_ => goalDestroyTier4s.start()),
                    tg.withHighlights(tg.completeOnCheck(_ => {
                            let deadCount = 0;
                            if (!unitIsValidAndAlive(botTier4Tower)) deadCount++;
                            if (!unitIsValidAndAlive(topTier4Tower)) deadCount++;
                            goalDestroyTier4s.setValue(deadCount);
                            return deadCount === 2;
                        }, 0.1),
                        {type: "arrow_enemy", units: (topTier4Tower && botTier4Tower) ? [topTier4Tower, botTier4Tower] : [], attach: true}
                    ),
                    tg.immediate(_ => goalDestroyTier4s.complete()),
                ]),

                tg.seq([
                    tg.panCameraExponential(_ => getPlayerCameraLocation(), ancient.GetAbsOrigin(), 2),
                    tg.audioDialog(LocalizationKey.Script_6_Closing_5, LocalizationKey.Script_6_Closing_5, sunsFan),
                    tg.panCameraExponential(ancient.GetAbsOrigin(), _ => playerHero.GetAbsOrigin(), 2),
                    tg.immediate(() => {
                        playerHero.AddItemByName("item_rapier")
                        const tpScroll = playerHero.AddItemByName("item_tpscroll")
                        Timers.CreateTimer(FrameTime(), () => {
                            tpScroll.EndCooldown()
                        })
                    }),
                    tg.audioDialog(LocalizationKey.Script_6_Closing_6, LocalizationKey.Script_6_Closing_6, slacks),
                    tg.immediate(_ => canInteract = true),
                    tg.neverComplete(),
                ]),
            ]),

            tg.withHighlights(tg.seq([
                tg.immediate(_ => {
                    goalDestroyTier4s.complete()
                    goalDestroyAncient.start()
                }),
                tg.completeOnCheck(() => { return !unitIsValidAndAlive(ancient) }, 0.1),
            ]), {
                type: "arrow_enemy",
                units: [ancient],
                attach: true,
            })
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

    if (canInteract) {
        const target = EntIndexToHScript(order.entindex_target);

        const closingNpc = npcs.find(npc => npc.unit === target);
        if (closingNpc) {
            talkTarget = closingNpc;
            order.order_type = dotaunitorder_t.DOTA_UNIT_ORDER_MOVE_TO_TARGET;
        } else {
            talkTarget = undefined;
        }
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

function getTower(team: DOTATeam_t, lane: "mid" | "top" | "bot", tier: 1 | 2 | 3 | 4): CDOTA_BaseNPC_Building | undefined {
    const towers = Entities.FindAllByClassname("npc_dota_tower") as CDOTA_BaseNPC_Building[];

    const teamName = team === DOTATeam_t.DOTA_TEAM_GOODGUYS ? "goodguys" : "badguys";
    const towerName = `dota_${teamName}_tower${tier}_${lane}`;
    return towers.find(t => t.GetName() === towerName);
}

let partyParticles: ParticleID[] = [];
let discoTimer: string | undefined;

const discoLocations = [
    Vector(-7000, -6480, 0),
    Vector(-5850, -5400, 0),
    Vector(-6000, -4000, 0),
    Vector(-5400, -6000, 0),
]

function startParty() {
    for (const npc of npcs) {
        partyParticles.push(ParticleManager.CreateParticle(ParticleName.DiscoLights, ParticleAttachment_t.PATTACH_ABSORIGIN_FOLLOW, npc.unit))
    }

    discoTimer = Timers.CreateTimer(() => {

        // Spawn some discoballs
        for (const discoLocation of discoLocations) {
            const position = GetGroundPosition(discoLocation, undefined) + Vector(0, 0, 400) as Vector;
            const particle = ParticleManager.CreateParticle(ParticleName.DiscoBall, ParticleAttachment_t.PATTACH_CUSTOMORIGIN, undefined);
            ParticleManager.SetParticleControl(particle, 0, position);
            ParticleManager.SetParticleControl(particle, 1, position);
            ParticleManager.ReleaseParticleIndex(particle);
        }

        // Make a random npc set off some fireworks
        const randomNpc = npcs[RandomInt(0, npcs.length - 1)];
        if (randomNpc.unit) {
            const location = randomNpc.unit.GetAbsOrigin();
            const particle = ParticleManager.CreateParticle(ParticleName.Firework, ParticleAttachment_t.PATTACH_CUSTOMORIGIN, undefined);
            ParticleManager.SetParticleControl(particle, 0, location);
            ParticleManager.SetParticleControl(particle, 1, location + Vector(0, 0, 500) as Vector);
            ParticleManager.ReleaseParticleIndex(particle);
        }

        return 2;
    })
}

function stopParty() {
    for (const particle of partyParticles) {
        ParticleManager.DestroyParticle(particle, false);
    }
    partyParticles = [];

    if (discoTimer) {
        Timers.RemoveTimer(discoTimer)
    }
}
