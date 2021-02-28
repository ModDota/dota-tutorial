import * as tut from "../../Tutorial/Core";
import * as tg from "../../TutorialGraph/index";
import { RequiredState } from "../../Tutorial/RequiredState";
import { displayDotaErrorMessage, findRealPlayerID, getPlayerHero, PrintEventTable, setUnitPacifist } from "../../util";
import { TutorialContext } from "../../TutorialGraph/index";

const sectionName: SectionName = SectionName.Chapter1_ShopUI;
let graph: tg.TutorialStep | undefined = undefined
let waitingForPlayerToPurchaseTango = false;
let playerBoughtTango = false;

enum ShopUIGoalKeys {
    OpenShop,
    BuyTango
}

enum GoalState {
    Started,
    Completed,
}

const requiredState: RequiredState = {
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    heroGold: 0
};

const onStart = (complete: () => void) => {
    print("Starting", sectionName);
    CustomGameEventManager.Send_ServerToAllClients("section_started", { section: sectionName });

    const playerHero = getPlayerHero();
    if (!playerHero) error("Could not find the player's hero.");

    // Return a list of goals to display depending on which parts we have started and completed.
    const getGoals = (context: TutorialContext) => {

        const isGoalStarted = (key: ShopUIGoalKeys) =>
            context[key] === GoalState.Started ||
            context[key] === GoalState.Completed;
        const isGoalCompleted = (key: ShopUIGoalKeys) =>
            context[key] === GoalState.Completed;

        const goals: Goal[] = [];
        const addGoal = (key: ShopUIGoalKeys, text: string) => {
            if (isGoalStarted(key)) {
                goals.push({ text: text, completed: isGoalCompleted(key) });
            }
        };

        addGoal(ShopUIGoalKeys.OpenShop, "Open the shop.");
        addGoal(ShopUIGoalKeys.BuyTango, "Use the gold provided to purchase a Tango.");

        return goals;
    };

    graph = tg.forkAny([
        tg.trackGoals(getGoals),
        tg.seq([
            tg.immediate((context) => {
                context[ShopUIGoalKeys.OpenShop] = GoalState.Started;
                playerHero.SetGold(90, true);
                waitingForPlayerToPurchaseTango = true;
            }),
            tg.wait(10),
            tg.completeOnCheck(context => {
                context[ShopUIGoalKeys.OpenShop] = GoalState.Completed;
                context[ShopUIGoalKeys.BuyTango] = GoalState.Started;
                return playerBoughtTango;
            }, 0.2),
            tg.immediate((context) => {
                context[ShopUIGoalKeys.BuyTango] = GoalState.Completed;
            })
        ])
    ])

    graph.start(GameRules.Addon.context, () => {
        print("Completed", sectionName)
        complete()
    })
}

function onStop() {
    print("Stopping", sectionName);
}

export const sectionShopUI = new tut.FunctionalSection(
    sectionName,
    requiredState,
    onStart,
    onStop,
    sectionShopUIOrderFilter
);

function sectionShopUIOrderFilter(event: ExecuteOrderFilterEvent): boolean {
    if (event.issuer_player_id_const != findRealPlayerID()) return true

    if (event.order_type == UnitOrder.PURCHASE_ITEM) {
        if (waitingForPlayerToPurchaseTango) {
            // Only allows buying tango in this phase
            const boughtTango = event.shop_item_name === "item_tango"
            if (boughtTango) {
                playerBoughtTango = true;
                waitingForPlayerToPurchaseTango = false;
            }
            else {
                displayDotaErrorMessage("Use your gold to buy a Tango.");
                return false;
            }
        }
    }

    return true;
}
