import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";

@registerModifier()
export class modifier_unit_unselectable extends BaseModifier {
    CheckState(): Partial<Record<modifierstate, boolean>> {
        return { [modifierstate.MODIFIER_STATE_UNSELECTABLE]: true }
    }
}
