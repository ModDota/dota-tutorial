import * as tut from "../../Tutorial/Core";
import { RequiredState } from "../../Tutorial/RequiredState";
import * as tg from "../../TutorialGraph/index";
import { findRealPlayerID, getPlayerHero } from "../../util";

const sectionName: SectionName = SectionName.Chapter2_Opening
let graph: tg.TutorialStep | undefined = undefined
let canPlayerIssueOrders = true;
const requiredState: RequiredState = {
}

const radiantCreepsNames = [CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantRangedCreep];
const direCreepNames = [CustomNpcKeys.DireMeleeCreep, CustomNpcKeys.DireMeleeCreep, CustomNpcKeys.DireMeleeCreep, CustomNpcKeys.DireMeleeCreep, CustomNpcKeys.DireRangedCreep];

const radiantCreeps: CDOTA_BaseNPC[] = [];
const direCreeps: CDOTA_BaseNPC[] = [];

const onStart = (complete: () => void) => {
    print("Starting", sectionName);
    CustomGameEventManager.Send_ServerToAllClients("section_started", { section: sectionName });

    const playerHero = getPlayerHero();
    if (!playerHero) error("Could not find the player's hero.");

    graph = tg.seq([
        tg.setCameraTarget(undefined),
        tg.immediate(() => canPlayerIssueOrders = true),
        tg.goToLocation(Vector(-6574, -3742, 256)),
        tg.immediate(() => playerHero.Stop()),
        tg.immediate(() => canPlayerIssueOrders = false),
        tg.fork(context => radiantCreepsNames.map(unit => tg.spawnUnit(unit, Vector(-6795, -3474, 256), DotaTeam.GOODGUYS, undefined))),
        tg.fork(context => direCreepNames.map(unit => tg.spawnUnit(unit, Vector(-5911, 5187, 128), DotaTeam.BADGUYS, undefined))),
        tg.immediate(context =>
            {
                // Group radiant creeps
                const creeps = Entities.FindAllByClassname("npc_dota_creature") as CDOTA_BaseNPC[];

                for (const creep of creeps)
                {
                    if (creep.GetUnitName() == CustomNpcKeys.RadiantMeleeCreep || creep.GetUnitName() == CustomNpcKeys.RadiantRangedCreep)
                    {
                        radiantCreeps.push(creep);
                    }

                    if (creep.GetUnitName() == CustomNpcKeys.DireMeleeCreep || creep.GetUnitName() == CustomNpcKeys.DireRangedCreep)
                    {
                        direCreeps.push(creep);
                    }
                }
                print(radiantCreeps.length)
            }),
        tg.fork(context => radiantCreeps.map(unit => tg.moveUnit(_ => unit, Vector(-6288, 3280, 128)))),
        tg.immediate(_ =>
        {
            for (const radiantCreep of radiantCreeps) {
                ExecuteOrderFromTable({
                    OrderType: UnitOrder.ATTACK_MOVE,
                    Position: Vector(-6190, 4589, 128),
                    UnitIndex: radiantCreep.entindex()
                })
            }

            for (const direCreep of direCreeps) {
                ExecuteOrderFromTable({
                    OrderType: UnitOrder.ATTACK_MOVE,
                    Position: Vector(-6190, 4589, 128),
                    UnitIndex: direCreep.entindex()
                })
            }
        }),
        tg.setCameraTarget(radiantCreeps[0]),
        tg.wait(5),
        tg.setCameraTarget(undefined),
        tg.immediate(_ => canPlayerIssueOrders = true),
    ])

    graph.start(GameRules.Addon.context, () => {
        print("Completed", sectionName)
        complete()
    })
}

const onStop = () => {
    print("Stopping", sectionName);
    if (graph)
    {
        graph.stop(GameRules.Addon.context);
        graph = undefined;
    }
}

export const sectionOpening = new tut.FunctionalSection(
    SectionName.Chapter2_Opening,
    requiredState,
    onStart,
    onStop,
    chapter2OpeningOrderFilter
);

export function chapter2OpeningOrderFilter(event: ExecuteOrderFilterEvent): boolean {
    // Allow all orders that aren't done by the player
    if (event.issuer_player_id_const != findRealPlayerID()) return true;

    if (!canPlayerIssueOrders) return false;

    return true;
}
