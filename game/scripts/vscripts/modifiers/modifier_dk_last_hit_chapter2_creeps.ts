import * as dg from "../Dialog"
import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";
import { LastHitStages } from "../Sections/Chapter2/shared";
import { isCustomLaneCreepUnit } from "../util";

@registerModifier()
export class modifier_dk_last_hit_chapter2_creeps extends BaseModifier {
    IsHidden() { return true }
    IsPurgable() { return false }
    IsDebuff() { return false }
    RemoveOnDeath() { return false }

    currentStage: LastHitStages = LastHitStages.LAST_HIT
    private successLocalizationKeys: LocalizationKey[] = [LocalizationKey.Script_2_Creeps_5, LocalizationKey.Script_2_Creeps_6, LocalizationKey.Script_2_Creeps_7]
    private missLocalizationKeys: LocalizationKey[] = [LocalizationKey.Script_2_Creeps_8, LocalizationKey.Script_2_Creeps_9, LocalizationKey.Script_2_Creeps_10]

    OnCreated() {
        if (!IsServer()) return;
        this.SetStackCount(0);
    }

    OnRefresh() {
        if (!IsServer()) return;
        this.SetStackCount(0);
    }

    DeclareFunctions(): ModifierFunction[] {
        return [ModifierFunction.ON_DEATH,
        ModifierFunction.MANA_REGEN_CONSTANT,
        ModifierFunction.ON_ATTACK_LANDED,
        ModifierFunction.PREATTACK_BONUS_DAMAGE]
    }

    OnAttackLanded(event: ModifierAttackEvent): void {
        if (!IsServer()) return;
        if (event.attacker != this.GetParent()) return;
        if (!isCustomLaneCreepUnit(event.target)) return

        if (this.currentStage === LastHitStages.LAST_HIT && event.target.GetTeamNumber() === this.GetParent().GetTeamNumber()) {
            return
        }
        else if (this.currentStage === LastHitStages.LAST_HIT_BREATHE_FIRE) {
            return
        }
        else if (this.currentStage === LastHitStages.LAST_HIT_DENY && event.target.GetTeamNumber() !== this.GetParent().GetTeamNumber()) {
            return
        }

        Timers.CreateTimer(FrameTime(), () => {
            if (event.target.IsAlive() && event.target.GetHealthPercent() < 8) {
                SendOverheadEventMessage(undefined, OverheadAlert.LAST_HIT_EARLY, event.target, 500, undefined)
            }
        })
    }

    GetModifierPreAttack_BonusDamage(): number {
        return 25;
    }

    GetModifierConstantManaRegen(): number {
        if (!IsServer()) return 0;
        if (this.currentStage == LastHitStages.LAST_HIT_BREATHE_FIRE) return 10;
        else return 0;
    }

    OnDeath(event: ModifierAttackEvent) {
        if (!IsServer()) return;

        switch (this.currentStage) {
            case LastHitStages.LAST_HIT:
                this.LastHit(event);
                break;

            case LastHitStages.LAST_HIT_BREATHE_FIRE:
                this.LastHitBreathFire(event);
                break;

            case LastHitStages.LAST_HIT_DENY:
                this.LastHitDeny(event);
                break;
        }
    }

    CheckState(): Partial<Record<ModifierState, boolean>> {
        return { [ModifierState.LOW_ATTACK_PRIORITY]: true }
    }

    LastHit(event: ModifierAttackEvent) {
        if (event.attacker != this.GetParent()) {
            // Check if killer is on DK's team
            if (event.attacker.GetTeamNumber() == this.GetParent().GetTeamNumber()) {
                // Check if DK's is in 300 distance from the dying unit
                if (event.unit) {
                    const distance = ((this.GetParent().GetAbsOrigin() - event.unit.GetAbsOrigin()) as Vector).Length2D()
                    if (distance <= 300) {
                        // Play "you missed!" sound from Godz - currently text, later will change to audio when we'll have actual sounds
                        const chosenLocalizaionKey = this.missLocalizationKeys[RandomInt(0, this.missLocalizationKeys.length - 1)];
                        dg.playText(chosenLocalizaionKey, GameRules.Addon.context[CustomNpcKeys.GodzMudGolem], 3)

                        SendOverheadEventMessage(undefined, OverheadAlert.LAST_HIT_MISS, event.unit, 0, undefined)
                    }
                }
            }

            return;
        }

        if (event.unit) {
            if (!isCustomLaneCreepUnit(event.unit)) return;
            if (event.unit.GetTeamNumber() == this.GetParent().GetTeamNumber()) return;
        }

        // Play "nice hit!" sound from Godz - currently text, later will change to audio when we'll have actual sounds
        const chosenLocalizationKey = this.successLocalizationKeys[RandomInt(0, this.successLocalizationKeys.length - 1)]
        dg.playText(chosenLocalizationKey, GameRules.Addon.context[CustomNpcKeys.GodzMudGolem], 3)

        this.IncrementStackCount();
    }

    LastHitBreathFire(event: ModifierAttackEvent) {
        if (event.attacker != this.GetParent()) return;
        if (event.inflictor != this.GetParent().FindAbilityByName("dragon_knight_breathe_fire")) return

        if (event.unit) {
            if (!isCustomLaneCreepUnit(event.unit)) return;
            if (event.unit.GetTeamNumber() == this.GetParent().GetTeamNumber()) return;
        }

        this.IncrementStackCount();
    }

    LastHitDeny(event: ModifierAttackEvent) {
        if (event.attacker != this.GetParent()) return;

        if (event.unit) {
            if (!isCustomLaneCreepUnit(event.unit)) return;
            if (event.unit.GetTeamNumber() != this.GetParent().GetTeamNumber()) return;
        }

        this.IncrementStackCount();
    }

    setCurrentState(newState: LastHitStages) {
        this.currentStage = newState;
        this.SetStackCount(0);
    }
}
