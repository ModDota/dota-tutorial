import * as tut from "../../Tutorial/Core";
import * as tg from "../../TutorialGraph/index";
import { RequiredState } from "../../Tutorial/RequiredState";
import { GoalTracker } from "../../Goals";
import { findRealPlayerID, getOrError, getPlayerHero } from "../../util";

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
};

function onStart(complete: () => void) {
    print("Starting", sectionName);

    const playerHero = getOrError(getPlayerHero())

    const radiantTopBountyPos = Entities.FindAllByName("dota_item_rune_spawner_bounty")[0].GetAbsOrigin()
    const radiantAncientsBountyPos = Entities.FindAllByName("dota_item_rune_spawner_bounty")[1].GetAbsOrigin()
    const direBotBountyPos = Entities.FindAllByName("dota_item_rune_spawner_bounty")[2].GetAbsOrigin()
    const direAncientsBountyPos = Entities.FindAllByName("dota_item_rune_spawner_bounty")[3].GetAbsOrigin()

    const topPowerUpRunePos = Entities.FindAllByName("dota_item_rune_spawner_powerup")[0].GetAbsOrigin()

    let radiantTopBounty = CreateRune(radiantTopBountyPos, RuneType.BOUNTY)
    let radiantAncientsBounty = CreateRune(radiantAncientsBountyPos, RuneType.BOUNTY)
    let direBotBounty = CreateRune(direBotBountyPos, RuneType.BOUNTY)
    let direAncientsBounty = CreateRune(direAncientsBountyPos, RuneType.BOUNTY)

    let visionRevealDuration = 2

    const goalTracker = new GoalTracker();
    const goalMoveToRune = goalTracker.addBoolean("Move to the marker near the power rune spawn.");
    const goalPickupRune = goalTracker.addBoolean("Pick up the double damage rune.");

    graph = tg.withGoals(_ => goalTracker.getGoals(),
        tg.seq([
            tg.wait(1),
            tg.textDialog(LocalizationKey.Script_5_Opening_1, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
            tg.textDialog(LocalizationKey.Script_5_Opening_2, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
            tg.fork([
                tg.textDialog(LocalizationKey.Script_5_Opening_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 15),
                tg.seq([
                    tg.setCameraTarget(radiantTopBounty),
                    tg.wait(1),
                    tg.panCameraLinear(radiantTopBountyPos, radiantAncientsBountyPos, 2),
                    // Slightly correct panCamera targeting
                    tg.setCameraTarget(radiantAncientsBounty),
                    tg.immediate((ctx) => {
                        ctx[CustomEntityKeys.RadiantAncientsBountyFOWViewer] = AddFOWViewer(DotaTeam.GOODGUYS, radiantAncientsBountyPos, 800, visionRevealDuration, false)
                    }),
                    tg.wait(visionRevealDuration),
                    tg.panCameraLinear(radiantAncientsBountyPos, direBotBountyPos, 4),
                    tg.setCameraTarget(direBotBounty),
                    tg.immediate((ctx) => {
                        RemoveFOWViewer(DotaTeam.GOODGUYS, ctx[CustomEntityKeys.RadiantAncientsBountyFOWViewer])
                        ctx[CustomEntityKeys.DireBotBountyFOWViewer] = AddFOWViewer(DotaTeam.GOODGUYS, direBotBountyPos, 800, visionRevealDuration, false)
                    }),
                    tg.wait(visionRevealDuration),
                    tg.panCameraLinear(direBotBountyPos, direAncientsBountyPos, 2),
                    tg.setCameraTarget(direAncientsBounty),
                    tg.immediate((ctx) => {
                        RemoveFOWViewer(DotaTeam.GOODGUYS, ctx[CustomEntityKeys.DireBotBountyFOWViewer])
                        ctx[CustomEntityKeys.DireAncientsBountyFOWViewer] = AddFOWViewer(DotaTeam.GOODGUYS, direAncientsBountyPos, 800, visionRevealDuration, false)
                    }),
                    tg.wait(visionRevealDuration),
                ]),
            ]),
            tg.immediate(ctx => {
                RemoveFOWViewer(DotaTeam.GOODGUYS, ctx[CustomEntityKeys.DireAncientsBountyFOWViewer])
            }),
            tg.fork([
                tg.textDialog(LocalizationKey.Script_5_Opening_4, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 6),
                tg.panCameraLinear(direAncientsBountyPos, playerHero.GetAbsOrigin(), 3),
            ]),
            tg.textDialog(LocalizationKey.Script_5_Opening_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 4),
            tg.textDialog(LocalizationKey.Script_5_Opening_6, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 3),
            tg.fork([
                tg.seq([
                    tg.panCameraLinear(playerHero.GetAbsOrigin(), topPowerUpRunePos, 2),
                    tg.wait(1),
                    tg.setCameraTarget(playerHero),
                    tg.immediate(() => {
                        canPlayerIssueOrders = true
                        goalMoveToRune.start()
                    }),
                ]),
                tg.goToLocation(topPowerUpRunePos.__add(Vector(-300, 100, 0))),
            ]),
            tg.immediate(ctx => {
                canPlayerIssueOrders = false
                goalMoveToRune.complete()
            }),
            tg.textDialog(LocalizationKey.Script_5_Opening_7, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 8),
            tg.textDialog(LocalizationKey.Script_5_Opening_8, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 8),
            tg.textDialog(LocalizationKey.Script_5_Opening_9, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
            tg.immediate(ctx => {
                CreateRune(topPowerUpRunePos, RuneType.DOUBLEDAMAGE)
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
