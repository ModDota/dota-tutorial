import { GoalTracker } from "../../Goals";
import * as tut from "../../Tutorial/Core";
import { RequiredState } from "../../Tutorial/RequiredState";
import * as tg from "../../TutorialGraph/index";
import { DirectionToPosition, displayDotaErrorMessage, Distance2D, findRealPlayerID, getOrError, getPlayerCameraLocation, getPlayerHero, setUnitPacifist, unitIsValidAndAlive, useAbility } from "../../util";
import * as shared from "./Shared";
import { HeroInfo } from "./Shared";

const sectionName: SectionName = SectionName.Chapter5_Opening;

let graph: tg.TutorialStep | undefined = undefined

const requiredState: RequiredState = {
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    heroLocation: Vector(-4150, 2568, 0),
    heroLocationTolerance: 800,
    heroLevel: 6,
    heroAbilityMinLevels: [1, 1, 1, 1],
    blockades: Object.values(shared.chapter5Blockades),
    requireBountyRunes: true,
    requireRoshan: true,
    roshanHitsLikeATruck: true,
    topDireT1TowerStanding: false,
    topDireT2TowerStanding: false,
    heroItems: { [shared.itemDaedalus]: 1, "item_mysterious_hat": 1 },
    outpostTeam: DOTATeam_t.DOTA_TEAM_GOODGUYS,
};

const powerRuneRangersInfo: HeroInfo[] = [
    { name: CustomNpcKeys.Ursa },
    { name: CustomNpcKeys.EmberSpirit },
    { name: CustomNpcKeys.EmberIllusionOne },
    { name: CustomNpcKeys.EmberIllusionTwo },
    { name: CustomNpcKeys.Grimstroke },
    { name: CustomNpcKeys.Undying },
    { name: CustomNpcKeys.Zuus },
    { name: CustomNpcKeys.StormSpirit },
];

const otherHeroesInfo: HeroInfo[] = [
    { name: CustomNpcKeys.Sniper },
]

const runesDuration = 100

function onStart(complete: () => void) {
    print("Starting", sectionName);

    const playerHero = getOrError(getPlayerHero())

    const visionRevealDuration = 1
    const panCameraBountiesAlpha = 2

    const goalTracker = new GoalTracker();
    const goalPickupBountyRune = goalTracker.addBoolean(LocalizationKey.Goal_5_Opening_3)
    const goalMoveToRune = goalTracker.addBoolean(LocalizationKey.Goal_5_Opening_1);
    const goalWatchRangers = goalTracker.addBoolean(LocalizationKey.Goal_5_Opening_2);

    const powerRangerSpawnLocation = Vector(-1760, 1850, 0)

    const rangerLineStart = Vector(-2119, 770, 0)
    const rangerMiddlePoint = Vector(-1350, 775, 0)
    const rangerLineEnd = Vector(-1350, 1400, 0)
    const rangerFirstLineDirection = DirectionToPosition(rangerLineStart, rangerMiddlePoint)
    const rangerSecondLineDirection = DirectionToPosition(rangerMiddlePoint, rangerLineEnd)

    const roshan = Entities.FindAllByName(CustomNpcKeys.Roshan)[0] as CDOTA_BaseNPC

    graph = tg.withGoals(_ => goalTracker.getGoals(),
        tg.seq([
            tg.panCameraExponential(_ => getPlayerCameraLocation(), _ => playerHero.GetAbsOrigin(), 2),
            tg.audioDialog(LocalizationKey.Script_5_Opening_1, LocalizationKey.Script_5_Opening_1, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.audioDialog(LocalizationKey.Script_5_Opening_2, LocalizationKey.Script_5_Opening_2, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.forkAny([
                tg.seq([
                    tg.wait(1),
                    tg.audioDialog(LocalizationKey.Script_5_Opening_3, LocalizationKey.Script_5_Opening_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 2.5),
                ]),

                // Pan camera over bounty rune spawns
                tg.seq([
                    tg.panCameraLinear(_ => getPlayerCameraLocation(), shared.runeSpawnsLocations.radiantTopBountyPos, 0.5),
                    tg.immediate((ctx) => {
                        ctx[CustomEntityKeys.RadiantTopBountyFOWViewer] = AddFOWViewer(DOTATeam_t.DOTA_TEAM_GOODGUYS, shared.runeSpawnsLocations.radiantTopBountyPos, 800, visionRevealDuration, false)
                    }),
                    tg.wait(visionRevealDuration),
                    tg.panCameraExponential(shared.runeSpawnsLocations.radiantTopBountyPos, shared.runeSpawnsLocations.radiantAncientsBountyPos, panCameraBountiesAlpha),
                    tg.immediate((ctx) => {
                        ctx[CustomEntityKeys.RadiantAncientsBountyFOWViewer] = AddFOWViewer(DOTATeam_t.DOTA_TEAM_GOODGUYS, shared.runeSpawnsLocations.radiantAncientsBountyPos, 800, visionRevealDuration, false)
                    }),
                    tg.wait(visionRevealDuration),

                    tg.panCameraExponential(shared.runeSpawnsLocations.radiantAncientsBountyPos, shared.runeSpawnsLocations.direBotBountyPos, panCameraBountiesAlpha),
                    tg.setCameraTarget((ctx) => ctx[CustomEntityKeys.DireBotBountyRune]),
                    tg.immediate((ctx) => {
                        ctx[CustomEntityKeys.DireBotBountyFOWViewer] = AddFOWViewer(DOTATeam_t.DOTA_TEAM_GOODGUYS, shared.runeSpawnsLocations.direBotBountyPos, 800, visionRevealDuration, false)
                    }),
                    tg.wait(visionRevealDuration),

                    tg.panCameraExponential(shared.runeSpawnsLocations.direBotBountyPos, shared.runeSpawnsLocations.direAncientsBountyPos, panCameraBountiesAlpha),
                    tg.setCameraTarget((ctx) => ctx[CustomEntityKeys.DireAncientsBountyRune]),
                    tg.immediate((ctx) => {
                        ctx[CustomEntityKeys.DireAncientsBountyFOWViewer] = AddFOWViewer(DOTATeam_t.DOTA_TEAM_GOODGUYS, shared.runeSpawnsLocations.direAncientsBountyPos, 800, visionRevealDuration, false)
                    }),
                    tg.wait(visionRevealDuration),
                ]),
            ]),

            // Return camera to player and wait until he picks up a Bounty Rune
            tg.panCameraExponential(_ => getPlayerCameraLocation(), _ => playerHero.GetAbsOrigin(), panCameraBountiesAlpha),
            tg.withHighlights(
                tg.seq([
                    tg.immediate(() => {
                        goalPickupBountyRune.start()
                    }),
                    tg.completeOnCheck(context => {
                        const runeExist = IsValidEntity(context[CustomEntityKeys.RadiantTopBountyRune])
                        return !runeExist
                    }, 0.1)
                ]),
                {
                    type: "arrow_trees",
                    locations: [shared.runeSpawnsLocations.radiantTopBountyPos],
                }),

            tg.immediate(() => goalPickupBountyRune.complete()),
            tg.audioDialog(LocalizationKey.Script_5_Opening_4, LocalizationKey.Script_5_Opening_4, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_5_Opening_5, LocalizationKey.Script_5_Opening_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.forkAny([
                tg.seq([
                    tg.audioDialog(LocalizationKey.Script_5_Opening_6, LocalizationKey.Script_5_Opening_6, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
                    tg.neverComplete()
                ]),
                tg.seq([
                    tg.immediate((ctx) => {
                        goalMoveToRune.start()
                        if (IsValidEntity(ctx[CustomEntityKeys.TopPowerRune])) {
                            ctx[CustomEntityKeys.TopPowerRune].Destroy()
                            ctx[CustomEntityKeys.TopPowerRune] = undefined
                        }
                    }),
                    tg.goToLocation(shared.runeSpawnsLocations.topPowerUpRunePos.__add(Vector(-300, 100, 0)), [GetGroundPosition(Vector(-3250, 1600), undefined)]),
                ]),
            ]),
            tg.immediate(_ => {
                setUnitPacifist(playerHero, true)
                goalMoveToRune.complete()
            }),

            tg.audioDialog(LocalizationKey.Script_5_Opening_7, LocalizationKey.Script_5_Opening_7, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.immediate(_ => {
                goalWatchRangers.start()
            }),

            // DD power rune ranger sequence
            tg.spawnUnit(CustomNpcKeys.Ursa, powerRangerSpawnLocation, DOTATeam_t.DOTA_TEAM_GOODGUYS, CustomNpcKeys.Ursa, true),
            tg.setCameraTarget(ctx => ctx[CustomNpcKeys.Ursa]),
            tg.immediate(ctx => {
                ctx[CustomEntityKeys.TopPowerRune] = CreateRune(shared.runeSpawnsLocations.topPowerUpRunePos, DOTA_RUNES.DOTA_RUNE_DOUBLEDAMAGE)
            }),
            tg.spawnUnit(CustomNpcKeys.Sniper, rangerLineStart, DOTATeam_t.DOTA_TEAM_BADGUYS, CustomNpcKeys.Sniper, true),
            tg.immediate((ctx) => setUnitPacifist(ctx[CustomNpcKeys.Sniper], true)),
            tg.moveUnit(ctx => ctx[CustomNpcKeys.Ursa], shared.runeSpawnsLocations.topPowerUpRunePos),
            tg.immediate((ctx) => fakePickupRune(DOTA_RUNES.DOTA_RUNE_DOUBLEDAMAGE, ctx[CustomNpcKeys.Ursa])),
            tg.audioDialog(LocalizationKey.Script_5_Opening_8, LocalizationKey.Script_5_Opening_8, ctx => ctx[CustomNpcKeys.Ursa]),
            tg.immediate((ctx) => setUnitPacifist(ctx[CustomNpcKeys.Sniper], false)),
            tg.completeOnCheck((ctx) => !unitIsValidAndAlive(ctx[CustomNpcKeys.Sniper]), 1),
            tg.moveUnit(ctx => ctx[CustomNpcKeys.Ursa], rangerLineStart),
            tg.faceTowards(ctx => ctx[CustomNpcKeys.Ursa], shared.runeSpawnsLocations.topPowerUpRunePos),
            tg.wait(1),

            // Illusions power rune ranger sequence
            tg.spawnUnit(CustomNpcKeys.EmberSpirit, powerRangerSpawnLocation, DOTATeam_t.DOTA_TEAM_GOODGUYS, CustomNpcKeys.EmberSpirit, true),
            tg.setCameraTarget(ctx => ctx[CustomNpcKeys.EmberSpirit]),
            tg.immediate(ctx => {
                ctx[CustomEntityKeys.TopPowerRune] = CreateRune(shared.runeSpawnsLocations.topPowerUpRunePos, DOTA_RUNES.DOTA_RUNE_ILLUSION)
            }),
            tg.moveUnit(ctx => ctx[CustomNpcKeys.EmberSpirit], shared.runeSpawnsLocations.topPowerUpRunePos),
            tg.immediate((ctx) => fakePickupRune(DOTA_RUNES.DOTA_RUNE_ILLUSION, ctx[CustomNpcKeys.EmberSpirit])),
            tg.audioDialog(LocalizationKey.Script_5_Opening_9, LocalizationKey.Script_5_Opening_9, ctx => ctx[CustomNpcKeys.EmberSpirit]),
            tg.immediate((ctx) => {
                const emberEntities = Entities.FindAllByNameWithin(CustomNpcKeys.EmberSpirit, ctx[CustomNpcKeys.EmberSpirit].GetAbsOrigin(), 400) as CDOTA_BaseNPC_Hero[]
                for (const emberEntity of emberEntities) {
                    if (emberEntity.IsIllusion()) {
                        if (!ctx[CustomNpcKeys.EmberIllusionOne])
                            ctx[CustomNpcKeys.EmberIllusionOne] = emberEntity
                        else
                            ctx[CustomNpcKeys.EmberIllusionTwo] = emberEntity
                    }
                }
            }),
            tg.fork([
                tg.moveUnit(ctx => ctx[CustomNpcKeys.EmberSpirit], rangerLineStart.__add(rangerFirstLineDirection * 300 as Vector)),
                tg.moveUnit(ctx => ctx[CustomNpcKeys.EmberIllusionOne], rangerLineStart.__add(rangerFirstLineDirection * 250 as Vector)),
                tg.moveUnit(ctx => ctx[CustomNpcKeys.EmberIllusionTwo], rangerLineStart.__add(rangerFirstLineDirection * 350 as Vector)),
            ]),
            tg.fork([
                tg.faceTowards(ctx => ctx[CustomNpcKeys.EmberSpirit], shared.runeSpawnsLocations.topPowerUpRunePos),
                tg.faceTowards(ctx => ctx[CustomNpcKeys.EmberIllusionOne], shared.runeSpawnsLocations.topPowerUpRunePos),
                tg.faceTowards(ctx => ctx[CustomNpcKeys.EmberIllusionTwo], shared.runeSpawnsLocations.topPowerUpRunePos),
            ]),

            // Invisibility power rune ranger sequence
            tg.spawnUnit(CustomNpcKeys.Grimstroke, powerRangerSpawnLocation, DOTATeam_t.DOTA_TEAM_GOODGUYS, CustomNpcKeys.Grimstroke, true),
            tg.setCameraTarget(ctx => ctx[CustomNpcKeys.Grimstroke]),
            tg.immediate(ctx => {
                ctx[CustomEntityKeys.TopPowerRune] = CreateRune(shared.runeSpawnsLocations.topPowerUpRunePos, DOTA_RUNES.DOTA_RUNE_INVISIBILITY)
            }),
            tg.moveUnit(ctx => ctx[CustomNpcKeys.Grimstroke], shared.runeSpawnsLocations.topPowerUpRunePos),
            tg.immediate((ctx) => fakePickupRune(DOTA_RUNES.DOTA_RUNE_INVISIBILITY, ctx[CustomNpcKeys.Grimstroke])),
            tg.audioDialog(LocalizationKey.Script_5_Opening_10, LocalizationKey.Script_5_Opening_10, ctx => ctx[CustomNpcKeys.Grimstroke]),
            tg.immediate((ctx) => {
                ctx[CustomNpcKeys.Grimstroke].AddNewModifier(ctx[CustomNpcKeys.Grimstroke], undefined, "modifier_rune_invis", { duration: runesDuration })
            }),
            tg.moveUnit(ctx => ctx[CustomNpcKeys.Grimstroke], rangerLineStart.__add(rangerFirstLineDirection * 600 as Vector)),
            tg.faceTowards(ctx => ctx[CustomNpcKeys.Grimstroke], shared.runeSpawnsLocations.topPowerUpRunePos),

            // Arcane power rune ranger sequence
            tg.spawnUnit(CustomNpcKeys.Zuus, powerRangerSpawnLocation, DOTATeam_t.DOTA_TEAM_GOODGUYS, CustomNpcKeys.Zuus, true),
            tg.setCameraTarget(ctx => ctx[CustomNpcKeys.Zuus]),
            tg.immediate(ctx => {
                ctx[CustomEntityKeys.TopPowerRune] = CreateRune(shared.runeSpawnsLocations.topPowerUpRunePos, DOTA_RUNES.DOTA_RUNE_ARCANE)

            }),
            tg.moveUnit(ctx => ctx[CustomNpcKeys.Zuus], shared.runeSpawnsLocations.topPowerUpRunePos),
            tg.immediate((ctx) => fakePickupRune(DOTA_RUNES.DOTA_RUNE_ARCANE, ctx[CustomNpcKeys.Zuus])),
            tg.audioDialog(LocalizationKey.Script_5_Opening_11, LocalizationKey.Script_5_Opening_11, ctx => ctx[CustomNpcKeys.Zuus]),
            tg.immediate((ctx) => {
                ctx[CustomNpcKeys.Zuus].AddNewModifier(ctx[CustomNpcKeys.Zuus], undefined, "modifier_rune_arcane", { duration: runesDuration })
            }),
            tg.immediate((ctx) => ctx[CustomNpcKeys.Zuus].FindAbilityByName("zuus_lightning_bolt").SetLevel(1)),
            tg.immediate((ctx) => useAbility(ctx[CustomNpcKeys.Zuus], shared.runeSpawnsLocations.topPowerUpRunePos.__add(Vector(0, 200, 0)), "zuus_lightning_bolt", dotaunitorder_t.DOTA_UNIT_ORDER_CAST_POSITION)),
            tg.wait(1),
            tg.moveUnit(ctx => ctx[CustomNpcKeys.Zuus], rangerMiddlePoint.__add(rangerSecondLineDirection * 300 as Vector)),
            tg.faceTowards(ctx => ctx[CustomNpcKeys.Zuus], shared.runeSpawnsLocations.topPowerUpRunePos),
            tg.immediate((ctx) => {
                const zuusUnit = ctx[CustomNpcKeys.Zuus] as CDOTA_BaseNPC_Hero
                const lightingBolt = zuusUnit.FindAbilityByName("zuus_lightning_bolt")
                lightingBolt!.EndCooldown()
            }),
            tg.immediate((ctx) => useAbility(ctx[CustomNpcKeys.Zuus], shared.runeSpawnsLocations.topPowerUpRunePos.__add(Vector(0, 200, 0)), "zuus_lightning_bolt", dotaunitorder_t.DOTA_UNIT_ORDER_CAST_POSITION)),
            tg.wait(1),

            // Haste power rune ranger sequence
            tg.spawnUnit(CustomNpcKeys.Undying, powerRangerSpawnLocation, DOTATeam_t.DOTA_TEAM_GOODGUYS, CustomNpcKeys.Undying, true),
            tg.setCameraTarget(ctx => ctx[CustomNpcKeys.Undying]),
            tg.immediate(ctx => {
                ctx[CustomEntityKeys.TopPowerRune] = CreateRune(shared.runeSpawnsLocations.topPowerUpRunePos, DOTA_RUNES.DOTA_RUNE_HASTE)
            }),
            tg.moveUnit(ctx => ctx[CustomNpcKeys.Undying], shared.runeSpawnsLocations.topPowerUpRunePos),
            tg.immediate((ctx) => fakePickupRune(DOTA_RUNES.DOTA_RUNE_HASTE, ctx[CustomNpcKeys.Undying])),
            tg.fork([
                tg.audioDialog(LocalizationKey.Script_5_Opening_12, LocalizationKey.Script_5_Opening_12, ctx => ctx[CustomNpcKeys.Undying]),
                tg.immediate((ctx) => {
                    ctx[CustomNpcKeys.Undying].AddNewModifier(ctx[CustomNpcKeys.Undying], undefined, "modifier_rune_haste", { duration: runesDuration })
                }),
                tg.moveUnitSequence(ctx => ctx[CustomNpcKeys.Undying], (ctx) => {
                    return [
                        ...createUndyingMoveSequence(ctx, playerHero),
                        rangerMiddlePoint.__add(rangerSecondLineDirection * 600 as Vector)
                    ]
                }),
            ]),
            tg.faceTowards(ctx => ctx[CustomNpcKeys.Undying], shared.runeSpawnsLocations.topPowerUpRunePos),

            // Regen power rune ranger sequence
            tg.spawnUnit(CustomNpcKeys.StormSpirit, powerRangerSpawnLocation, DOTATeam_t.DOTA_TEAM_GOODGUYS, CustomNpcKeys.StormSpirit, true),
            tg.immediate((ctx) => {
                ctx[CustomNpcKeys.StormSpirit].SetHealth(100)
                ctx[CustomNpcKeys.StormSpirit].SetMana(150)
                // Lvl up to 6
                ctx[CustomNpcKeys.StormSpirit].AddExperience(5, EDOTA_ModifyXP_Reason.DOTA_ModifyXP_Unspecified, false, false)
            }),
            tg.setCameraTarget(ctx => ctx[CustomNpcKeys.StormSpirit]),
            tg.audioDialog(LocalizationKey.Script_5_Opening_13, LocalizationKey.Script_5_Opening_13, ctx => ctx[CustomNpcKeys.StormSpirit]),
            tg.immediate(ctx => {
                ctx[CustomEntityKeys.TopPowerRune] = CreateRune(shared.runeSpawnsLocations.topPowerUpRunePos, DOTA_RUNES.DOTA_RUNE_REGENERATION)
            }),
            tg.moveUnit(ctx => ctx[CustomNpcKeys.StormSpirit], shared.runeSpawnsLocations.topPowerUpRunePos),
            tg.immediate((ctx) => fakePickupRune(DOTA_RUNES.DOTA_RUNE_REGENERATION, ctx[CustomNpcKeys.StormSpirit])),
            tg.audioDialog(LocalizationKey.Script_5_Opening_14, LocalizationKey.Script_5_Opening_14, ctx => ctx[CustomNpcKeys.StormSpirit]),
            tg.immediate((ctx) => {
                const hero = ctx[CustomNpcKeys.StormSpirit] as CDOTA_BaseNPC_Hero
                if (hero) {
                    hero.FindAbilityByName("storm_spirit_ball_lightning")!.SetLevel(1)
                    useAbility(hero,
                        rangerMiddlePoint.__add(rangerSecondLineDirection * 900 as Vector),
                        "storm_spirit_ball_lightning",
                        dotaunitorder_t.DOTA_UNIT_ORDER_CAST_POSITION
                    )
                }
            }),
            tg.wait(1),
            tg.faceTowards(ctx => ctx[CustomNpcKeys.StormSpirit], shared.runeSpawnsLocations.topPowerUpRunePos),

            // Start Roshan sequence
            tg.setCameraTarget(ctx => ctx[CustomNpcKeys.Grimstroke]),
            tg.audioDialog(LocalizationKey.Script_5_Opening_15, LocalizationKey.Script_5_Opening_15, ctx => ctx[CustomNpcKeys.Grimstroke]),
            tg.immediate(_ => {
                goalWatchRangers.complete()
                shared.chapter5Blockades.roshan.destroy()
            }),
            tg.playGlobalSound("RoshanDT.Scream"),
            tg.fork(powerRuneRangersInfo.map((powerRuneRanger) =>
                tg.faceTowards(ctx => ctx[powerRuneRanger.name], shared.outsidePitLocation)
            )),
            tg.fork([
                tg.moveUnit(roshan, shared.runeSpawnsLocations.topPowerUpRunePos),
                tg.setCameraTarget(roshan),
            ]),
            tg.immediate((ctx) => {
                setUnitPacifist(roshan, false)
                roshan.MoveToPositionAggressive(ctx[CustomNpcKeys.Ursa].GetAbsOrigin())
            }),
            tg.fork(powerRuneRangersInfo.map((powerRuneRanger) => {
                return tg.immediate((ctx) => {
                    if (unitIsValidAndAlive(ctx[powerRuneRanger.name]))
                        ctx[powerRuneRanger.name].SetForceAttackTarget(roshan)
                })
            })),
            tg.setCameraTarget(undefined),
            tg.fork([
                tg.audioDialog(LocalizationKey.Script_5_Opening_16, LocalizationKey.Script_5_Opening_16, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
                tg.seq([
                    tg.fork(powerRuneRangersInfo.map((powerRuneRanger) =>
                        tg.completeOnCheck(ctx => !unitIsValidAndAlive(ctx[powerRuneRanger.name]), 2),
                    )),
                    tg.moveUnit(roshan, shared.roshanLocation),
                    tg.faceTowards(roshan, shared.outsidePitLocation),
                ]),
            ]),
            tg.immediate((ctx) => shared.disposeHeroes(ctx, powerRuneRangersInfo.concat(otherHeroesInfo))),
            tg.wait(1)
        ])
    )

    graph.start(GameRules.Addon.context, () => {
        print("Completed", sectionName);
        complete();
    });
}

function onStop() {
    print("Stopping", sectionName);

    shared.disposeHeroes(GameRules.Addon.context, powerRuneRangersInfo)

    if (IsValidEntity(GameRules.Addon.context[CustomEntityKeys.TopPowerRune])) {
        GameRules.Addon.context[CustomEntityKeys.TopPowerRune].Destroy()
        GameRules.Addon.context[CustomEntityKeys.TopPowerRune] = undefined
    }

    if (graph) {
        graph.stop(GameRules.Addon.context);
        graph = undefined;
    }
}

function chapterFiveOpeningOrderFilter(event: ExecuteOrderFilterEvent): boolean {
    // Allow all orders that aren't done by the player
    if (event.issuer_player_id_const != findRealPlayerID()) return true;

    if (event.order_type === dotaunitorder_t.DOTA_UNIT_ORDER_PICKUP_RUNE) {
        // Only allow picking up the first bounty rune
        if (event.entindex_target !== GameRules.Addon.context[CustomEntityKeys.RadiantTopBountyRuneEntIndex]) {
            displayDotaErrorMessage(LocalizationKey.Error_Chapter5_1)
            return false
        }
    }

    if (event.order_type === dotaunitorder_t.DOTA_UNIT_ORDER_PURCHASE_ITEM) {
        displayDotaErrorMessage(LocalizationKey.Error_BuyingItemsDisabled)
        return false
    }

    if (event.order_type === dotaunitorder_t.DOTA_UNIT_ORDER_ATTACK_TARGET && event.entindex_target === GameRules.Addon.context[CustomEntityKeys.RadiantTopBountyRuneEntIndex]) {
        displayDotaErrorMessage(LocalizationKey.Error_Chapter5_2)
        return false
    }

    return true;
}

export const sectionOpening = new tut.FunctionalSection(
    sectionName,
    requiredState,
    onStart,
    onStop,
    chapterFiveOpeningOrderFilter
);

const createUndyingMoveSequence = (ctx: tg.TutorialContext, playerHero: CDOTA_BaseNPC_Hero) => {
    let undyingMovePoints: Vector[] = []

    const circlePointsConfig: CirclePointsConfig = {
        clockwise: true,
        halfCircle: false,
        startLeft: false
    }

    undyingMovePoints = undyingMovePoints.concat(getPointsAroundCenter(playerHero.GetAbsOrigin(), circlePointsConfig))

    undyingMovePoints = undyingMovePoints.concat(getPointsAroundCenter(ctx[CustomNpcKeys.Ursa].GetAbsOrigin(), circlePointsConfig))

    circlePointsConfig.startLeft = true
    circlePointsConfig.halfCircle = true
    undyingMovePoints = undyingMovePoints.concat(getPointsAroundCenter(ctx[CustomNpcKeys.EmberSpirit].GetAbsOrigin(), circlePointsConfig))

    circlePointsConfig.clockwise = false
    undyingMovePoints = undyingMovePoints.concat(getPointsAroundCenter(ctx[CustomNpcKeys.Grimstroke].GetAbsOrigin(), circlePointsConfig))

    circlePointsConfig.halfCircle = false
    circlePointsConfig.startLeft = false
    undyingMovePoints = undyingMovePoints.concat(getPointsAroundCenter(ctx[CustomNpcKeys.Zuus].GetAbsOrigin(), circlePointsConfig))

    return undyingMovePoints
}

function getPointsAroundCenter(centerPoint: Vector, circlePointsConfig: CirclePointsConfig): Vector[] {
    let pointsAroundCenterArray: Vector[] = []
    let angle = 0
    const radius = 100
    let numberOfPoints = 4

    if (circlePointsConfig.clockwise)
        angle = -2 * math.pi / numberOfPoints
    else
        angle = 2 * math.pi / numberOfPoints

    if (circlePointsConfig.halfCircle)
        numberOfPoints = numberOfPoints / 2

    for (let i = 0; i <= numberOfPoints; i++) {
        const direction = Vector(math.cos(angle * i), math.sin(angle * i))
        if (circlePointsConfig.startLeft)
            pointsAroundCenterArray.push(centerPoint.__sub((direction * radius) as Vector))
        else
            pointsAroundCenterArray.push(centerPoint.__add((direction * radius) as Vector))
    }

    return pointsAroundCenterArray
}

export type CirclePointsConfig = {
    clockwise?: boolean,
    halfCircle?: boolean,
    startLeft?: boolean,
}

function fakePickupRune(runeType: DOTA_RUNES, pickingHero: CDOTA_BaseNPC_Hero) {
    const context = GameRules.Addon.context;
    if (IsValidEntity(context[CustomEntityKeys.TopPowerRune])) {
        context[CustomEntityKeys.TopPowerRune].Destroy()
        context[CustomEntityKeys.TopPowerRune] = undefined
    }

    let modifier;
    let particleFx;

    switch (runeType) {
        case DOTA_RUNES.DOTA_RUNE_DOUBLEDAMAGE:
            modifier = pickingHero.AddNewModifier(undefined, undefined, "modifier_rune_doubledamage", { duration: runesDuration })
            EmitSoundOnLocationForAllies(pickingHero.GetAbsOrigin(), "Rune.DD", pickingHero)
            particleFx = ParticleManager.CreateParticle("particles/generic_gameplay/rune_doubledamage_owner.vpcf", ParticleAttachment_t.PATTACH_ABSORIGIN_FOLLOW, pickingHero)
            ParticleManager.SetParticleControlEnt(particleFx, 0, pickingHero, ParticleAttachment_t.PATTACH_POINT_FOLLOW, "attach_hitloc", pickingHero.GetAbsOrigin(), true)
            modifier.AddParticle(particleFx, false, false, -1, false, false)
            break;

        case DOTA_RUNES.DOTA_RUNE_HASTE:
            modifier = pickingHero.AddNewModifier(undefined, undefined, "modifier_rune_haste", { duration: runesDuration })
            EmitSoundOnLocationForAllies(pickingHero.GetAbsOrigin(), "Rune.Haste", pickingHero)
            particleFx = ParticleManager.CreateParticle("particles/generic_gameplay/rune_haste_owner.vpcf", ParticleAttachment_t.PATTACH_ABSORIGIN_FOLLOW, pickingHero)
            modifier.AddParticle(particleFx, false, false, -1, false, false)
            break;

        case DOTA_RUNES.DOTA_RUNE_REGENERATION:
            EmitSoundOnLocationForAllies(pickingHero.GetAbsOrigin(), "Rune.Regen", pickingHero)
            modifier = pickingHero.AddNewModifier(undefined, undefined, "modifier_rune_regen", { duration: runesDuration })
            particleFx = ParticleManager.CreateParticle("particles/generic_gameplay/rune_regen_owner.vpcf", ParticleAttachment_t.PATTACH_ABSORIGIN_FOLLOW, pickingHero)
            modifier.AddParticle(particleFx, false, false, -1, false, false)
            break;

        case DOTA_RUNES.DOTA_RUNE_ARCANE:
            modifier = pickingHero.AddNewModifier(undefined, undefined, "modifier_rune_arcane", { duration: runesDuration })
            EmitSoundOnLocationForAllies(pickingHero.GetAbsOrigin(), "Rune.Arcane", pickingHero)
            particleFx = ParticleManager.CreateParticle("particles/generic_gameplay/rune_arcane_owner.vpcf", ParticleAttachment_t.PATTACH_ABSORIGIN_FOLLOW, pickingHero)
            modifier.AddParticle(particleFx, false, false, -1, false, false)
            break;

        case DOTA_RUNES.DOTA_RUNE_INVISIBILITY:
            pickingHero.AddNewModifier(undefined, undefined, "modifier_rune_invis", { duration: runesDuration })
            EmitSoundOnLocationForAllies(pickingHero.GetAbsOrigin(), "Rune.Invis", pickingHero)
            break;

        case DOTA_RUNES.DOTA_RUNE_ILLUSION:
            CreateIllusions(pickingHero, pickingHero, { outgoing_damage: 35, incoming_damage: 200 }, 2, 96, true, true)
            EmitSoundOnLocationForAllies(pickingHero.GetAbsOrigin(), "Rune.Illusion", pickingHero)
            break;

        default:
            break;
    }
}
