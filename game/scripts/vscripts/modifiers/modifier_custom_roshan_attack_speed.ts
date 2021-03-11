import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";

@registerModifier()
export class modifier_custom_roshan_attack_speed extends BaseModifier {
    IsHidden() { return true }
    IsPurgable() { return false }
    IsDebuff() { return false }
    RemoveOnDeath() { return false }

    DeclareFunctions(): ModifierFunction[] {
        return [ModifierFunction.ATTACKSPEED_BONUS_CONSTANT,]
    }

    GetModifierAttackSpeedBonus_Constant() {
        // Rosh's attack speed bonus as of patch 7.28c
        return 100
    }
}
