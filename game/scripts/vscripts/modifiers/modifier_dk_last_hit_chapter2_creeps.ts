import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";
import { LastHitStages } from "../Sections/Chapter2/shared";
import { isCustomLaneCreepUnit } from "../util";

@registerModifier()
export class modifier_dk_last_hit_chapter2_creeps extends BaseModifier {
    IsHidden() { return true }
    IsPurgable() { return false }
    IsDebuff() { return false }

    currentStage: LastHitStages = LastHitStages.LAST_HIT

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
        ModifierFunction.MANA_REGEN_CONSTANT]
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
        if (event.attacker != this.GetParent()) return;

        if (event.unit) {
            if (!isCustomLaneCreepUnit(event.unit)) return;
            if (event.unit.GetTeamNumber() == this.GetParent().GetTeamNumber()) return;
        }

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
