import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter"

@registerModifier()
export class modifier_abs_no_damage extends BaseModifier {

    IsHidden() { return true }
    IsDebuff() { return false }
    IsPurgable() { return false }

    DeclareFunctions(): modifierfunction[] {
        return [modifierfunction.MODIFIER_PROPERTY_INCOMING_DAMAGE_PERCENTAGE]
    }

    GetModifierIncomingDamage_Percentage(): number {
        return -100
    }
}
