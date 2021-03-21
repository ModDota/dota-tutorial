import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";
import { DirectionToPosition, Distance2D, getPlayerHero, isCustomLaneCreepUnit } from "../util";

@registerModifier()
export class modifier_sniper_deny_chapter2_creeps extends BaseModifier {
    IsHidden() { return true }
    IsPurgable() { return false }
    IsDebuff() { return false }

    sniperDenyingOwnCreeps: boolean = true;
    isSniperActive = false
    anchorPoint = Vector(-5700, 5555, 128)

    OnCreated() {
        if (!IsServer()) return;
        this.SetStackCount(0);
        this.StartIntervalThink(0.5)
        this.GetParent().SetIdleAcquire(false);
    }

    OnIntervalThink() {
        if (!this.isSniperActive) return;

        if (this.sniperDenyingOwnCreeps) {
            let alliedCreeps = FindUnitsInRadius(this.GetParent().GetTeamNumber(),
                this.GetParent().GetAbsOrigin(),
                undefined,
                1800,
                DOTA_UNIT_TARGET_TEAM.DOTA_UNIT_TARGET_TEAM_FRIENDLY,
                DOTA_UNIT_TARGET_TYPE.DOTA_UNIT_TARGET_BASIC,
                DOTA_UNIT_TARGET_FLAGS.DOTA_UNIT_TARGET_FLAG_NONE,
                FindOrder.FIND_CLOSEST,
                false)

            const denyableCreeps = alliedCreeps.filter(creep => creep.GetHealthPercent() <= 50);

            if (denyableCreeps.length > 0) {
                const closestCreep = denyableCreeps[0];

                const distance = Distance2D(closestCreep.GetAbsOrigin(), this.GetParent().GetAbsOrigin())
                if (distance > this.GetParent().Script_GetAttackRange()) {
                    ExecuteOrderFromTable({
                        OrderType: dotaunitorder_t.DOTA_UNIT_ORDER_MOVE_TO_TARGET,
                        UnitIndex: this.GetParent().entindex(),
                        TargetIndex: closestCreep.entindex(),
                    })
                } else {
                    ExecuteOrderFromTable({
                        OrderType: dotaunitorder_t.DOTA_UNIT_ORDER_ATTACK_TARGET,
                        UnitIndex: this.GetParent().entindex(),
                        TargetIndex: closestCreep.entindex(),
                    })
                }
            }
            else {
                if (alliedCreeps.length > 0) {
                    const closestCreep = alliedCreeps[0]

                    // Calculate the position Sniper should move behind enemy lines
                    const direction = DirectionToPosition(closestCreep.GetAbsOrigin(), this.anchorPoint)
                    const position = (closestCreep.GetAbsOrigin() + direction * 300) as Vector

                    if (Distance2D(this.GetParent().GetAbsOrigin(), position) > 100) {
                        ExecuteOrderFromTable({
                            OrderType: dotaunitorder_t.DOTA_UNIT_ORDER_MOVE_TO_POSITION,
                            UnitIndex: this.GetParent().entindex(),
                            Position: position
                        })
                    }
                } else {

                    if (Distance2D(this.GetParent().GetAbsOrigin(), this.anchorPoint) > 100) {
                        ExecuteOrderFromTable({
                            OrderType: dotaunitorder_t.DOTA_UNIT_ORDER_MOVE_TO_POSITION,
                            UnitIndex: this.GetParent().entindex(),
                            Position: this.anchorPoint
                        })
                    } else {
                        const playerHero = getPlayerHero()
                        if (playerHero) {
                            this.GetParent().FaceTowards(playerHero.GetAbsOrigin())
                        }
                    }
                }
            }
        } else {
            const attackTarget = this.GetParent().GetAttackTarget()
            const playerHero = getPlayerHero();
            if (playerHero && attackTarget != playerHero) {
                ExecuteOrderFromTable({
                    OrderType: dotaunitorder_t.DOTA_UNIT_ORDER_ATTACK_TARGET,
                    UnitIndex: this.GetParent().entindex(),
                    TargetIndex: playerHero.entindex()
                })
            }
        }
    }

    CheckState(): Partial<Record<modifierstate, boolean>> {
        return {
            [modifierstate.MODIFIER_STATE_INVULNERABLE]: this.sniperDenyingOwnCreeps,
            [modifierstate.MODIFIER_STATE_PROVIDES_VISION]: true,
            [modifierstate.MODIFIER_STATE_DISARMED]: !this.isSniperActive
        }
    }

    DeclareFunctions(): modifierfunction[] {
        return [
            modifierfunction.MODIFIER_PROPERTY_PREATTACK_BONUS_DAMAGE,
            modifierfunction.MODIFIER_PROPERTY_ATTACKSPEED_BONUS_CONSTANT,
            modifierfunction.MODIFIER_EVENT_ON_DEATH,
            modifierfunction.MODIFIER_PROPERTY_INCOMING_DAMAGE_PERCENTAGE
        ]
    }

    OnDeath(event: ModifierAttackEvent) {
        if (!IsServer()) return;

        if (event.attacker != this.GetParent()) return;

        if (event.unit) {
            if (!isCustomLaneCreepUnit(event.unit)) return;
            if (event.unit.GetTeamNumber() != this.GetParent().GetTeamNumber()) return;

            SendOverheadEventMessage(undefined, DOTA_OVERHEAD_ALERT.OVERHEAD_ALERT_DENY, event.unit, 0, undefined)
        }
    }

    GetModifierPreAttack_BonusDamage(): number {
        if (!IsServer()) return 0

        if (this.sniperDenyingOwnCreeps) return 100
        else return -600;
    }

    GetModifierAttackSpeedBonus_Constant(): number {
        if (this.sniperDenyingOwnCreeps) return 50;
        return 0;
    }

    GetModifierIncomingDamage_Percentage(event: ModifierAttackEvent): number
    {
        if (!IsServer()) return 0

        if (event.attacker === getPlayerHero()) return 0
        return -90
    }
}
