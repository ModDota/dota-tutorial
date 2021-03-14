import * as tut from "../../Tutorial/Core";
import * as tg from "../../TutorialGraph/index";
import { RequiredState } from "../../Tutorial/RequiredState";
import { GoalTracker } from "../../Goals";
import { centerCameraOnHero, findRealPlayerID, getOrError, getPlayerCameraLocation, getPlayerHero, setUnitPacifist, unitIsValidAndAlive, useAbility } from "../../util";
import { chapter5Blockades, disposeHeroes, HeroInfo, outsidePitLocation, roshanLocation, runeSpawnsLocations } from "./Shared";

const sectionName: SectionName = SectionName.Chapter5_Opening;

let graph: tg.TutorialStep | undefined = undefined
let canPlayerIssueOrders = false;

const requiredState: RequiredState = {
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    slacksLocation: Vector(-5906, -3892, 256),
    sunsFanLocation: Vector(-5500, -4170, 256),
    heroLocation: Vector(-4150, 2568, 0),
    heroLocationTolerance: 800,
    heroLevel: 6,
    heroAbilityMinLevels: [1, 1, 1, 1],
    blockades: [
        chapter5Blockades.direJungleLowgroundRiver,
        chapter5Blockades.topLaneRiver,
        chapter5Blockades.radiantSecretShopRiver,
        chapter5Blockades.direOutpostRiver,
        chapter5Blockades.roshan,
        chapter5Blockades.radiantAncientsRiver,
        chapter5Blockades.radiantMidTopRiver,
        chapter5Blockades.direMidTopRiver,
        chapter5Blockades.midRiverTopSide,
    ],
    requireBountyRunes: true,
    requireRoshan: true,
    roshanHitsLikeATruck: true,
};

const powerRuneRangersInfo: HeroInfo[] = [
    { name: CustomNpcKeys.Juggernaut },
    { name: CustomNpcKeys.Mirana },
    { name: CustomNpcKeys.MiranaIllusionOne },
    { name: CustomNpcKeys.MiranaIllusionTwo },
    { name: CustomNpcKeys.CrystalMaiden },
    { name: CustomNpcKeys.Lion },
    { name: CustomNpcKeys.Zuus },
    { name: CustomNpcKeys.StormSpirit },
];

const othersInfo: HeroInfo[] = [
    { name: CustomNpcKeys.Sniper }
]

function onStart(complete: () => void) {
    print("Starting", sectionName);

    const playerHero = getOrError(getPlayerHero())

    let visionRevealDuration = 1
    const slowerCameraSpeedFunc = () => 2500
    const fasterCameraSpeedFunc = () => 5000

    const goalTracker = new GoalTracker();
    const goalMoveToRune = goalTracker.addBoolean("Move to the marker near the power rune spawn.");
    const goalWatchRangers = goalTracker.addBoolean("Watch and learn from the Power Rune Rangers!");

    const powerRangerSpawnLocation = Vector(-1760, 1850, 0)

    const rangerLineStart = Vector(-2119, 770, 0)
    const rangerMiddlePoint = Vector(-1350, 775, 0)
    const rangerLineEnd = Vector(-1350, 1400, 0)
    const rangerFirstLineDirection = ((rangerMiddlePoint - rangerLineStart) as Vector).Normalized()
    const rangerSecondLineDirection = ((rangerLineEnd - rangerMiddlePoint) as Vector).Normalized()

    const runesDuration = 100

    const roshan = Entities.FindAllByName(CustomNpcKeys.Roshan)[0] as CDOTA_BaseNPC

    graph = tg.withGoals(_ => goalTracker.getGoals(),
        tg.seq([
            tg.immediate(_ => canPlayerIssueOrders = false),
            tg.wait(1),
            tg.panCameraLinear(_ => getPlayerCameraLocation(), _ => playerHero.GetAbsOrigin(), 1),
            tg.audioDialog(LocalizationKey.Script_5_Opening_1, LocalizationKey.Script_5_Opening_1, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.audioDialog(LocalizationKey.Script_5_Opening_2, LocalizationKey.Script_5_Opening_2, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.fork([
                tg.audioDialog(LocalizationKey.Script_5_Opening_3, LocalizationKey.Script_5_Opening_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
                // Pan camera over bounty rune spawns
                tg.seq([
                    tg.panCameraLinear(_ => getPlayerCameraLocation(), runeSpawnsLocations.radiantTopBountyPos, 1),
                    tg.panCamera(runeSpawnsLocations.radiantTopBountyPos, runeSpawnsLocations.radiantAncientsBountyPos, slowerCameraSpeedFunc),
                    // Slightly correct panCamera targeting
                    tg.setCameraTarget((ctx) => ctx[CustomEntityKeys.RadiantAncientsBountyRune]),
                    tg.immediate((ctx) => {
                        ctx[CustomEntityKeys.RadiantAncientsBountyFOWViewer] = AddFOWViewer(DotaTeam.GOODGUYS, runeSpawnsLocations.radiantAncientsBountyPos, 800, visionRevealDuration, false)
                    }),
                    tg.wait(visionRevealDuration),
                    tg.panCamera(runeSpawnsLocations.radiantAncientsBountyPos, runeSpawnsLocations.direBotBountyPos, fasterCameraSpeedFunc),
                    tg.setCameraTarget((ctx) => ctx[CustomEntityKeys.DireBotBountyRune]),
                    tg.immediate((ctx) => {
                        RemoveFOWViewer(DotaTeam.GOODGUYS, ctx[CustomEntityKeys.RadiantAncientsBountyFOWViewer])
                        ctx[CustomEntityKeys.DireBotBountyFOWViewer] = AddFOWViewer(DotaTeam.GOODGUYS, runeSpawnsLocations.direBotBountyPos, 800, visionRevealDuration, false)
                    }),
                    tg.wait(visionRevealDuration),
                    tg.panCamera(runeSpawnsLocations.direBotBountyPos, runeSpawnsLocations.direAncientsBountyPos, slowerCameraSpeedFunc),
                    tg.setCameraTarget((ctx) => ctx[CustomEntityKeys.DireAncientsBountyRune]),
                    tg.immediate((ctx) => {
                        RemoveFOWViewer(DotaTeam.GOODGUYS, ctx[CustomEntityKeys.DireBotBountyFOWViewer])
                        ctx[CustomEntityKeys.DireAncientsBountyFOWViewer] = AddFOWViewer(DotaTeam.GOODGUYS, runeSpawnsLocations.direAncientsBountyPos, 800, visionRevealDuration, false)
                    }),
                    tg.wait(visionRevealDuration),
                    tg.immediate(ctx => {
                        RemoveFOWViewer(DotaTeam.GOODGUYS, ctx[CustomEntityKeys.DireAncientsBountyFOWViewer])
                    }),
                ]),
            ]),
            // Return camera to player
            tg.fork([
                tg.audioDialog(LocalizationKey.Script_5_Opening_4, LocalizationKey.Script_5_Opening_4, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
                tg.panCamera(runeSpawnsLocations.direAncientsBountyPos, _ => playerHero.GetAbsOrigin(), fasterCameraSpeedFunc),
            ]),
            tg.audioDialog(LocalizationKey.Script_5_Opening_5, LocalizationKey.Script_5_Opening_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.audioDialog(LocalizationKey.Script_5_Opening_6, LocalizationKey.Script_5_Opening_6, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.fork([
                tg.seq([
                    tg.panCamera(_ => getPlayerCameraLocation(), runeSpawnsLocations.topPowerUpRunePos, slowerCameraSpeedFunc),
                    tg.wait(1),
                    tg.setCameraTarget(undefined),
                    tg.immediate(_ => centerCameraOnHero()),
                    tg.immediate((ctx) => {
                        canPlayerIssueOrders = true
                        goalMoveToRune.start()
                        if (IsValidEntity(ctx[CustomEntityKeys.TopPowerRune])) {
                            ctx[CustomEntityKeys.TopPowerRune].Destroy()
                            ctx[CustomEntityKeys.TopPowerRune] = undefined
                        }
                    }),
                ]),
                tg.goToLocation(runeSpawnsLocations.topPowerUpRunePos.__add(Vector(-300, 100, 0)), [GetGroundPosition(Vector(-3250, 1600), undefined)]),
            ]),
            tg.immediate(_ => {
                canPlayerIssueOrders = false
                setUnitPacifist(playerHero, true)
                goalMoveToRune.complete()
            }),
            tg.audioDialog(LocalizationKey.Script_5_Opening_7, LocalizationKey.Script_5_Opening_7, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.immediate(_ => {
                goalWatchRangers.start()
            }),
            // DD power rune ranger sequence
            tg.spawnUnit(CustomNpcKeys.Juggernaut, powerRangerSpawnLocation, DotaTeam.GOODGUYS, CustomNpcKeys.Juggernaut, true),
            tg.setCameraTarget(ctx => ctx[CustomNpcKeys.Juggernaut]),
            tg.immediate(ctx => {
                ctx[CustomEntityKeys.TopPowerRune] = CreateRune(runeSpawnsLocations.topPowerUpRunePos, RuneType.DOUBLEDAMAGE)
            }),
            tg.spawnUnit(CustomNpcKeys.Sniper, rangerLineStart, DotaTeam.BADGUYS, CustomNpcKeys.Sniper, true),
            tg.immediate((ctx) => setUnitPacifist(ctx[CustomNpcKeys.Sniper], true)),
            tg.moveUnit(ctx => ctx[CustomNpcKeys.Juggernaut], runeSpawnsLocations.topPowerUpRunePos),
            tg.immediate((ctx) => ctx[CustomNpcKeys.Juggernaut].PickupRune(ctx[CustomEntityKeys.TopPowerRune])),
            tg.textDialog(LocalizationKey.Script_5_Opening_8, ctx => ctx[CustomNpcKeys.Juggernaut], 2),
            tg.immediate((ctx) => {
                ctx[CustomNpcKeys.Juggernaut].AddNewModifier(ctx[CustomNpcKeys.Juggernaut], undefined, "modifier_rune_doubledamage", { duration: runesDuration })
            }),
            tg.immediate((ctx) => setUnitPacifist(ctx[CustomNpcKeys.Sniper], false)),
            tg.completeOnCheck((ctx) => !unitIsValidAndAlive(ctx[CustomNpcKeys.Sniper]), 1),
            tg.moveUnit(ctx => ctx[CustomNpcKeys.Juggernaut], rangerLineStart),
            tg.faceTowards(ctx => ctx[CustomNpcKeys.Juggernaut], () => playerHero.GetAbsOrigin()),
            tg.wait(1),
            // Illusions power rune ranger sequence
            tg.spawnUnit(CustomNpcKeys.Mirana, powerRangerSpawnLocation, DotaTeam.GOODGUYS, CustomNpcKeys.Mirana, true),
            tg.setCameraTarget(ctx => ctx[CustomNpcKeys.Mirana]),
            tg.immediate(ctx => {
                ctx[CustomEntityKeys.TopPowerRune] = CreateRune(runeSpawnsLocations.topPowerUpRunePos, RuneType.ILLUSION)
            }),
            tg.moveUnit(ctx => ctx[CustomNpcKeys.Mirana], runeSpawnsLocations.topPowerUpRunePos),
            tg.immediate((ctx) => ctx[CustomNpcKeys.Mirana].PickupRune(ctx[CustomEntityKeys.TopPowerRune])),
            tg.textDialog(LocalizationKey.Script_5_Opening_9, ctx => ctx[CustomNpcKeys.Mirana], 2),
            tg.immediate((ctx) => {
                const miranaEntities = Entities.FindAllByNameWithin(CustomNpcKeys.Mirana, ctx[CustomNpcKeys.Mirana].GetAbsOrigin(), 200) as CDOTA_BaseNPC_Hero[]
                for (const miranaEntity of miranaEntities) {
                    if (miranaEntity.IsIllusion()) {
                        miranaEntity.AddNewModifier(miranaEntity, undefined, "modifier_illusion", { duration: runesDuration })
                        if (!ctx[CustomNpcKeys.MiranaIllusionOne])
                            ctx[CustomNpcKeys.MiranaIllusionOne] = miranaEntity
                        else
                            ctx[CustomNpcKeys.MiranaIllusionTwo] = miranaEntity
                    }
                }
            }),
            tg.fork([
                tg.moveUnit(ctx => ctx[CustomNpcKeys.Mirana], rangerLineStart.__add(rangerFirstLineDirection * 300 as Vector)),
                tg.moveUnit(ctx => ctx[CustomNpcKeys.MiranaIllusionOne], rangerLineStart.__add(rangerFirstLineDirection * 250 as Vector)),
                tg.moveUnit(ctx => ctx[CustomNpcKeys.MiranaIllusionTwo], rangerLineStart.__add(rangerFirstLineDirection * 350 as Vector)),
            ]),
            tg.fork([
                tg.faceTowards(ctx => ctx[CustomNpcKeys.Mirana], () => playerHero.GetAbsOrigin()),
                tg.faceTowards(ctx => ctx[CustomNpcKeys.MiranaIllusionOne], () => playerHero.GetAbsOrigin()),
                tg.faceTowards(ctx => ctx[CustomNpcKeys.MiranaIllusionTwo], () => playerHero.GetAbsOrigin()),
            ]),
            // Invisibility power rune ranger sequence
            tg.spawnUnit(CustomNpcKeys.CrystalMaiden, powerRangerSpawnLocation, DotaTeam.GOODGUYS, CustomNpcKeys.CrystalMaiden, true),
            tg.setCameraTarget(ctx => ctx[CustomNpcKeys.CrystalMaiden]),
            tg.immediate(ctx => {
                ctx[CustomEntityKeys.TopPowerRune] = CreateRune(runeSpawnsLocations.topPowerUpRunePos, RuneType.INVISIBILITY)
            }),
            tg.moveUnit(ctx => ctx[CustomNpcKeys.CrystalMaiden], runeSpawnsLocations.topPowerUpRunePos),
            tg.immediate((ctx) => ctx[CustomNpcKeys.CrystalMaiden].PickupRune(ctx[CustomEntityKeys.TopPowerRune])),
            tg.textDialog(LocalizationKey.Script_5_Opening_10, ctx => ctx[CustomNpcKeys.CrystalMaiden], 2),
            tg.immediate((ctx) => {
                ctx[CustomNpcKeys.CrystalMaiden].AddNewModifier(ctx[CustomNpcKeys.CrystalMaiden], undefined, "modifier_rune_invis", { duration: runesDuration })
            }),
            tg.moveUnit(ctx => ctx[CustomNpcKeys.CrystalMaiden], rangerLineStart.__add(rangerFirstLineDirection * 600 as Vector)),
            tg.faceTowards(ctx => ctx[CustomNpcKeys.CrystalMaiden], () => playerHero.GetAbsOrigin()),
            // Arcane power rune ranger sequence
            tg.spawnUnit(CustomNpcKeys.Zuus, powerRangerSpawnLocation, DotaTeam.GOODGUYS, CustomNpcKeys.Zuus, true),
            tg.setCameraTarget(ctx => ctx[CustomNpcKeys.Zuus]),
            tg.immediate(ctx => {
                ctx[CustomEntityKeys.TopPowerRune] = CreateRune(runeSpawnsLocations.topPowerUpRunePos, RuneType.ARCANE)
            }),
            tg.moveUnit(ctx => ctx[CustomNpcKeys.Zuus], runeSpawnsLocations.topPowerUpRunePos),
            tg.immediate((ctx) => ctx[CustomNpcKeys.Zuus].PickupRune(ctx[CustomEntityKeys.TopPowerRune])),
            tg.textDialog(LocalizationKey.Script_5_Opening_11, ctx => ctx[CustomNpcKeys.Zuus], 2),
            tg.immediate((ctx) => {
                ctx[CustomNpcKeys.Zuus].AddNewModifier(ctx[CustomNpcKeys.Zuus], undefined, "modifier_rune_arcane", { duration: runesDuration })
            }),
            tg.immediate((ctx) => ctx[CustomNpcKeys.Zuus].FindAbilityByName("zuus_lightning_bolt").SetLevel(1)),
            tg.immediate((ctx) => useAbility(ctx[CustomNpcKeys.Zuus], runeSpawnsLocations.topPowerUpRunePos.__add(Vector(0, 200, 0)), "zuus_lightning_bolt", UnitOrder.CAST_POSITION)),
            tg.wait(1),
            tg.moveUnit(ctx => ctx[CustomNpcKeys.Zuus], rangerMiddlePoint.__add(rangerSecondLineDirection * 300 as Vector)),
            tg.faceTowards(ctx => ctx[CustomNpcKeys.Zuus], () => playerHero.GetAbsOrigin()),
            tg.immediate((ctx) => {
                const zuusUnit = ctx[CustomNpcKeys.Zuus] as CDOTA_BaseNPC_Hero
                const lightingBolt = zuusUnit.FindAbilityByName("zuus_lightning_bolt")
                lightingBolt!.EndCooldown()
            }),
            tg.immediate((ctx) => useAbility(ctx[CustomNpcKeys.Zuus], runeSpawnsLocations.topPowerUpRunePos.__add(Vector(0, 200, 0)), "zuus_lightning_bolt", UnitOrder.CAST_POSITION)),
            tg.wait(1),
            // Haste power rune ranger sequence
            tg.spawnUnit(CustomNpcKeys.Lion, powerRangerSpawnLocation, DotaTeam.GOODGUYS, CustomNpcKeys.Lion, true),
            tg.setCameraTarget(ctx => ctx[CustomNpcKeys.Lion]),
            tg.immediate(ctx => {
                ctx[CustomEntityKeys.TopPowerRune] = CreateRune(runeSpawnsLocations.topPowerUpRunePos, RuneType.HASTE)
            }),
            tg.moveUnit(ctx => ctx[CustomNpcKeys.Lion], runeSpawnsLocations.topPowerUpRunePos),
            tg.immediate((ctx) => ctx[CustomNpcKeys.Lion].PickupRune(ctx[CustomEntityKeys.TopPowerRune])),
            tg.fork([
                tg.textDialog(LocalizationKey.Script_5_Opening_12, ctx => ctx[CustomNpcKeys.Lion], 8),
                tg.immediate((ctx) => {
                    ctx[CustomNpcKeys.Lion].AddNewModifier(ctx[CustomNpcKeys.Lion], undefined, "modifier_rune_haste", { duration: runesDuration })
                }),
                tg.moveUnitSequence(ctx => ctx[CustomNpcKeys.Lion], (ctx) => {
                    const aroundPlayer = getPointsAroundCenter(playerHero.GetAbsOrigin(), false, false, true)
                    const aroundJuggernaut = getPointsAroundCenter(ctx[CustomNpcKeys.Juggernaut].GetAbsOrigin(), false, false, true)
                    const aroundMirana = getPointsAroundCenter(ctx[CustomNpcKeys.Mirana].GetAbsOrigin(), true, true, true)
                    const aroundCm = getPointsAroundCenter(ctx[CustomNpcKeys.CrystalMaiden].GetAbsOrigin(), true, true, false)
                    const aroundZuus = getPointsAroundCenter(ctx[CustomNpcKeys.Zuus].GetAbsOrigin(), false, false, false)
                    return [
                        ...aroundPlayer,
                        ...aroundJuggernaut,
                        ...aroundMirana,
                        ...aroundCm,
                        ...aroundZuus,
                        rangerMiddlePoint.__add(rangerSecondLineDirection * 600 as Vector)
                    ]
                }),
            ]),
            tg.faceTowards(ctx => ctx[CustomNpcKeys.Lion], () => playerHero.GetAbsOrigin()),
            // Regen power rune ranger sequence
            tg.spawnUnit(CustomNpcKeys.StormSpirit, powerRangerSpawnLocation, DotaTeam.GOODGUYS, CustomNpcKeys.StormSpirit, true),
            tg.immediate((ctx) => {
                ctx[CustomNpcKeys.StormSpirit].SetHealth(100)
                ctx[CustomNpcKeys.StormSpirit].SetMana(150)
                // Lvl up to 6
                ctx[CustomNpcKeys.StormSpirit].AddExperience(5, ModifyXpReason.UNSPECIFIED, false, false)
            }),
            tg.setCameraTarget(ctx => ctx[CustomNpcKeys.StormSpirit]),
            tg.textDialog(LocalizationKey.Script_5_Opening_13, ctx => ctx[CustomNpcKeys.StormSpirit], 2),
            tg.immediate(ctx => {
                ctx[CustomEntityKeys.TopPowerRune] = CreateRune(runeSpawnsLocations.topPowerUpRunePos, RuneType.REGENERATION)
            }),
            tg.moveUnit(ctx => ctx[CustomNpcKeys.StormSpirit], runeSpawnsLocations.topPowerUpRunePos),
            tg.immediate((ctx) => ctx[CustomNpcKeys.StormSpirit].PickupRune(ctx[CustomEntityKeys.TopPowerRune])),
            tg.textDialog(LocalizationKey.Script_5_Opening_14, ctx => ctx[CustomNpcKeys.StormSpirit], 2),
            tg.wait(2),
            tg.immediate((ctx) => {
                const hero = ctx[CustomNpcKeys.StormSpirit] as CDOTA_BaseNPC_Hero
                if (hero) {
                    hero.FindAbilityByName("storm_spirit_ball_lightning")!.SetLevel(1)
                    useAbility(hero,
                        rangerMiddlePoint.__add(rangerSecondLineDirection * 900 as Vector),
                        "storm_spirit_ball_lightning",
                        UnitOrder.CAST_POSITION
                    )
                }
            }),
            tg.wait(1),
            tg.faceTowards(ctx => ctx[CustomNpcKeys.StormSpirit], () => playerHero.GetAbsOrigin()),
            tg.setCameraTarget(ctx => ctx[CustomNpcKeys.CrystalMaiden]),
            tg.fork([
                tg.textDialog(LocalizationKey.Script_5_Opening_15, ctx => ctx[CustomNpcKeys.CrystalMaiden], 4),
            ]),
            tg.immediate(_ => {
                goalWatchRangers.complete()
                chapter5Blockades.roshan.destroy()
            }),
            tg.playGlobalSound("RoshanDT.Scream"),
            tg.fork([
                tg.moveUnit(roshan, runeSpawnsLocations.topPowerUpRunePos),
                tg.setCameraTarget(roshan),
            ]),
            tg.immediate((ctx) => roshan.MoveToPositionAggressive(ctx[CustomNpcKeys.Juggernaut].GetAbsOrigin())),
            tg.fork(powerRuneRangersInfo.map((powerRuneRanger) => {
                return tg.immediate((ctx) => {
                    if (unitIsValidAndAlive(ctx[powerRuneRanger.name]))
                        ctx[powerRuneRanger.name].SetForceAttackTarget(roshan)
                })
            })),
            tg.setCameraTarget(undefined),
            tg.immediate(() => canPlayerIssueOrders = true),
            tg.fork([
                tg.seq([
                    tg.audioDialog(LocalizationKey.Script_5_Opening_16, LocalizationKey.Script_5_Opening_16, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
                    tg.immediate(() => canPlayerIssueOrders = false),
                ]),
                tg.seq([
                    tg.fork(powerRuneRangersInfo.map((powerRuneRanger) =>
                        tg.completeOnCheck(ctx => !unitIsValidAndAlive(ctx[powerRuneRanger.name]), 2)
                    )),
                    tg.moveUnit(roshan, roshanLocation),
                    tg.faceTowards(roshan, outsidePitLocation),
                ]),
            ]),
            tg.immediate((ctx) => disposeHeroes(ctx, powerRuneRangersInfo.concat(othersInfo))),
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

    disposeHeroes(GameRules.Addon.context, powerRuneRangersInfo.concat(othersInfo))

    if (graph) {
        graph.stop(GameRules.Addon.context);
        graph = undefined;
    }
}

function chapterFiveOpeningOrderFilter(event: ExecuteOrderFilterEvent): boolean {
    // Allow all orders that aren't done by the player
    if (event.issuer_player_id_const != findRealPlayerID()) return true;

    if (!canPlayerIssueOrders) return false;

    return true;
}

export const sectionOpening = new tut.FunctionalSection(
    sectionName,
    requiredState,
    onStart,
    onStop,
    chapterFiveOpeningOrderFilter
);

function getPointsAroundCenter(centerPoint: Vector, halfCircle?: boolean, startLeft?: boolean, clockwise?: boolean): Vector[] {
    let pointsAroundCenterArray: Vector[] = []
    let angle = 0
    const radius = 100
    let numberOfPoints = 4

    if (clockwise)
        angle = -2 * math.pi / numberOfPoints
    else
        angle = 2 * math.pi / numberOfPoints

    if (halfCircle)
        numberOfPoints = numberOfPoints / 2

    for (let i = 0; i <= numberOfPoints; i++) {
        const direction = Vector(math.cos(angle * i), math.sin(angle * i))
        if (startLeft)
            pointsAroundCenterArray.push(centerPoint.__sub((direction * radius) as Vector))
        else
            pointsAroundCenterArray.push(centerPoint.__add((direction * radius) as Vector))
    }

    return pointsAroundCenterArray
}
