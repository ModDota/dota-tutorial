import * as tut from "../Tutorial/Core";
import * as tg from "../TutorialGraph/index";
import { getPlayerHero, setCanPlayerIssueOrders } from "../util";

const sectionName: SectionName = SectionName.Chapter2Opening
let graph: tg.TutorialStep | undefined = undefined

const radiantCreepsNames = [CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantMeleeCreep, CustomNpcKeys.RadiantRangedCreep];
const direCreepNames = [CustomNpcKeys.DireMeleeCreep, CustomNpcKeys.DireMeleeCreep, CustomNpcKeys.DireMeleeCreep, CustomNpcKeys.DireMeleeCreep, CustomNpcKeys.DireRangedCreep];

const radiantCreeps: CDOTA_BaseNPC[] = [];
const direCreeps: CDOTA_BaseNPC[] = [];

const onStart = (complete: () => void) => {
    print("Starting", sectionName);
    CustomGameEventManager.Send_ServerToAllClients("section_started", { section: sectionName });

    const playerHero = getPlayerHero();
    if (!playerHero) error("Could not find the player's hero.");

    graph = tg.seq(
        tg.setCameraTarget(() => undefined),
        tg.immediate(() => setCanPlayerIssueOrders(true)),
        tg.goToLocation(Vector(-6574, -3742, 256)),
        tg.immediate(() => playerHero.Stop()),
        //tg.immediate(() => setCanPlayerIssueOrders(false)),
        tg.fork(
            ...radiantCreepsNames.map(unit => tg.spawnUnit(unit, Vector(-6795, -3474, 256), DotaTeam.GOODGUYS, undefined)),
            ...direCreepNames.map(unit => tg.spawnUnit(unit, Vector(-5911, 5187, 128), DotaTeam.BADGUYS, undefined)),
        ),
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
        tg.fork(
            ...radiantCreeps.map(unit => tg.moveUnit(_ => unit, Vector(-6288, 3280, 128))),
        ),
        tg.immediate(_ =>
        {
            print(radiantCreeps.length);
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
        tg.setCameraTarget(_ => radiantCreeps[0]),
        tg.wait(5),
        tg.setCameraTarget(_ => undefined),
        tg.immediate(_ => setCanPlayerIssueOrders(true)),
    )

    graph.start(GameRules.Addon.context, () => {
        print("Completed", sectionName)
        complete()
    })
}

const onSkipTo = () => {
    print("Skipping to", sectionName);
    if (!getPlayerHero()) error("Could not find the player's hero.")
}

const onStop = () => {
    print("Stopping", sectionName);
    if (graph)
    {
        graph.stop(GameRules.Addon.context);
        graph = undefined;
    }
}

export const chapter2Opening = new tut.FunctionalSection(
    sectionName,
    onStart,
    onSkipTo,
    onStop
);
