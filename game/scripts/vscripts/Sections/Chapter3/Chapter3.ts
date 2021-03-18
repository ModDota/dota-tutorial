import * as tg from "../../TutorialGraph/index"
import * as tut from "../../Tutorial/Core"
import { DestroyNeutrals, displayDotaErrorMessage, freezePlayerHero, getOrError, getPlayerCameraLocation, getPlayerHero, highlight, highlightUiElement, randomChoice, removeContextEntityIfExists, removeHighlight, setUnitPacifist, unitIsValidAndAlive } from "../../util"
import { RequiredState } from "../../Tutorial/RequiredState"
import { GoalTracker } from "../../Goals"
import { BaseModifier, registerModifier } from "../../lib/dota_ts_adapter"
import { Blockade } from "../../Blockade"

let graph: tg.TutorialStep | undefined = undefined

let movedToStash = false
const markerLocation = Vector(-3250, 4917, 128)
const odPixelLocation = Vector(-3635, 5330, 128)

const creepCampMin = Vector(-2911, 4373)
const creepCampMax = Vector(-2142, 5203)
const creepCampCenter = creepCampMin.__add(creepCampMax).__mul(0.5)

const bigCampLocation = Vector(-4300, 3550, 256)

const stackClockStartTime = 44
const stackClockEndTime = 3

const stackTryCount = 5
const giveAwayItemName = "item_arcane_ring"
const dropInStashItemName = "item_mysterious_hat"
const keepItemName = "item_possessed_mask"

const neutralSlotUIPath =
    "HUDElements/lower_hud/center_with_stats/inventory_composition_layer_container/inventory_neutral_slot_container/inventory_neutral_slot"
const inventorySlot6UIPath =
    "HUDElements/lower_hud/center_with_stats/center_block/inventory/inventory_items/InventoryContainer/inventory_backpack_list/inventory_slot_6/ButtonAndLevel"
const clockUIPath =
    "HUDElements/topbar/TimeOfDay"

let fowViewer: ViewerID | undefined

class NeutralDetector {
    private _neutrals = new Set<CDOTA_BaseNPC>()

    /**
     * Whether to remove all newly spawned creeps in the box.
     */
    public removeNew = true

    constructor(readonly boxMin: Vector, readonly boxMax: Vector, public onNeutralsAdded: (addedNeutrals: CDOTA_BaseNPC[]) => void) {
        if (boxMin.x > boxMax.x || boxMin.y > boxMax.y) {
            error("boxMin greater than boxMax")
        }
    }

    /**
     * All living neutrals for this camp.
     */
    get neutrals() {
        return this._neutrals
    }

    /**
     * How many neutrals there are alive in total for this camp.
     */
    get neutralCount() {
        return this._neutrals.size
    }

    private isEntityOverlapping(entity: CBaseEntity) {
        const { x, y } = entity.GetAbsOrigin()
        return x > this.boxMin.x && x <= this.boxMax.x && y > this.boxMin.y && y <= this.boxMax.y
    }

    private static isValidNeutral(neutral: CDOTA_BaseNPC | undefined) {
        return neutral && neutral.IsBaseNPC() && unitIsValidAndAlive(neutral) && neutral.GetTeam() === DotaTeam.NEUTRALS && neutral.IsNeutralUnitType() && !neutral.IsInvulnerable()
    }

    newNeutrals = new Set<CDOTA_BaseNPC>()
    newNeutralsTimer: string | undefined

    /**
     * Detects new neutral creeps and removes dead or invalid ones.
     */
    public update() {
        // Remove invalid neutrals
        for (const neutral of this._neutrals) {
            if (!NeutralDetector.isValidNeutral(neutral)) {
                this._neutrals.delete(neutral)
            }
        }

        // Add overlapping neutrals (adding them twice won't hurt as we're using a Set)
        const overlappingNeutrals = (Entities.FindAllByClassname("npc_dota_creep_neutral") as CDOTA_BaseNPC[])
            .filter(neutral => NeutralDetector.isValidNeutral(neutral))
            .filter(neutral => this.isEntityOverlapping(neutral))

        const newNeutrals: CDOTA_BaseNPC[] = []
        for (const neutral of overlappingNeutrals) {
            if (!this._neutrals.has(neutral)) {
                if (this.removeNew) {
                    neutral.RemoveSelf()
                } else {
                    newNeutrals.push(neutral)
                    this._neutrals.add(neutral)
                }
            }
        }

        if (newNeutrals.length > 0) {
            for (const neutral of newNeutrals) {
                this.newNeutrals.add(neutral)
            }

            if (this.newNeutralsTimer) {
                Timers.RemoveTimer(this.newNeutralsTimer)
            }

            this.newNeutralsTimer = Timers.CreateTimer(0.5, () => {
                const neutrals: CDOTA_BaseNPC[] = []
                this.newNeutrals.forEach(neutral => neutrals.push(neutral))
                this.newNeutrals.clear()
                this.newNeutralsTimer = undefined
                this.onNeutralsAdded(neutrals)
            })
        }
    }
}

const respawnNeutrals = (neutralDetector: NeutralDetector) => tg.seq([
    tg.wait(0),
    tg.immediate(_ => neutralDetector.removeNew = false),
    tg.immediate(_ => GameRules.SpawnNeutralCreeps()),
    tg.wait(0),
    tg.completeOnCheck(_ => neutralDetector.neutralCount > 0, 0),
    tg.immediate(_ => neutralDetector.removeNew = true),
])

const requiredState: RequiredState = {
    heroLevel: 6,
    heroAbilityMinLevels: [1, 1, 1, 1],
    heroLocation: Vector(-3500, 4500, 128),
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    requireODPixelGolem: true,

    requireRiki: true,
    heroItems: { item_greater_crit: 1 },
    blockades: [
        new Blockade(Vector(-1550, 4800), Vector(-2600, 6400)),
        new Blockade(Vector(-2600, 6400), Vector(-3700, 6400)),
        new Blockade(Vector(-3700, 6400), Vector(-4100, 5200)),
        new Blockade(Vector(-4000, 3104), Vector(-3545, 3062)), // River
        new Blockade(Vector(-4223, 5043), Vector(-4480, 4630)),
        new Blockade(Vector(-4480, 4630), Vector(-4597, 3497)),
        new Blockade(Vector(-1450, 4600), Vector(-1500, 3300)),
    ],
    topDireT1TowerStanding: false
}

const stack = (count: number, neutralDetector: NeutralDetector, onStacked: (tries: number, stacks: number) => tg.TutorialStep, onFailure: (tries: number, stacks: number) => tg.TutorialStep) => {
    const timeManager = GameRules.Addon.customTimeManager

    let stacks = 0
    let tries = 0
    let previousStacks = 0
    let previousTries = 0

    const timers = new Set<number>()

    const didTry = () => previousTries < tries
    const didStack = () => previousStacks < stacks

    let done = false

    return tg.seq([
        tg.immediate(_ => {
            timeManager.customTimeEnabled = true
            timeManager.time = stackClockStartTime

            // Restart time to shortly before stack time shortly after 0
            timers.add(timeManager.registerCallBackOnTime(stackClockEndTime, () => timeManager.time = stackClockStartTime))

            // Spawn new neutrals at 0 and increment try count
            timers.add(timeManager.registerCallBackOnTime(0, () => {
                neutralDetector.removeNew = false
                // Triggered on 0s. Spawns removed after 1s and after 59s.
                // If game timer is within 1s of our fake timer (ie. between 1s and 59s right here) we don't need to spawn our own camps.
                // Otherwise we would get two spawns.
                const realSeconds = GameRules.GetDOTATime(false, false) % 60;
                if (realSeconds > 1 && realSeconds < 59) {
                    GameRules.SpawnNeutralCreeps()
                }
                tries++
            }))

            // Remove all newly spawned neutrals when we don't spawn them ourselves at 0
            timers.add(timeManager.registerCallBackOnTime(59, () => {
                neutralDetector.removeNew = false
            }))
            timers.add(timeManager.registerCallBackOnTime(1, () => {
                neutralDetector.removeNew = true
            }))
            neutralDetector.removeNew = (timeManager.time % 60) > 1 && (timeManager.time % 60) < 59

            // Highlight newly spawned neutrals and increment stack counter
            neutralDetector.onNeutralsAdded = addedNeutrals => {
                highlight({
                    units: addedNeutrals,
                    type: "arrow_enemy",
                })

                stacks++
            }
        }),
        tg.loop(_ => !done, _ => tg.seq([
            // Check if there was a try and the time is shortly after zero (after creeps are supposed to be spawned).
            (didTry() && (timeManager.time % 60) > 0.1 && (timeManager.time % 60) < 59) ? tg.seq([
                (didStack() ? onStacked(tries, stacks) : onFailure(tries, stacks)),
                tg.immediate(_ => {
                    // Reset when the player fails the first stack
                    if (stacks === 0 && didTry() && !didStack()) {
                        tries = 0
                        stacks = 0
                    }

                    if (tries >= count) {
                        done = true
                    }

                    previousTries = tries
                    previousStacks = stacks
                }),
            ]) : tg.wait(0),

        ])),
        tg.immediate(_ => {
            timers.forEach(timer => timeManager.unregisterCallBackOnTime(timer))
            timers.clear()
            timeManager.customTimeEnabled = false
        }),
    ])
}

const onStart = (complete: () => void) => {
    CustomGameEventManager.Send_ServerToAllClients("section_started", { section: SectionName.Chapter3_Opening, })

    const goalTracker = new GoalTracker()
    const goalMoveToCamp = goalTracker.addBoolean(LocalizationKey.Goal_3_1)
    const goalKillFirstSpawn = goalTracker.addBoolean(LocalizationKey.Goal_3_2)
    const goalMoveToTarget = goalTracker.addBoolean(LocalizationKey.Goal_3_3)
    const goalPressAlt = goalTracker.addBoolean(LocalizationKey.Goal_3_4)
    const goalStackCreeps = goalTracker.addBoolean(LocalizationKey.Goal_3_5)
    const goalTryStackCreeps = goalTracker.addNumeric(LocalizationKey.Goal_3_6, 5)
    const goalOptionalStackCreeps = goalTracker.addNumeric(LocalizationKey.Goal_3_7, 5)
    const goalKillStackedCreeps = goalTracker.addBoolean(LocalizationKey.Goal_3_8)
    const goalPickupItem = goalTracker.addBoolean(LocalizationKey.Goal_3_9)
    const goalKillThirdSpawn = goalTracker.addBoolean(LocalizationKey.Goal_3_10)
    const goalStash = goalTracker.addBoolean(LocalizationKey.Goal_3_11)
    const goalMoveToRiki = goalTracker.addBoolean(LocalizationKey.Goal_3_12)

    const playerHero = getOrError(getPlayerHero(), "Could not find the player's hero.")

    movedToStash = false

    const neutralDetector = new NeutralDetector(creepCampMin, creepCampMax, addedNeutrals => {
        highlight({
            units: addedNeutrals,
            type: "arrow_enemy",
        })
    })

    const goToCamp = () => [
        tg.immediate(_ => goalMoveToCamp.start()),
        tg.goToLocation(markerLocation),
        tg.immediate(_ => goalMoveToCamp.complete()),
    ]

    const spawnAndKillFirstRound = () => {
        return [
            // Remove initial neutrals and spawn new ones
            tg.immediate(_ => {
                freezePlayerHero(true)
                goalKillFirstSpawn.start()
                neutralDetector.neutrals.forEach(neutral => neutral.RemoveSelf())
            }),
            tg.wait(0.1),

            respawnNeutrals(neutralDetector),

            // Dialog
            tg.audioDialog(LocalizationKey.Script_3_Opening_1, LocalizationKey.Script_3_Opening_1, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_3_Opening_2, LocalizationKey.Script_3_Opening_2, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.audioDialog(LocalizationKey.Script_3_Opening_3, LocalizationKey.Script_3_Opening_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.audioDialog(LocalizationKey.Script_3_Opening_5, LocalizationKey.Script_3_Opening_5, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_3_Opening_6, LocalizationKey.Script_3_Opening_6, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),

            tg.immediate(_ => freezePlayerHero(false)),

            // Wait until the neutrals are cleared
            tg.completeOnCheck(_ => neutralDetector.neutralCount === 0, 0),

            tg.immediate(_ => goalKillFirstSpawn.complete()),
        ]
    }

    const respawnCreepsInitially = () => [
        // Walk out of box
        tg.immediate(_ => goalMoveToTarget.start()),
        tg.goToLocation(markerLocation),
        tg.immediate(_ => goalMoveToTarget.complete()),

        tg.immediate(_ => freezePlayerHero(true)),

        tg.audioDialog(LocalizationKey.Script_3_Opening_7, LocalizationKey.Script_3_Opening_7, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
        tg.audioDialog(LocalizationKey.Script_3_Opening_8, LocalizationKey.Script_3_Opening_8, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
        tg.audioDialog(LocalizationKey.Script_3_Opening_9, LocalizationKey.Script_3_Opening_9, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),

        respawnNeutrals(neutralDetector),
    ]

    const pressAlt = () => [
        tg.audioDialog(LocalizationKey.Script_3_Opening_10, LocalizationKey.Script_3_Opening_10, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),

        tg.forkAny([
            tg.seq([
                tg.panCameraExponential(_ => getPlayerCameraLocation(), bigCampLocation, 2),
                tg.neverComplete(),
            ]),
            tg.audioDialog(LocalizationKey.Script_3_Opening_11, LocalizationKey.Script_3_Opening_11, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
        ]),
        tg.forkAny([
            tg.seq([
                tg.panCameraExponential(_ => getPlayerCameraLocation(), _ => playerHero.GetAbsOrigin(), 2),
                tg.neverComplete(),
            ]),
            tg.audioDialog(LocalizationKey.Script_3_Opening_12, LocalizationKey.Script_3_Opening_12, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
        ]),

        tg.immediate(_ => goalPressAlt.start()),
        tg.waitForModifierKey(ModifierKey.Alt),
        tg.immediate(_ => goalPressAlt.complete()),

        tg.immediate(_ => GameRules.Addon.customTimeManager.customTimeEnabled = true),

        tg.audioDialog(LocalizationKey.Script_3_Opening_13, LocalizationKey.Script_3_Opening_13, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
        tg.audioDialog(LocalizationKey.Script_3_Opening_14, LocalizationKey.Script_3_Opening_14, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
    ]

    const stackCreepsPractice = () => [
        tg.immediate(_ => {
            playerHero.AddNewModifier(undefined, undefined, modifier_deal_no_damage.name, undefined)
            playerHero.AddNewModifier(undefined, undefined, modifier_keep_hero_alive.name, undefined)

            goalStackCreeps.start()

            playerHero.Hold()
            highlightUiElement(clockUIPath)
        }),


        tg.audioDialog(LocalizationKey.Script_3_Opening_15, LocalizationKey.Script_3_Opening_15, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
        tg.immediate(_ => freezePlayerHero(false)),

        // Stacking
        tg.immediate(_ => neutralDetector.removeNew = true),
        stack(1, neutralDetector,
            _ => tg.immediate(_ => { }),
            _ => tg.audioDialog(LocalizationKey.Script_3_Opening_16, LocalizationKey.Script_3_Opening_16, ctx => ctx[CustomNpcKeys.SlacksMudGolem])
        ),
        tg.immediate(_ => neutralDetector.removeNew = true),
        tg.audioDialog(LocalizationKey.Script_3_Opening_17, LocalizationKey.Script_3_Opening_17, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
        tg.immediate(_ => goalStackCreeps.complete()),
    ]

    const stackDialogKeys = [
        [LocalizationKey.Script_3_Opening_20, LocalizationKey.Script_3_Opening_20_1], // Failure
        [LocalizationKey.Script_3_Opening_22], // 3x (= the first stack as we already had 2 alive)
        [LocalizationKey.Script_3_Opening_23], // 4x
        [LocalizationKey.Script_3_Opening_24], // 5x
        [LocalizationKey.Script_3_Opening_25, LocalizationKey.Script_3_Opening_25_1], // 6x memes
    ]

    let stackKey: string = ""
    const updateStackKey = (stacks: number) => {
        stackKey = randomChoice(stackDialogKeys[Math.min(stacks, stackDialogKeys.length - 1)])
    }

    const stackCreepsMultiple = () => {
        return [
            tg.audioDialog(LocalizationKey.Script_3_Opening_18, LocalizationKey.Script_3_Opening_18, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.immediate(ctx => {
                goalOptionalStackCreeps.start()
                goalTryStackCreeps.start()
                const odPixel = ctx[CustomNpcKeys.ODPixel] as CDOTA_BaseNPC
                FindClearSpaceForUnit(odPixel, odPixelLocation, false)
                setUnitPacifist(odPixel, true)
            }),
            tg.audioDialog(LocalizationKey.Script_3_Opening_19, LocalizationKey.Script_3_Opening_19, ctx => ctx[CustomNpcKeys.ODPixel]),

            // Stacking
            tg.immediate(_ => neutralDetector.removeNew = true),
            stack(stackTryCount, neutralDetector,
                (tries, stacks) => tg.seq([
                    tg.immediate(_ => {
                        goalTryStackCreeps.setValue(tries)
                        goalOptionalStackCreeps.setValue(stacks)
                        updateStackKey(stacks)
                    }),
                    tg.audioDialog(_ => stackKey, _ => stackKey, ctx => ctx[CustomNpcKeys.ODPixel])
                ]),
                (tries, stacks) => tg.seq([
                    tg.immediate(_ => {
                        goalTryStackCreeps.setValue(tries)
                        goalOptionalStackCreeps.setValue(stacks)
                        updateStackKey(0)
                    }),
                    tg.audioDialog(_ => stackKey, _ => stackKey, ctx => ctx[CustomNpcKeys.ODPixel])
                ]),
            ),
            tg.immediate(_ => neutralDetector.removeNew = true),

            tg.immediate(_ => {
                removeHighlight(clockUIPath)
                playerHero.RemoveModifierByName(modifier_deal_no_damage.name)
                playerHero.RemoveModifierByName(modifier_keep_hero_alive.name)
                goalOptionalStackCreeps.complete()
                goalTryStackCreeps.complete()
            }),
        ]
    }

    const killStackedCamp = () => [
        tg.audioDialog(LocalizationKey.Script_3_Opening_26, LocalizationKey.Script_3_Opening_26, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
        tg.immediate(_ => goalKillStackedCreeps.start()),
        tg.completeOnCheck(_ => neutralDetector.neutralCount === 0, 0.1),
        tg.immediate(_ => goalKillStackedCreeps.complete()),
    ]

    const pickUpItems = () => [
        tg.immediate(_ => DropNeutralItemAtPositionForHero(giveAwayItemName, creepCampCenter, playerHero, 0, true)),
        tg.immediate(_ => goalPickupItem.start()),
        tg.withHighlights(tg.completeOnCheck(() => playerHero.HasItemInInventory(giveAwayItemName), 0.1), {
            type: "arrow",
            locations: [creepCampCenter],
        }),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_1, LocalizationKey.Script_3_Neutrals_1, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
        tg.immediate(_ => highlightUiElement(neutralSlotUIPath)),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_2, LocalizationKey.Script_3_Neutrals_2, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_3, LocalizationKey.Script_3_Neutrals_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
        tg.immediate(_ => {
            goalPickupItem.complete()
            removeHighlight(neutralSlotUIPath)
        }),
    ]

    const killThirdSpawn = () => [
        tg.immediate(_ => goalKillThirdSpawn.start()),
        tg.goToLocation(markerLocation),

        respawnNeutrals(neutralDetector),

        tg.audioDialog(LocalizationKey.Script_3_Neutrals_4, LocalizationKey.Script_3_Neutrals_4, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_5, LocalizationKey.Script_3_Neutrals_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),

        tg.completeOnCheck(_ => neutralDetector.neutralCount === 0, 0.1),
        tg.immediate(_ => goalKillThirdSpawn.complete()),

        tg.immediate(_ => DropNeutralItemAtPositionForHero(dropInStashItemName, creepCampCenter, playerHero, 0, true)),

        // Wait for player to pick up item
        tg.immediate(_ => goalPickupItem.start()),
        tg.withHighlights(tg.completeOnCheck(() => playerHero.HasItemInInventory(dropInStashItemName), 0.1), {
            type: "arrow",
            locations: [creepCampCenter],
        }),
        tg.immediate(_ => goalPickupItem.complete()),
    ]

    const stashItem = () => [
        tg.immediate(_ => goalStash.start()),
        tg.immediate(_ => highlightUiElement(inventorySlot6UIPath)),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_6, LocalizationKey.Script_3_Neutrals_6, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_7, LocalizationKey.Script_3_Neutrals_7, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_8, LocalizationKey.Script_3_Neutrals_8, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
        tg.completeOnCheck(_ => movedToStash === true, 0.1),
        tg.immediate(_ => goalStash.complete()),
        tg.immediate(_ => removeHighlight(inventorySlot6UIPath)),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_9, LocalizationKey.Script_3_Neutrals_9, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_10, LocalizationKey.Script_3_Neutrals_10, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_11, LocalizationKey.Script_3_Neutrals_11, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
        tg.audioDialog(LocalizationKey.Script_3_Neutrals_12, LocalizationKey.Script_3_Neutrals_12, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
    ]

    const chaseRiki = () => {
        const belowRamp = GetGroundPosition(Vector(-2500, 4000), undefined)
        const aboveRamp = GetGroundPosition(Vector(-2250, 3850), undefined)
        const rikiLocation = GetGroundPosition(Vector(-2700, 4200), undefined)

        return [
            // Spawn Riki and make sure he's visible
            tg.immediate((ctx) => {
                goalMoveToRiki.start()
                let riki = ctx[CustomNpcKeys.Riki] as CDOTA_BaseNPC
                riki.SetAbsOrigin(rikiLocation)
                let backstab = riki.FindAbilityByName("riki_backstab")
                backstab!.SetLevel(0)
                riki.RemoveModifierByName("modifier_invisible")
                riki.RemoveModifierByName("modifier_riki_backstab")
                riki.Hold()
                setUnitPacifist(riki, true)
                freezePlayerHero(true)

                // Spawn fow viewer on Riki's location
                fowViewer = AddFOWViewer(DotaTeam.GOODGUYS, rikiLocation, 800, 30, true)
            }),

            // Pan to Riki and play his dialog
            tg.panCameraExponential(_ => getPlayerCameraLocation(), rikiLocation, 2),
            tg.audioDialog(LocalizationKey.Script_3_Neutrals_13, LocalizationKey.Script_3_Neutrals_13, ctx => ctx[CustomNpcKeys.Riki]),

            // Make Riki move away
            tg.immediate(ctx => {
                ExecuteOrderFromTable({
                    UnitIndex: (ctx[CustomNpcKeys.Riki] as CDOTA_BaseNPC).GetEntityIndex(),
                    OrderType: UnitOrder.MOVE_TO_POSITION,
                    Position: aboveRamp,
                    Queue: true
                })
            }),
            tg.wait(1),

            // Remove the fow viewer, pan back and play dialog. Wait for player to move to where Riki went.
            tg.immediate(_ => {
                if (fowViewer) {
                    RemoveFOWViewer(DotaTeam.GOODGUYS, fowViewer)
                    fowViewer = undefined
                }
            }),

            tg.panCameraExponential(_ => getPlayerCameraLocation(), _ => playerHero.GetAbsOrigin(), 2),
            tg.audioDialog(LocalizationKey.Script_3_Neutrals_14, LocalizationKey.Script_3_Neutrals_14, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.immediate(() => freezePlayerHero(false)),
            tg.goToLocation(belowRamp),
            tg.immediate(ctx => removeContextEntityIfExists(ctx, CustomNpcKeys.Riki)),
        ]
    }

    graph = tg.withGoals(_ => goalTracker.getGoals(), tg.forkAny([
        tg.seq([
            ...goToCamp(),
            ...spawnAndKillFirstRound(),
            ...respawnCreepsInitially(),
            ...pressAlt(),
            ...stackCreepsPractice(),
            ...stackCreepsMultiple(),
            ...killStackedCamp(),
            ...pickUpItems(),
            ...killThirdSpawn(),
            ...stashItem(),
            ...chaseRiki(),
        ]),
        tg.loop(true, _ => tg.seq([
            tg.immediate(_ => neutralDetector.update()),
            tg.wait(0),
        ])),
    ]))

    graph.start(GameRules.Addon.context, () => {
        print("Completed", SectionName.Chapter3_Opening)
        complete()
    })
}

const onStop = () => {
    print("Stopping", SectionName.Chapter3_Opening)

    if (graph) {
        graph.stop(GameRules.Addon.context)
        graph = undefined
        GameRules.Addon.customTimeManager.customTimeEnabled = false

        const hero = getPlayerHero()
        if (hero && IsValidEntity(hero)) {
            hero.RemoveModifierByName(modifier_deal_no_damage.name)
            hero.RemoveModifierByName(modifier_keep_hero_alive.name)
        }

        if (fowViewer) {
            RemoveFOWViewer(DotaTeam.GOODGUYS, fowViewer)
            fowViewer = undefined
        }

        removeContextEntityIfExists(GameRules.Addon.context, CustomNpcKeys.Riki)

        DestroyNeutrals()
    }
}

export const sectionOpening = new tut.FunctionalSection(
    SectionName.Chapter3_Opening,
    requiredState,
    onStart,
    onStop,
    orderFilter
)

// Certain order will need to be filtered, if the player sabotages themselves they will get stuck
function orderFilter(event: ExecuteOrderFilterEvent): boolean {
    const unitIndex = event.units["0"]
    if (!unitIndex) {
        return true
    }

    if (event.order_type === UnitOrder.DROP_ITEM || event.order_type === UnitOrder.MOVE_ITEM) {
        displayDotaErrorMessage(LocalizationKey.Error_Chapter3_1)
        return false
    }

    const itemIndex = event.entindex_ability
    if (!itemIndex) {
        return true
    }
    const item = EntIndexToHScript(itemIndex) as CDOTA_Item

    if (event.order_type === UnitOrder.GIVE_ITEM) {
        if (item.GetAbilityName() === giveAwayItemName) {
            return true
        } else if (item.GetAbilityName() === keepItemName) {
            // Warn the player that they are giving away the wrong item, you want to keep that!
            return false
        } else if (item.GetAbilityName() === dropInStashItemName) {
            // Warn the player that they are giving away the wrong item, warlock doesnt want that item right now
            return false
        }
    }

    if (event.order_type === UnitOrder.DROP_ITEM_AT_FOUNTAIN) {
        if (item.GetAbilityName() === dropInStashItemName) {
            movedToStash = true
            return true
        } else if (item.GetAbilityName() === keepItemName) {
            // Warn the player that they are dropping the wrong item, you want to keep that!
            return false
        } else if (item.GetAbilityName() === dropInStashItemName) {
            // Warn the player that they are dropping  the wrong item, warlock wants it.
            return false
        }
    }

    return true
}

@registerModifier()
class modifier_deal_no_damage extends BaseModifier {
    IsHidden() {
        return !IsInToolsMode()
    }

    DeclareFunctions() {
        return [ModifierFunction.TOTALDAMAGEOUTGOING_PERCENTAGE]
    }

    GetModifierTotalDamageOutgoing_Percentage() {
        return -1000
    }
}

@registerModifier()
class modifier_keep_hero_alive extends BaseModifier {
    IsHidden() {
        return !IsInToolsMode()
    }

    DeclareFunctions() {
        return [ModifierFunction.INCOMING_DAMAGE_PERCENTAGE]
    }

    GetModifierIncomingDamage_Percentage() {
        let parent = this.GetParent()
        let healthPct = parent.GetHealthPercent()
        if (healthPct > 5) {
            return 0
        }

        return -(100 - healthPct)
    }
}
