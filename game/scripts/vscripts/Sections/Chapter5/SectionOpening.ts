import * as tut from "../../Tutorial/Core";
import * as tg from "../../TutorialGraph/index";
import { RequiredState } from "../../Tutorial/RequiredState";
import { GoalTracker } from "../../Goals";
import { findRealPlayerID, getOrError, getPlayerHero } from "../../util";
import { chapter5Blockades, runeSpawnsLocations } from "./Shared";

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
    requireBountyRunes: true
};

function onStart(complete: () => void) {
    print("Starting", sectionName);

    const playerHero = getOrError(getPlayerHero())

    let visionRevealDuration = 2

    const goalTracker = new GoalTracker();
    const goalMoveToRune = goalTracker.addBoolean("Move to the marker near the power rune spawn.");
    const goalPickupRune = goalTracker.addBoolean("Pick up the double damage rune.");

    graph = tg.withGoals(_ => goalTracker.getGoals(),
        tg.seq([
            tg.immediate(ctx => canPlayerIssueOrders = false),
            tg.wait(1),
            tg.textDialog(LocalizationKey.Script_5_Opening_1, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
            tg.textDialog(LocalizationKey.Script_5_Opening_2, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
            tg.fork([
                tg.textDialog(LocalizationKey.Script_5_Opening_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 15),
                // Pan camera over bounty rune spawns
                tg.seq([
                    tg.setCameraTarget((ctx) => ctx[CustomEntityKeys.RadiantTopBountyRune]),
                    tg.wait(1),
                    tg.panCameraLinear(runeSpawnsLocations.radiantTopBountyPos, runeSpawnsLocations.radiantAncientsBountyPos, 2),
                    // Slightly correct panCamera targeting
                    tg.setCameraTarget((ctx) => ctx[CustomEntityKeys.RadiantAncientsBountyRune]),
                    tg.immediate((ctx) => {
                        ctx[CustomEntityKeys.RadiantAncientsBountyFOWViewer] = AddFOWViewer(DotaTeam.GOODGUYS, runeSpawnsLocations.radiantAncientsBountyPos, 800, visionRevealDuration, false)
                    }),
                    tg.wait(visionRevealDuration),
                    tg.panCameraLinear(runeSpawnsLocations.radiantAncientsBountyPos, runeSpawnsLocations.direBotBountyPos, 4),
                    tg.setCameraTarget((ctx) => ctx[CustomEntityKeys.DireBotBountyRune]),
                    tg.immediate((ctx) => {
                        RemoveFOWViewer(DotaTeam.GOODGUYS, ctx[CustomEntityKeys.RadiantAncientsBountyFOWViewer])
                        ctx[CustomEntityKeys.DireBotBountyFOWViewer] = AddFOWViewer(DotaTeam.GOODGUYS, runeSpawnsLocations.direBotBountyPos, 800, visionRevealDuration, false)
                    }),
                    tg.wait(visionRevealDuration),
                    tg.panCameraLinear(runeSpawnsLocations.direBotBountyPos, runeSpawnsLocations.direAncientsBountyPos, 2),
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
                tg.textDialog(LocalizationKey.Script_5_Opening_4, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 6),
                tg.panCameraLinear(runeSpawnsLocations.direAncientsBountyPos, playerHero.GetAbsOrigin(), 3),
            ]),
            tg.textDialog(LocalizationKey.Script_5_Opening_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 4),
            tg.textDialog(LocalizationKey.Script_5_Opening_6, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
            tg.fork([
                tg.seq([
                    tg.panCameraLinear(playerHero.GetAbsOrigin(), runeSpawnsLocations.topPowerUpRunePos, 2),
                    tg.wait(1),
                    tg.setCameraTarget(playerHero),
                    tg.immediate((ctx) => {
                        canPlayerIssueOrders = true
                        goalMoveToRune.start()
                        if (ctx[CustomEntityKeys.TopPowerRune]) {
                            ctx[CustomEntityKeys.TopPowerRune].Destroy()
                        }
                    }),
                ]),
                tg.goToLocation(runeSpawnsLocations.topPowerUpRunePos.__add(Vector(-300, 100, 0))),
            ]),
            tg.immediate(ctx => {
                canPlayerIssueOrders = false
                goalMoveToRune.complete()
            }),
            tg.textDialog(LocalizationKey.Script_5_Opening_7, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 8),
            tg.textDialog(LocalizationKey.Script_5_Opening_8, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 8),
            tg.textDialog(LocalizationKey.Script_5_Opening_9, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
            tg.immediate(ctx => {
                ctx[CustomEntityKeys.TopPowerRune] = CreateRune(runeSpawnsLocations.topPowerUpRunePos, RuneType.DOUBLEDAMAGE)
            }),
            tg.wait(1),
            tg.setCameraTarget(playerHero),
            tg.textDialog(LocalizationKey.Script_5_Opening_10, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 2),
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
