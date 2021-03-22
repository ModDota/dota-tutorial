import { reloadable } from "./lib/tstl-utils";
import * as chapters from "./Sections/index";
import { CustomTimeManager } from "./TimeManager";
import * as tut from "./Tutorial/Core";
import { TutorialContext } from "./TutorialGraph";
import { centerCameraOnHero, findAllPlayersID, findRealPlayerID, getCameraDummy, getOrError, getPlayerHero, isPlayerHeroFrozen, setUnitPacifist } from "./util";
import * as dg from "./Dialog"

declare global {
    interface CDOTAGamerules {
        Addon: GameMode;
    }
}

@reloadable
export class GameMode {
    Game: CDOTABaseGameMode = GameRules.GetGameModeEntity();
    public customTimeManager: CustomTimeManager = new CustomTimeManager()
    canPlayerHeroEarnXP = false;

    private tutorial = new tut.Tutorial([
        chapters.chapter1.sectionOpening,
        chapters.chapter1.sectionMovement,
        chapters.chapter1.sectionCameraUnlock,
        chapters.chapter1.sectionLeveling,
        chapters.chapter1.sectionCasting,
        chapters.chapter1.sectionShopUI,
        chapters.chapter2.sectionOpening,
        chapters.chapter2.sectionCreeps,
        chapters.chapter2.sectionTower,
        chapters.chapter2.sectionCourier,
        chapters.chapter3.sectionOpening,
        chapters.chapter4.sectionOpening,
        chapters.chapter4.sectionWards,
        chapters.chapter4.sectionOutpost,
        chapters.chapter4.sectionCommunication,
        chapters.chapter5.sectionOpening,
        chapters.chapter5.sectionRoshan,
        chapters.chapter5.sectionTeamFight,
        chapters.chapter6.sectionOpening,
        chapters.chapter6.sectionClosing,
    ]);

    playerHero?: CDOTA_BaseNPC_Hero;
    context: TutorialContext = {};

    public static Precache(this: void, context: CScriptPrecacheContext) {
        PrecacheResource("soundfile", "soundevents/tutorial_dialogs.vsndevts", context);
        PrecacheResource("soundfile", "soundevents/community.vsndevts", context);
        PrecacheResource("particle", ParticleName.HighlightCircle, context);
        PrecacheResource("particle", ParticleName.HighlightOrangeArrow, context);
        PrecacheResource("particle", ParticleName.HighlightOrangeCircle, context);
        PrecacheResource("particle", ParticleName.HighlightRedArrow, context);
        PrecacheResource("particle", ParticleName.HighlightRedCircle, context);
        PrecacheResource("particle", ParticleName.Path, context);
        PrecacheResource("particle", ParticleName.MoveToLocation, context)
        PrecacheResource("particle", ParticleName.DialogCircle, context)
        PrecacheResource("particle", ParticleName.DiscoLights, context)
        PrecacheResource("particle", ParticleName.DiscoBall, context)
        PrecacheResource("particle", ParticleName.Firework, context)
    }

    public static Activate(this: void) {
        GameRules.Addon = new GameMode();
    }

    constructor() {
        this.configure();
        ListenToGameEvent("game_rules_state_change", () => this.OnStateChange(), undefined);
        ListenToGameEvent("npc_spawned", event => this.OnNpcSpawned(event), undefined);
        ListenToGameEvent("player_chat", event => {
            if (event.text.startsWith("-dev")) {
                CustomGameEventManager.Send_ServerToAllClients("devpanel_enable", {});
            }
        }, undefined);

        CustomGameEventManager.RegisterListener("skip_to_section", (_, event) => {
            print("Request to skip to section:", event.section);
            this.tutorial.startBySectionName(event.section);
            // Always center camera on hero when skipping between sections
            centerCameraOnHero();
        })

        dg.init();
    }

    private configure(): void {
        this.configureGameRules();
        this.registerFilters();
    }

    configureGameRules() {
        print("Setting Gamerules");

        // Player/Team rules
        GameRules.SetCustomGameTeamMaxPlayers(DOTATeam_t.DOTA_TEAM_GOODGUYS, 5);
        GameRules.SetCustomGameTeamMaxPlayers(DOTATeam_t.DOTA_TEAM_BADGUYS, 5);

        // Game loading rules
        GameRules.EnableCustomGameSetupAutoLaunch(true);
        GameRules.SetCustomGameSetupAutoLaunchDelay(0);
        GameRules.SetShowcaseTime(0);
        GameRules.SetStrategyTime(0);
        GameRules.SetCustomGameSetupTimeout(0);
        GameRules.SetPreGameTime(0);
        GameRules.SetSafeToLeave(true);
        this.Game.SetRandomHeroBonusItemGrantDisabled(true);

        // Game start rules
        this.Game.SetFreeCourierModeEnabled(true);
        GameRules.SetGoldPerTick(0);
        GameRules.SetGoldTickTime(99999);
        GameRules.SetStartingGold(0);
        GameRules.SetUseBaseGoldBountyOnHeroes(true);
        GameRules.SetTimeOfDay(0.25); // morning!
        GameRules.SetFirstBloodActive(false);
        this.Game.SetAnnouncerDisabled(true);
        this.Game.SetCustomGameForceHero("npc_dota_hero_dragon_knight");
        this.Game.SetDaynightCycleDisabled(true);

        // Game in progress rules
        GameRules.SetCreepSpawningEnabled(false);
        GameRules.SetAllowOutpostBonuses(false);
        this.Game.SetCustomScanCooldown(9);
        this.Game.SetCustomGlyphCooldown(10);
        this.Game.DisableClumpingBehaviorByDefault(true);
        this.Game.SetBuybackEnabled(false);
        this.Game.SetCustomDireScore(0);
        this.Game.SetLoseGoldOnDeath(false);

        // Runes rules
        this.Game.SetRuneEnabled(DOTA_RUNES.DOTA_RUNE_BOUNTY, false);
        this.Game.SetRuneEnabled(DOTA_RUNES.DOTA_RUNE_ARCANE, false);
        this.Game.SetRuneEnabled(DOTA_RUNES.DOTA_RUNE_DOUBLEDAMAGE, false);
        this.Game.SetRuneEnabled(DOTA_RUNES.DOTA_RUNE_HASTE, false);
        this.Game.SetRuneEnabled(DOTA_RUNES.DOTA_RUNE_ILLUSION, false);
        this.Game.SetRuneEnabled(DOTA_RUNES.DOTA_RUNE_INVISIBILITY, false);
        this.Game.SetRuneEnabled(DOTA_RUNES.DOTA_RUNE_REGENERATION, false);
        this.Game.SetRuneEnabled(DOTA_RUNES.DOTA_RUNE_XP, false);

        // Leveling rules
        // +1 exp = 1 level, to make it easy to level up our hero in code later.
        // No natural experience gain.
        const expTable: Record<number, number> = {};
        for (let i = 0; i < 30; i++) {
            expTable[i] = i;
        }
        this.Game.SetCustomXPRequiredToReachNextLevel(expTable);
        this.Game.SetUseCustomHeroLevels(true);

        this.Game.SetAllowNeutralItemDrops(false);

        // Make the fountain unable to attack
        setUnitPacifist(getOrError(Entities.FindByName(undefined, "ent_dota_fountain_good") as CDOTA_BaseNPC), true)

        // Remove Roshan spawner
        const roshanSpawner = getOrError(Entities.FindByClassname(undefined, "npc_dota_roshan_spawner"))
        roshanSpawner.Destroy()
    }

    registerFilters() {
        this.Game.SetDamageFilter(event => this.DamageFilter(event), this);
        this.Game.SetExecuteOrderFilter(event => this.ExecuteOrderFilter(event), this);
        this.Game.SetModifyExperienceFilter(event => this.ModifyExperienceFilter(event), this);
        this.Game.SetModifyGoldFilter(event => this.ModifyGoldFilter(event), this);
        this.Game.SetItemAddedToInventoryFilter(event => this.ItemAddedToInventoryFilter(event), this);
        this.Game.SetModifierGainedFilter(event => this.ModifierGainedFilter(event), this)
    }

    DamageFilter(event: DamageFilterEvent): boolean {
        return true;
    }

    ExecuteOrderFilter(event: ExecuteOrderFilterEvent): boolean {
        // Cancel orders if false
        if (this.tutorial.currentSection && this.tutorial.currentSection.orderFilter && !this.tutorial.currentSection.orderFilter(event)) {
            return false;
        }

        // Cancel player orders if they are frozen
        if (isPlayerHeroFrozen() && event.issuer_player_id_const === findRealPlayerID()) {
            return false;
        }

        return true;
    }

    ModifyExperienceFilter(event: ModifyExperienceFilterEvent): boolean {
        const hero = EntIndexToHScript(event.hero_entindex_const);

        if (hero === getPlayerHero()) {
            return this.canPlayerHeroEarnXP;
        }

        return false;
    }

    ModifyGoldFilter(event: ModifyGoldFilterEvent): boolean {
        Timers.CreateTimer(() => {
            PlayerResource.SetGold(event.player_id_const, 0, false),
                FrameTime() * 1;
        });
        return true;
    }

    ItemAddedToInventoryFilter(event: ItemAddedToInventoryFilterEvent): boolean {
        return true;
    }

    ModifierGainedFilter(event: ModifierGainedFilterEvent): boolean {
        return true
    }

    public OnStateChange(): void {
        const state = GameRules.State_Get();
        print(`OnStateChanged", ${state}`);

        if (state === DOTA_GameState.DOTA_GAMERULES_STATE_CUSTOM_GAME_SETUP) {

            for (const pID of findAllPlayersID()) {
                PlayerResource.SetCustomTeamAssignment(pID, DOTATeam_t.DOTA_TEAM_GOODGUYS);
            }

            // Finish setup phase
            Timers.CreateTimer(0.2, () => GameRules.FinishCustomGameSetup());
        }

        // Start game once pregame hits
        if (state === DOTA_GameState.DOTA_GAMERULES_STATE_PRE_GAME) {
            // Day-night stuff
            print("setting daynight stuff")
            GameRules.SetTimeOfDay(0.5) // Set to day
            this.Game.SetDaynightCycleDisabled(true)

            const tryStart = () => {
                if (!getPlayerHero()) {
                    return 0.1;
                }

                this.StartGame();
            };

            Timers.CreateTimer(0.1, tryStart);
        }

        if (state === DOTA_GameState.DOTA_GAMERULES_STATE_GAME_IN_PROGRESS) { }
    }

    private StartGame(): void {
        print("Game starting!");

        // Make sure the camera dummy is spawned
        getCameraDummy(Vector(0, 0, 0));

        print("Starting tutorial from scratch");
        this.tutorial.start();
    }

    // Called on script_reload
    public Reload() {
        print("Script reloaded!");
    }

    private OnNpcSpawned(event: NpcSpawnedEvent) {
        const unit = EntIndexToHScript(event.entindex);
        if (!unit) return;

        if (unit.IsBaseNPC()) {

            // Check if this is the real player's hero that just spawned, assign it to the gamemode entity if it is
            if (unit.IsRealHero()) {
                if (PlayerResource.IsValidPlayerID(unit.GetPlayerID()) && !PlayerResource.IsFakeClient(unit.GetPlayerID())) {
                    if (!this.playerHero || this.playerHero != unit) {
                        this.playerHero = unit;
                        this.OnPlayerHeroAssigned(unit);
                    }
                }

                // Remove starting TP from player
                Timers.CreateTimer(1 / 30, () => {
                    if (unit && IsValidEntity(unit) && unit.HasItemInInventory("item_tpscroll")) {
                        const item = unit.FindItemInInventory("item_tpscroll");
                        if (item) {
                            unit.RemoveItem(item);
                        }
                    }
                });
            }

            // Couriers
            if (unit.IsCourier()) {
                // Remove the passive bonuses modifiers
                Timers.CreateTimer(FrameTime(), () => {
                    if (unit.HasModifier("modifier_courier_passive_bonus")) {
                        unit.RemoveModifierByName("modifier_courier_passive_bonus");
                    }

                    const hero = getPlayerHero();
                    if (hero) {
                        hero.SetGold(0, true);
                    }
                });
            }
        }
    }

    OnPlayerHeroAssigned(hero: CDOTA_BaseNPC_Hero) {
        hero.SetAbilityPoints(0);
    }
}
