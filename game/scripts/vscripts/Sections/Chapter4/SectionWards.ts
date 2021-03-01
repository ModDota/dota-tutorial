import * as tg from "../../TutorialGraph/index";
import * as tut from "../../Tutorial/Core";
import { getOrError, getPlayerHero } from "../../util";
import { RequiredState } from "../../Tutorial/RequiredState";
import { TutorialContext } from "../../TutorialGraph/index";

enum NeutralGoalKeys {
    FetchWards,
    PlaceObserverWard,
    PlaceSentryWard
}

enum GoalState {
    Started,
    Completed,
}

const sectionName: SectionName = SectionName.Chapter4_Wards;

let graph: tg.TutorialStep | undefined = undefined;

const requiredState: RequiredState = {
    heroLocation: GetGroundPosition(Vector(1900, -3500), undefined)
};
const markerLocation = Vector(1000, -4100);

const getGoals = (context: TutorialContext) => {
    const isGoalStarted = (key: NeutralGoalKeys) =>
        context[key] === GoalState.Started ||
        context[key] === GoalState.Completed;
    const isGoalCompleted = (key: NeutralGoalKeys) =>
        context[key] === GoalState.Completed;

    const goals: Goal[] = [];
    const addGoal = (key: NeutralGoalKeys, text: string) => {
        if (isGoalStarted(key)) {
            goals.push({ text: text, completed: isGoalCompleted(key) });
        }
    };

    addGoal(NeutralGoalKeys.FetchWards, "Go pick those up and come back here.");
    addGoal(NeutralGoalKeys.PlaceObserverWard, "Lets put an observer ward on this high ground.");
    addGoal(NeutralGoalKeys.PlaceSentryWard, "Lets put a sentry ward on this high ground.");
    return goals;
};

function generateInvisHeros() {
    const riki = CreateUnitByName("npc_dota_hero_riki", GetGroundPosition(Vector(1700, -3600), undefined), true, undefined, undefined, DotaTeam.BADGUYS);
    const mirana = CreateUnitByName("npc_dota_hero_mirana", GetGroundPosition(Vector(1300, -3600), undefined), true, undefined, undefined, DotaTeam.BADGUYS);
    const axe = CreateUnitByName("npc_dota_hero_axe", GetGroundPosition(Vector(900, -3600), undefined), true, undefined, undefined, DotaTeam.BADGUYS);
    const wisp = CreateUnitByName("npc_dota_hero_wisp", GetGroundPosition(Vector(1700, -3800), undefined), true, undefined, undefined, DotaTeam.BADGUYS);
    const invoker = CreateUnitByName("npc_dota_hero_invoker", GetGroundPosition(Vector(1300, -3800), undefined), true, undefined, undefined, DotaTeam.BADGUYS);
    const bane = CreateUnitByName("npc_dota_hero_bane", GetGroundPosition(Vector(900, -3800), undefined), true, undefined, undefined, DotaTeam.BADGUYS);
    const slark = CreateUnitByName("npc_dota_hero_slark", GetGroundPosition(Vector(900, -4500), undefined), true, undefined, undefined, DotaTeam.BADGUYS);
    const allInvisHeros = [riki, mirana, axe, wisp, invoker, bane, slark];
    for (const hero of allInvisHeros) {
        hero.SetBaseMoveSpeed(200);
        hero.AddNewModifier(undefined, undefined, "modifier_invisible", undefined);
    }
    return allInvisHeros;
}

function onStart(complete: () => void) {
    print("Starting", sectionName);

    const playerHero = getOrError(getPlayerHero(), "Could not find the player's hero.");
    playerHero.SetMoveCapability(UnitMoveCapability.GROUND);

    const allInvisHeros = generateInvisHeros();

    const observerWardItem = CreateItem("item_ward_observer", undefined, undefined);
    const sentryWardItem = CreateItem("item_ward_sentry", undefined, undefined);

    graph = tg.forkAny([
        tg.trackGoals(getGoals),
        tg.seq([
            tg.wait(1),
            tg.immediate(() => {
                CreateItemOnPositionSync(Vector(2200, -3800), observerWardItem)
                CreateItemOnPositionSync(Vector(2200, -3900), sentryWardItem)
            }),

            tg.immediate(
                (context) =>
                    (context[NeutralGoalKeys.FetchWards] = GoalState.Started)
            ),
            tg.completeOnCheck(() => playerHero.HasItemInInventory("item_ward_dispenser"), 1),
            tg.immediate((context) => {
                context[NeutralGoalKeys.FetchWards] = GoalState.Completed;
                context[NeutralGoalKeys.PlaceObserverWard] = GoalState.Started;
                Tutorial.CreateLocationTask(markerLocation);
            }),
            tg.completeOnCheck(() => {
                const item = playerHero.GetItemInSlot(0);
                if (item)
                    return item.GetName() === "item_ward_sentry"
                return false;
            }, 1),

            tg.immediate((context) => {
                context[NeutralGoalKeys.PlaceObserverWard] = GoalState.Completed;
                context[NeutralGoalKeys.PlaceSentryWard] = GoalState.Started;
            }),

            tg.completeOnCheck(() => {
                const item = playerHero.GetItemInSlot(0);
                return (!item)
            }, 1),

            tg.immediate((context) => {
                context[NeutralGoalKeys.PlaceSentryWard] = GoalState.Completed;
                for (const hero of allInvisHeros) {
                    if (hero.GetName() !== "npc_dota_hero_riki") {
                        const runDirection = hero.GetAbsOrigin().__sub(playerHero.GetAbsOrigin()).Normalized();
                        hero.MoveToPosition(hero.GetAbsOrigin().__add(runDirection.__mul(5000)))
                    }
                }
            }),

            tg.wait(100),
        ])
    ])

    graph.start(GameRules.Addon.context, () => {
        print("Completed", sectionName)
        complete()
    })
}

function onStop() {
    print("Stopping", sectionName);

    if (graph) {
        graph.stop(GameRules.Addon.context)
        graph = undefined
    }
}

function orderFilter(event: ExecuteOrderFilterEvent): boolean {
    if (event.order_type === UnitOrder.CAST_POSITION) {
        const targetPosition2D = Vector(event.position_x, event.position_y);
        const highgroundPosition = Vector(1000, -4000);
        const distance = highgroundPosition.__sub(targetPosition2D).Length2D();
        const targetZ = event.position_z;

        const ability = EntIndexToHScript(event.entindex_ability) as CDOTABaseAbility
        if (ability.GetName() === "item_ward_dispenser" || ability.GetName() === "item_ward_sentry" || ability.GetName() === "item_ward_observer")
            return (targetZ === 512 && distance < 500)
        return true;
    }
    if (event.order_type === UnitOrder.DROP_ITEM)
        return false;
    if (event.order_type === UnitOrder.MOVE_ITEM)
        return false;
    return true;
}
export const sectionWards = new tut.FunctionalSection(
    sectionName,
    requiredState,
    onStart,
    onStop,
    orderFilter
);
