import { reloadable } from "./lib/tstl-utils";
import { findAllPlayers } from "./util";
import { tutFork, tutSeq } from "./TutorialGraph/Core";
import { tutGoToLocation, tutSpawnAndKillUnit } from "./TutorialGraph/Steps";

declare global {
    interface CDOTAGamerules {
        Addon: GameMode;
    }
}

@reloadable
export class GameMode {
    public static Precache(this: void, context: CScriptPrecacheContext) {
        PrecacheResource("particle", "particles/units/heroes/hero_meepo/meepo_earthbind_projectile_fx.vpcf", context);
        PrecacheResource("soundfile", "soundevents/game_sounds_heroes/game_sounds_meepo.vsndevts", context);
    }

    public static Activate(this: void) {
        GameRules.Addon = new GameMode();
    }

    constructor() {
        this.configure();
        ListenToGameEvent("game_rules_state_change", () => this.OnStateChange(), undefined);
        ListenToGameEvent("npc_spawned", event => this.OnNpcSpawned(event), undefined);

        // TODO: Remove later, this is just an example
        CustomGameEventManager.RegisterListener("my_custom_event", (_, event) => {
            print(event.bar)
        })
    }

    private configure(): void {
        GameRules.SetCustomGameTeamMaxPlayers(DOTATeam_t.DOTA_TEAM_GOODGUYS, 3);
        GameRules.SetCustomGameTeamMaxPlayers(DOTATeam_t.DOTA_TEAM_BADGUYS, 3);

        GameRules.SetSameHeroSelectionEnabled(true);
        GameRules.SetShowcaseTime(0);
        GameRules.SetStrategyTime(0);
    }

    public OnStateChange(): void {
        const state = GameRules.State_Get();
        print(`OnStateChanged", ${state}`);

        if (state === DOTA_GameState.DOTA_GAMERULES_STATE_CUSTOM_GAME_SETUP) {

            for (const pID of findAllPlayers()) {
                print(`Assigning ${pID} to radiant`)
                PlayerResource.SetCustomTeamAssignment(pID, DOTATeam_t.DOTA_TEAM_GOODGUYS);
            }

            // Finish setup phase
            Timers.CreateTimer(0.2, () => GameRules.FinishCustomGameSetup());
        }

        if (state === DOTA_GameState.DOTA_GAMERULES_STATE_HERO_SELECTION) {
            Timers.CreateTimer(0.2, () => {

                const playersWithoutHero = findAllPlayers().filter(pID => !PlayerResource.HasSelectedHero(pID));
                for (const pID of playersWithoutHero) {
                    print(`Assigning ${pID} hero "npc_dota_hero_dragon_knight"`);
                    PlayerResource.GetPlayer(pID)!.SetSelectedHero("npc_dota_hero_dragon_knight");
                }
            })

        }

        // Start game once pregame hits
        if (state === DOTA_GameState.DOTA_GAMERULES_STATE_PRE_GAME) {
            Timers.CreateTimer(3, () => this.StartGame());
        }
    }

    private StartGame(): void {
        print("Game starting!");

        // Example tutorial graph.
        // Sequence:
        // 1. Wait for hero to go to location (0, 0, 0)
        // 2. Spawn hero at (1000, 0, 0) and wait until it dies
        // 3. Spawn two heroes at (1500, 0, 0) and wait for both of them to die
        const tutorial = tutSeq(
            tutGoToLocation(Vector(0, 0, 0)),
            tutSpawnAndKillUnit("npc_dota_hero_crystal_maiden", Vector(1000, 0, 0)),
            tutFork(
                tutSpawnAndKillUnit("npc_dota_hero_luna", Vector(1500, 0, 0)),
                tutSpawnAndKillUnit("npc_dota_hero_luna", Vector(1500, 0, 0))
            )
        )

        tutorial.start({}, () => print("Tutorial was completed"))
    }

    // Called on script_reload
    public Reload() {
        print("Script reloaded!");

        // Do some stuff here
    }

    private OnNpcSpawned(event: NpcSpawnedEvent) {

    }
}
