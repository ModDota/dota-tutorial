import * as tut from "../../Tutorial/Core";
import * as tg from "../../TutorialGraph/index";
import { RequiredState } from "../../Tutorial/RequiredState";
import { GoalTracker } from "../../Goals";
import { findRealPlayerID, getOrError, getPlayerHero, useAbility } from "../../util";
import { chapter5Blockades, runeSpawnsLocations } from "./Shared";

const sectionName: SectionName = SectionName.Chapter5_Opening;

let graph: tg.TutorialStep | undefined = undefined
let canPlayerIssueOrders = false;

const requiredState: RequiredState = {
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    slacksLocation: Vector(-5906, -3892, 256),
    sunsFanLocation: Vector(-5500, -4170, 256),
    // heroLocation: Vector(-4150, 2568, 0), REVERT TO THIS!!
    heroLocation: runeSpawnsLocations.topPowerUpRunePos,
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
        // chapter5Blockades.radiantMidTopRiver,
        // chapter5Blockades.direMidTopRiver,
        // chapter5Blockades.midRiverTopSide,
    ],
    requireBountyRunes: true
};

function onStart(complete: () => void) {
    print("Starting", sectionName);

    const playerHero = getOrError(getPlayerHero())

    let visionRevealDuration = 2

    const goalTracker = new GoalTracker();
    const goalMoveToRune = goalTracker.addBoolean("Move to the marker near the power rune spawn.");
    const goalPickupRune = goalTracker.addBoolean("Pick up the double damage rune.");

    const powerRangerSpawnLocation = Vector(-1760, 1850, 0)

    const rangerLineStart = Vector(-1819, 670, 0)
    const rangerMiddlePoint = Vector(-1301, 675, 0)
    const rangerLineEnd = Vector(-1191, 1260, 0)
    const rangerFirstLineDirection = ((rangerMiddlePoint - rangerLineStart) as Vector).Normalized()
    const rangerSecondLineDirection = ((rangerLineEnd - rangerLineStart) as Vector).Normalized()

    graph = tg.withGoals(_ => goalTracker.getGoals(),
        tg.seq([
            tg.immediate(ctx => canPlayerIssueOrders = false),
            tg.wait(1),
            tg.audioDialog(LocalizationKey.Script_5_Opening_1, LocalizationKey.Script_5_Opening_1, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
            tg.audioDialog(LocalizationKey.Script_5_Opening_2, LocalizationKey.Script_5_Opening_2, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
            // tg.fork([
            //     tg.audioDialog(LocalizationKey.Script_5_Opening_3, LocalizationKey.Script_5_Opening_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
            //     // Pan camera over bounty rune spawns
            //     tg.seq([
            //         tg.setCameraTarget((ctx) => ctx[CustomEntityKeys.RadiantTopBountyRune]),
            //         tg.wait(1),
            //         tg.panCameraLinear(runeSpawnsLocations.radiantTopBountyPos, runeSpawnsLocations.radiantAncientsBountyPos, 2),
            //         // Slightly correct panCamera targeting
            //         tg.setCameraTarget((ctx) => ctx[CustomEntityKeys.RadiantAncientsBountyRune]),
            //         tg.immediate((ctx) => {
            //             ctx[CustomEntityKeys.RadiantAncientsBountyFOWViewer] = AddFOWViewer(DotaTeam.GOODGUYS, runeSpawnsLocations.radiantAncientsBountyPos, 800, visionRevealDuration, false)
            //         }),
            //         tg.wait(visionRevealDuration),
            //         tg.panCameraLinear(runeSpawnsLocations.radiantAncientsBountyPos, runeSpawnsLocations.direBotBountyPos, 4),
            //         tg.setCameraTarget((ctx) => ctx[CustomEntityKeys.DireBotBountyRune]),
            //         tg.immediate((ctx) => {
            //             RemoveFOWViewer(DotaTeam.GOODGUYS, ctx[CustomEntityKeys.RadiantAncientsBountyFOWViewer])
            //             ctx[CustomEntityKeys.DireBotBountyFOWViewer] = AddFOWViewer(DotaTeam.GOODGUYS, runeSpawnsLocations.direBotBountyPos, 800, visionRevealDuration, false)
            //         }),
            //         tg.wait(visionRevealDuration),
            //         tg.panCameraLinear(runeSpawnsLocations.direBotBountyPos, runeSpawnsLocations.direAncientsBountyPos, 2),
            //         tg.setCameraTarget((ctx) => ctx[CustomEntityKeys.DireAncientsBountyRune]),
            //         tg.immediate((ctx) => {
            //             RemoveFOWViewer(DotaTeam.GOODGUYS, ctx[CustomEntityKeys.DireBotBountyFOWViewer])
            //             ctx[CustomEntityKeys.DireAncientsBountyFOWViewer] = AddFOWViewer(DotaTeam.GOODGUYS, runeSpawnsLocations.direAncientsBountyPos, 800, visionRevealDuration, false)
            //         }),
            //         tg.wait(visionRevealDuration),
            //         tg.immediate(ctx => {
            //             RemoveFOWViewer(DotaTeam.GOODGUYS, ctx[CustomEntityKeys.DireAncientsBountyFOWViewer])
            //         }),
            //     ]),
            // ]),
            // // Return camera to player
            // tg.fork([
            //     tg.audioDialog(LocalizationKey.Script_5_Opening_4, LocalizationKey.Script_5_Opening_4, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
            //     tg.panCameraLinear(runeSpawnsLocations.direAncientsBountyPos, playerHero.GetAbsOrigin(), 3),
            // ]),
            // tg.audioDialog(LocalizationKey.Script_5_Opening_5, LocalizationKey.Script_5_Opening_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
            // tg.audioDialog(LocalizationKey.Script_5_Opening_6, LocalizationKey.Script_5_Opening_6, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
            tg.fork([
                // tg.seq([
                //     tg.panCameraLinear(playerHero.GetAbsOrigin(), runeSpawnsLocations.topPowerUpRunePos, 2),
                //     tg.wait(1),
                //     tg.setCameraTarget(playerHero),
                tg.immediate((ctx) => {
                    canPlayerIssueOrders = true
                    goalMoveToRune.start()
                    if (IsValidEntity(ctx[CustomEntityKeys.TopPowerRune])) {
                        ctx[CustomEntityKeys.TopPowerRune].Destroy()
                        ctx[CustomEntityKeys.TopPowerRune] = undefined
                    }
                }),
                // ]),
                tg.goToLocation(runeSpawnsLocations.topPowerUpRunePos.__add(Vector(-300, 100, 0)), [GetGroundPosition(Vector(-3250, 1600), undefined)]),
            ]),
            tg.immediate(ctx => {
                canPlayerIssueOrders = false
                goalMoveToRune.complete()
            }),
            tg.audioDialog(LocalizationKey.Script_5_Opening_7, LocalizationKey.Script_5_Opening_7, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
            // DD power rune ranger sequence
            tg.spawnUnit(CustomNpcKeys.Juggernaut, powerRangerSpawnLocation, DotaTeam.GOODGUYS, CustomNpcKeys.Juggernaut, true),
            tg.setCameraTarget(ctx => ctx[CustomNpcKeys.Juggernaut]),
            tg.immediate(ctx => {
                ctx[CustomEntityKeys.TopPowerRune] = CreateRune(runeSpawnsLocations.topPowerUpRunePos, RuneType.DOUBLEDAMAGE)
                // let hero = ctx[CustomNpcKeys.Juggernaut] as CDOTA_BaseNPC_Hero
            }),
            tg.moveUnit(ctx => ctx[CustomNpcKeys.Juggernaut], runeSpawnsLocations.topPowerUpRunePos),
            tg.immediate((ctx) => ctx[CustomNpcKeys.Juggernaut].PickupRune(ctx[CustomEntityKeys.TopPowerRune])),
            tg.textDialog(LocalizationKey.Script_5_Opening_8, ctx => ctx[CustomNpcKeys.Juggernaut], 2),
            tg.spawnUnit(CustomNpcKeys.TargetDummy, runeSpawnsLocations.topPowerUpRunePos.__add(Vector(400, 0, 0)), DotaTeam.NEUTRALS, CustomNpcKeys.TargetDummy, true),
            tg.immediate((ctx) => ctx[CustomNpcKeys.Juggernaut].MoveToPositionAggressive(ctx[CustomNpcKeys.TargetDummy].GetAbsOrigin())),
            tg.completeOnCheck((ctx) => !ctx[CustomNpcKeys.TargetDummy].IsAlive(), 2),
            tg.moveUnit(ctx => ctx[CustomNpcKeys.Juggernaut], rangerLineStart),
            tg.faceTowards(ctx => ctx[CustomNpcKeys.Juggernaut], playerHero.GetAbsOrigin()),
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
                        miranaEntity.AddNewModifier(miranaEntity, undefined, "modifier_illusion", { duration: 100 })
                        miranaEntity.MoveToPosition(rangerLineStart.__add(rangerFirstLineDirection * 200 as Vector))
                    }
                }
            }),
            tg.moveUnit(ctx => ctx[CustomNpcKeys.Mirana], rangerLineStart.__add(rangerFirstLineDirection * 200 as Vector)),
            tg.faceTowards(ctx => ctx[CustomNpcKeys.Mirana], playerHero.GetAbsOrigin()),
            tg.immediate((ctx) => {
                const miranaEntities = Entities.FindAllByNameWithin(CustomNpcKeys.Mirana, ctx[CustomNpcKeys.Mirana].GetAbsOrigin(), 200) as CDOTA_BaseNPC_Hero[]
                for (const miranaEntity of miranaEntities) {
                    if (miranaEntity.IsIllusion()) {
                        miranaEntity.FaceTowards(playerHero.GetAbsOrigin())
                    }
                }
            }),
            // Invisibility power rune ranger sequence
            tg.spawnUnit(CustomNpcKeys.CrystalMaiden, powerRangerSpawnLocation, DotaTeam.GOODGUYS, CustomNpcKeys.CrystalMaiden, true),
            tg.setCameraTarget(ctx => ctx[CustomNpcKeys.CrystalMaiden]),
            tg.immediate(ctx => {
                ctx[CustomEntityKeys.TopPowerRune] = CreateRune(runeSpawnsLocations.topPowerUpRunePos, RuneType.INVISIBILITY)
            }),
            tg.moveUnit(ctx => ctx[CustomNpcKeys.CrystalMaiden], runeSpawnsLocations.topPowerUpRunePos),
            tg.immediate((ctx) => ctx[CustomNpcKeys.CrystalMaiden].PickupRune(ctx[CustomEntityKeys.TopPowerRune])),
            tg.textDialog(LocalizationKey.Script_5_Opening_10, ctx => ctx[CustomNpcKeys.CrystalMaiden], 2),
            tg.moveUnit(ctx => ctx[CustomNpcKeys.CrystalMaiden], rangerLineStart.__add(rangerFirstLineDirection * 400 as Vector)),
            tg.faceTowards(ctx => ctx[CustomNpcKeys.CrystalMaiden], playerHero.GetAbsOrigin()),
            // Arcane power rune ranger sequence
            tg.spawnUnit(CustomNpcKeys.Zeus, powerRangerSpawnLocation, DotaTeam.GOODGUYS, CustomNpcKeys.Zeus, true),
            tg.setCameraTarget(ctx => ctx[CustomNpcKeys.Zeus]),
            tg.immediate(ctx => {
                ctx[CustomEntityKeys.TopPowerRune] = CreateRune(runeSpawnsLocations.topPowerUpRunePos, RuneType.ARCANE)
            }),
            tg.moveUnit(ctx => ctx[CustomNpcKeys.Zeus], runeSpawnsLocations.topPowerUpRunePos),
            tg.immediate((ctx) => ctx[CustomNpcKeys.Zeus].PickupRune(ctx[CustomEntityKeys.TopPowerRune])),
            tg.textDialog(LocalizationKey.Script_5_Opening_11, ctx => ctx[CustomNpcKeys.Zeus], 2),
            tg.immediate((ctx) => ctx[CustomNpcKeys.Zeus].FindAbilityByName("zuus_lightning_bolt").SetLevel(1)),
            tg.immediate((ctx) => useAbility(ctx[CustomNpcKeys.Zeus], runeSpawnsLocations.topPowerUpRunePos.__add(Vector(0, 200, 0)), "zuus_lightning_bolt", UnitOrder.CAST_POSITION)),
            tg.completeOnCheck((ctx) => {
                const zeusUnit = ctx[CustomNpcKeys.Zeus] as CDOTA_BaseNPC_Hero
                const lightingBolt = zeusUnit.FindAbilityByName("zuus_lightning_bolt")
                return lightingBolt!.IsCooldownReady()
            }, 2),
            tg.immediate((ctx) => useAbility(ctx[CustomNpcKeys.Zeus], runeSpawnsLocations.topPowerUpRunePos.__add(Vector(0, 200, 0)), "zuus_lightning_bolt", UnitOrder.CAST_POSITION)),
            tg.moveUnit(ctx => ctx[CustomNpcKeys.Zeus], rangerMiddlePoint.__add(rangerSecondLineDirection * 200 as Vector)),
            tg.faceTowards(ctx => ctx[CustomNpcKeys.Zeus], playerHero.GetAbsOrigin()),
            // tg.audioDialog(LocalizationKey.Script_5_Opening_8, LocalizationKey.Script_5_Opening_8, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
            // tg.audioDialog(LocalizationKey.Script_5_Opening_9, LocalizationKey.Script_5_Opening_9, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
            tg.setCameraTarget(playerHero),
            tg.immediate(ctx => {
                canPlayerIssueOrders = true
                goalPickupRune.start()
            }),
            tg.completeOnCheck((ctx) => playerHero.HasModifier("modifier_rune_doubledamage"), 2),
            tg.immediate(ctx => goalPickupRune.complete()),
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
