import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter"

@registerModifier()
export class modifier_abs_no_damage extends BaseModifier {

    IsHidden() {return true}
    IsDebuff() {return false}
    IsPurgable() {return false}

    DeclareFunctions(): ModifierFunction[]
    {
        return [ModifierFunction.INCOMING_DAMAGE_PERCENTAGE]
    }

    GetModifierIncomingDamage_Percentage(): number
    {
        return -100
    }
}
