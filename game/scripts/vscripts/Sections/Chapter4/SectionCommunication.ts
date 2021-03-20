import { GoalTracker } from "../../Goals";
import * as tut from "../../Tutorial/Core";
import { RequiredState } from "../../Tutorial/RequiredState";
import * as tg from "../../TutorialGraph/index";
import { displayDotaErrorMessage, findRealPlayerID, getOrError, getPlayerCameraLocation, getPlayerHero, removeContextEntityIfExists } from "../../util";
import * as shared from "./Shared";

const sectionName: SectionName = SectionName.Chapter4_Communication;

let graph: tg.TutorialStep | undefined = undefined

const requiredState: RequiredState = {
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    heroLocation: Vector(-1500, 4000, 256),
    heroLevel: 6,
    heroAbilityMinLevels: [1, 1, 1, 1],
    heroItems: { "item_greater_crit": 1 },
    blockades: Object.values(shared.blockades),
    clearWards: false,
    topDireT1TowerStanding: false,
    topDireT2TowerStanding: false,
    outpostTeam: DotaTeam.GOODGUYS
};

const allyHeroStartLocation = Vector(-3000, 3800, 128);
const bountyRuneLocation = Vector(-3850, 2570);
const tsunamiName = CustomNpcKeys.Tsunami;
const kunkkaName = CustomNpcKeys.Kunkka;
const tsunamiHighgroundLocation = Vector(-2000, 3600, 256)
const kunkkaHighgroundLocation = Vector(-1800, 3800, 256)

const tpHome = (context: tg.TutorialContext, key: CustomNpcKeys) => {
    const hero = getOrError(context[key] as CDOTA_BaseNPC_Hero | undefined)
    const tp = hero.FindItemInInventory("item_tpscroll")
    if (!tp) {
        Warning("Could not find tp for " + key)
    } else {
        const radiantFountain = getOrError(Entities.FindByName(undefined, "ent_dota_fountain_good"));
        hero.CastAbilityOnPosition(radiantFountain.GetAbsOrigin(), tp, 0);
    }
}

function onStart(complete: () => void) {
    print("Starting", sectionName);

    const goalTracker = new GoalTracker();
    const goalPressVoiceChatButton = goalTracker.addBoolean(LocalizationKey.Goal_4_Communication_1);
    const goalChatWheelWP = goalTracker.addBoolean(LocalizationKey.Goal_4_Communication_2);
    const goalGoToTopBountyRune = goalTracker.addBoolean(LocalizationKey.Goal_4_Communication_3);

    const playerHero = getOrError(getPlayerHero(), "Could not find the player's hero.");

    let voicePressed = false;

    graph = tg.withGoals(_ => goalTracker.getGoals(),
        tg.seq([
            tg.immediate(_ => shared.blockades.direJungleLowToHighground.destroy()),

            tg.spawnUnit(tsunamiName, allyHeroStartLocation, DotaTeam.GOODGUYS, tsunamiName, true),
            tg.spawnUnit(kunkkaName, allyHeroStartLocation, DotaTeam.GOODGUYS, kunkkaName, true),
            tg.immediate(context => {
                const kunkka = getOrError(context[kunkkaName] as CDOTA_BaseNPC | undefined);
                kunkka.AddItemByName("item_lotus_orb");
                kunkka.AddItemByName("item_invis_sword");
                kunkka.AddItemByName("item_armlet");
                kunkka.AddItemByName("item_phase_boots");
                kunkka.AddItemByName("item_blade_mail");
                kunkka.AddItemByName("item_monkey_king_bar");
            }),

            // Without the wait kunkka doesn't get a tp
            tg.wait(0.1),
            tg.immediate(context => {
                const kunkka = getOrError(context[kunkkaName] as CDOTA_BaseNPC | undefined);
                kunkka.AddItemByName("item_tpscroll").EndCooldown();

                const tsunami = getOrError(context[tsunamiName] as CDOTA_BaseNPC | undefined);
                tsunami.AddItemByName("item_tpscroll").EndCooldown();
            }),

            tg.setCameraTarget(contex => contex[kunkkaName]),

            tg.fork([
                tg.moveUnit(context => context[kunkkaName], kunkkaHighgroundLocation),
                tg.moveUnit(context => context[tsunamiName], tsunamiHighgroundLocation),
            ]),

            tg.immediate(context => {
                const kunkka = getOrError(context[kunkkaName] as CDOTA_BaseNPC | undefined);
                kunkka.FaceTowards(playerHero.GetAbsOrigin());
                const kotl = getOrError(context[tsunamiName] as CDOTA_BaseNPC | undefined);
                kotl.FaceTowards(playerHero.GetAbsOrigin());
            }),

            tg.audioDialog(LocalizationKey.Script_4_Communication_1, LocalizationKey.Script_4_Communication_1, ctx => ctx[tsunamiName]),
            tg.setCameraTarget(undefined),
            tg.audioDialog(LocalizationKey.Script_4_Communication_2, LocalizationKey.Script_4_Communication_2, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_4_Communication_3, LocalizationKey.Script_4_Communication_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),

            tg.immediate(_ => goalPressVoiceChatButton.start()),
            tg.forkAny([
                tg.seq([
                    tg.waitForVoiceChat(),
                    tg.immediate(_ => voicePressed = true),
                    tg.audioDialog(LocalizationKey.Script_4_Communication_4, LocalizationKey.Script_4_Communication_4, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
                ]),
                tg.seq([
                    tg.wait(8),
                    tg.completeOnCheck(_ => !voicePressed, 0.1),
                ])
            ]),
            tg.immediate(_ => goalPressVoiceChatButton.complete()),

            tg.audioDialog(LocalizationKey.Script_4_Communication_5, LocalizationKey.Script_4_Communication_5, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_4_Communication_6, LocalizationKey.Script_4_Communication_6, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),

            tg.immediate(_ => goalChatWheelWP.start()),
            tg.waitForChatWheel(),
            tg.immediate(_ => goalChatWheelWP.complete()),
            tg.panCameraLinear(_ => getPlayerCameraLocation(), context => context[tsunamiName].GetAbsOrigin(), 1),
            tg.setCameraTarget(context => context[tsunamiName]),
            tg.audioDialog(LocalizationKey.Script_4_Communication_7, LocalizationKey.Script_4_Communication_7, ctx => ctx[tsunamiName]),
            tg.immediate(ctx => tpHome(ctx, tsunamiName)),

            tg.setCameraTarget(context => context[kunkkaName]),
            tg.moveUnit(context => context[kunkkaName], context => context[kunkkaName].GetAbsOrigin().__add(Vector(100, 100))),
            tg.audioDialog(LocalizationKey.Script_4_Communication_8, LocalizationKey.Script_4_Communication_8, ctx => ctx[kunkkaName]),
            tg.audioDialog(LocalizationKey.Script_4_Communication_9, LocalizationKey.Script_4_Communication_9, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_4_Communication_10, LocalizationKey.Script_4_Communication_10, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.audioDialog(LocalizationKey.Script_4_Communication_11, LocalizationKey.Script_4_Communication_11, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_4_Communication_12, LocalizationKey.Script_4_Communication_12, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.showVideo("muting"),
            // TODO: Spam Whoops
            tg.audioDialog(LocalizationKey.Script_4_Communication_13, LocalizationKey.Script_4_Communication_13, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.audioDialog(LocalizationKey.Script_4_Communication_14, LocalizationKey.Script_4_Communication_14, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_4_Communication_15, LocalizationKey.Script_4_Communication_15, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),

            // Kunkka destroy items
            tg.setCameraTarget(context => context[kunkkaName]),
            tg.fork([
                tg.audioDialog(LocalizationKey.Script_4_mason_mad, LocalizationKey.Script_4_mason_mad, ctx => ctx[kunkkaName]),
                tg.loop(context => {
                    const kunkka = getOrError(context[kunkkaName] as CDOTA_BaseNPC | undefined);
                    context[kunkkaName] = kunkka;
                    for (let i = 0; i < 6; i++) {
                        const item = kunkka.GetItemInSlot(i)
                        if (item) {
                            context["ItemToDestroy"] = item;
                            return true;
                        }
                    }
                    return false;

                }, tg.seq([
                    tg.immediate(context => {
                        context[kunkkaName].DropItemAtPosition(context[kunkkaName].GetAbsOrigin().__add(Vector(50, 50)), context["ItemToDestroy"]);
                    }),
                    tg.completeOnCheck(context => !context[kunkkaName].HasItemInInventory((context["ItemToDestroy"] as CDOTA_Item).GetName()), 0.8),
                    tg.immediate(context => {
                        ExecuteOrderFromTable({
                            OrderType: UnitOrder.ATTACK_TARGET,
                            UnitIndex: context[kunkkaName].entindex(),
                            TargetIndex: (context["ItemToDestroy"] as CDOTA_Item).GetContainer()!.entindex(),
                        });
                    }),
                    tg.wait(1),
                ])),
            ]),

            tg.immediate(ctx => tpHome(ctx, kunkkaName)),
            tg.wait(3),

            tg.setCameraTarget(undefined),

            tg.audioDialog(LocalizationKey.Script_4_Communication_16, LocalizationKey.Script_4_Communication_16, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),

            tg.forkAny([
                tg.seq([
                    tg.audioDialog(LocalizationKey.Script_4_Communication_17, LocalizationKey.Script_4_Communication_17, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
                    tg.neverComplete()
                ]),
                tg.seq([
                    tg.immediate(_ => goalGoToTopBountyRune.start()),
                    tg.immediate(_ => shared.blockades.direJungleLowgroundRiver.destroy()),
                    tg.goToLocation(bountyRuneLocation, [], false),
                ])
            ]),
            tg.immediate(_ => goalGoToTopBountyRune.complete()),
        ])
    )
    graph.start(GameRules.Addon.context, () => {
        print("Completed", sectionName);
        disposeHeroes(GameRules.Addon.context);
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

function disposeHeroes(context: tg.TutorialContext) {
    removeContextEntityIfExists(context, kunkkaName);
    removeContextEntityIfExists(context, tsunamiName);
}

export const sectionCommunication = new tut.FunctionalSection(
    sectionName,
    requiredState,
    onStart,
    onStop,
    orderFilter
);

function orderFilter(event: ExecuteOrderFilterEvent) {
    if (event.issuer_player_id_const == findRealPlayerID()) {
        if (event.order_type == UnitOrder.PICKUP_ITEM) {
            displayDotaErrorMessage(LocalizationKey.Error_Communications_1)
            return false
        }

        if (event.order_type === UnitOrder.ATTACK_TARGET) {
            displayDotaErrorMessage(LocalizationKey.Error_Communications_2)
            return false
        }
    }

    return true
}
