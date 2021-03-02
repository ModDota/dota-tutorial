import * as tg from "../../TutorialGraph/index";
import * as tut from "../../Tutorial/Core";
import { getOrError, getPlayerHero, displayDotaErrorMessage } from "../../util";
import { RequiredState } from "../../Tutorial/RequiredState";
import { TutorialContext } from "../../TutorialGraph/index";

enum GoalKeys {
    FetchWards,
    PlaceObserverWard,
    PlaceSentryWard,
    AttackRiki,
    HoldAlt
}

enum GoalState {
    Started,
    Completed,
}

const sectionName: SectionName = SectionName.Chapter4_Wards;

let graph: tg.TutorialStep | undefined = undefined;

const requiredState: RequiredState = {
    heroLocation: Vector(1900, -3500, 256)
};
const markerLocation = Vector(1000, -4100);

const getGoals = (context: TutorialContext) => {
    const isGoalStarted = (key: GoalKeys) =>
        context[key] === GoalState.Started ||
        context[key] === GoalState.Completed;
    const isGoalCompleted = (key: GoalKeys) =>
        context[key] === GoalState.Completed;

    const goals: Goal[] = [];
    const addGoal = (key: GoalKeys, text: string) => {
        if (isGoalStarted(key)) {
            goals.push({ text: text, completed: isGoalCompleted(key) });
        }
    };

    addGoal(GoalKeys.FetchWards, "Go pick those up and come back here.");
    addGoal(GoalKeys.PlaceObserverWard, "Lets put an observer ward on this high ground.");
    addGoal(GoalKeys.PlaceSentryWard, "Lets put a sentry ward on this high ground.");
    addGoal(GoalKeys.AttackRiki, "Go attack Riki with right mouse click on him.");
    addGoal(GoalKeys.HoldAlt, "Hold Alt button to check sentry range.");
    return goals;
};
const rikiPosition2D = Vector(200, -4200);
const invisHeroInfo = [
    { name: "npc_dota_hero_riki", loc: GetGroundPosition(rikiPosition2D, undefined) },
    { name: "npc_dota_hero_mirana", loc: GetGroundPosition(Vector(500, -4000), undefined) },
    { name: "npc_dota_hero_clinkz", loc: GetGroundPosition(Vector(700, -3900), undefined) },
    { name: "npc_dota_hero_bounty_hunter", loc: GetGroundPosition(Vector(900, -3700), undefined) },
    { name: "npc_dota_hero_invoker", loc: GetGroundPosition(Vector(600, -4800), undefined) },
    { name: "npc_dota_hero_nyx_assassin", loc: GetGroundPosition(Vector(600, -4500), undefined) },
    { name: "npc_dota_hero_slark", loc: GetGroundPosition(Vector(900, -4500), undefined) },
    { name: "npc_dota_hero_weaver", loc: GetGroundPosition(Vector(400, -4500), undefined) },
    { name: "npc_dota_hero_sand_king", loc: GetGroundPosition(Vector(400, -4800), undefined) },
];

function onStart(complete: () => void) {
    print("Starting", sectionName);

    const playerHero = getOrError(getPlayerHero(), "Could not find the player's hero.");
    playerHero.SetMoveCapability(UnitMoveCapability.GROUND);

    const observerWardItem = CreateItem("item_ward_observer", undefined, undefined);
    const sentryWardItem = CreateItem("item_ward_sentry", undefined, undefined);

    graph = tg.forkAny([
        tg.trackGoals(getGoals),
        tg.seq([
            tg.fork(invisHeroInfo.map(hero => tg.spawnUnit(hero.name, hero.loc, DotaTeam.BADGUYS, hero.name))),

            tg.immediate(context => {
                for (const invisHero of invisHeroInfo) {
                    const hero: CDOTA_BaseNPC_Hero = context[invisHero.name];
                    hero.AddNewModifier(undefined, undefined, "modifier_invisible", undefined);
                }
            }),

            tg.wait(1),

            tg.immediate(() => {
                CreateItemOnPositionSync(Vector(2200, -3800), observerWardItem);
                CreateItemOnPositionSync(Vector(2200, -3900), sentryWardItem);
            }),

            tg.immediate(context => context[GoalKeys.FetchWards] = GoalState.Started),

            tg.completeOnCheck(() => playerHero.HasItemInInventory("item_ward_dispenser"), 1),

            tg.immediate(context => {
                context[GoalKeys.FetchWards] = GoalState.Completed;
                context[GoalKeys.PlaceObserverWard] = GoalState.Started;
                Tutorial.CreateLocationTask(markerLocation);
            }),

            tg.completeOnCheck(() => !playerHero.HasItemInInventory("item_ward_dispenser"), 1),

            tg.immediate(context => {
                context[GoalKeys.PlaceObserverWard] = GoalState.Completed;
                context[GoalKeys.PlaceSentryWard] = GoalState.Started;
            }),

            tg.completeOnCheck(() => !playerHero.HasItemInInventory("item_ward_sentry"), 1),

            tg.immediate(context => {
                context[GoalKeys.PlaceSentryWard] = GoalState.Completed;
                for (const invisHero of invisHeroInfo) {
                    const hero: CDOTA_BaseNPC_Hero = context[invisHero.name];
                    if (hero.GetName() !== "npc_dota_hero_riki") {
                        const runDirection = hero.GetAbsOrigin().__sub(playerHero.GetAbsOrigin()).Normalized();
                        hero.MoveToPosition(hero.GetAbsOrigin().__add(runDirection.__mul(5000)));
                    }
                }
                context[GoalKeys.AttackRiki] = GoalState.Started;
            }),

            tg.completeOnCheck(context => playerHero.GetAbsOrigin().__sub(context["npc_dota_hero_riki"].GetAbsOrigin()).Length2D() < 400, 0.1),

            tg.immediate(context => {
                context[GoalKeys.AttackRiki] = GoalState.Completed;
                const riki: CDOTA_BaseNPC_Hero = context["npc_dota_hero_riki"];
                const runDirection = riki.GetAbsOrigin().__sub(playerHero.GetAbsOrigin()).Normalized();
                riki.MoveToPosition(riki.GetAbsOrigin().__add(runDirection.__mul(800)));
                context[GoalKeys.HoldAlt] = GoalState.Started;
            }),
            tg.wait(5),
            tg.immediate(() => disposeHeroes()),
        ])
    ])

    graph.start(GameRules.Addon.context, () => {
        print("Completed", sectionName);
        complete();
    })
}

function onStop() {
    print("Stopping", sectionName);

    if (graph) {
        graph.stop(GameRules.Addon.context);
        disposeHeroes();
        graph = undefined;
    }
}

function disposeHeroes() {
    for (const invisHero of invisHeroInfo) {
        const hero: CDOTA_BaseNPC_Hero | undefined = GameRules.Addon.context[invisHero.name];
        if (hero && IsValidEntity(hero) && hero.IsAlive())
            hero.RemoveSelf();
        GameRules.Addon.context[invisHero.name] = undefined;
    }
}

function orderFilter(event: ExecuteOrderFilterEvent): boolean {
    if (event.order_type === UnitOrder.CAST_POSITION) {
        const targetPosition2D = Vector(event.position_x, event.position_y);
        const highgroundPosition = Vector(1000, -4000);
        const distance = highgroundPosition.__sub(targetPosition2D).Length2D();
        const targetZ = event.position_z;

        const ability = EntIndexToHScript(event.entindex_ability) as CDOTABaseAbility;
        if (ability.GetName() === "item_ward_dispenser" || ability.GetName() === "item_ward_sentry") {
            if (targetZ === 512 && distance < 500) {
                displayDotaErrorMessage("Place the ward on the highground.")
                return false;
            }
        }

        return true;
    }

    if (event.order_type === UnitOrder.DROP_ITEM || event.order_type === UnitOrder.MOVE_ITEM || event.order_type === UnitOrder.CAST_TOGGLE) {
        displayDotaErrorMessage("Dropping, moving or toggling your items is disabled during this section.")
        return false;
    }

    return true;
}

export const sectionWards = new tut.FunctionalSection(
    sectionName,
    requiredState,
    onStart,
    onStop,
    orderFilter
);
