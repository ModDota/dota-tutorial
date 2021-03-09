import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";

export interface GreevilConfig {
    material: 0 | 1 | 2 | 3 | 4 | 5 | 5 | 7 | 8;
    stance: "" | "level_1" | "level_2" | "level_3" | "black" | "white";

    ears: 1 | 2;
    horns: 1 | 2 | 3 | 4;
    hair: 1 | 2;
    nose: 1 | 2 | 3;
    tail: 1 | 2 | 3 | 4;
    teeth: 1 | 2 | 3 | 4;
    feathers: boolean;
}

@registerModifier()
export class modifier_greevil extends BaseModifier {

    private config: GreevilConfig = {
        material: RandomInt(0, 8)as GreevilConfig["material"],
        stance: "level_1",
        ears: RandomInt(1, 2) as GreevilConfig["ears"],
        horns: RandomInt(1, 4) as GreevilConfig["horns"],
        hair: RandomInt(1, 2) as GreevilConfig["hair"],
        nose: RandomInt(1, 3) as GreevilConfig["nose"],
        tail: RandomInt(1, 4) as GreevilConfig["tail"],
        teeth: RandomInt(1, 4)as GreevilConfig["teeth"],
        feathers: false
    };

    private particle: ParticleID | undefined;

    IsHidden() { return true; }
    IsPurgable() { return false; }
    RemoveOnDeath() { return false; }
    IsPermanent() { return true; }

    DeclareFunctions() {
        return [
            ModifierFunction.MODEL_CHANGE,
            ModifierFunction.MODEL_SCALE,
            ModifierFunction.TRANSLATE_ACTIVITY_MODIFIERS,
        ];
    }

    OnCreated(params: Partial<GreevilConfig>) {
        if (!IsServer()) return;

        // Assign fields from params to config
        Object.assign(this.config, params);

        const spawnParticle = ParticleManager.CreateParticle("particles/items_fx/item_sheepstick.vpcf", ParticleAttachment.ABSORIGIN_FOLLOW, this.GetParent());
        ParticleManager.ReleaseParticleIndex(spawnParticle);

        this.buildGreevil();
    }

    OnDestroy() {
        if (this.particle) {
            ParticleManager.DestroyParticle(this.particle, false);
        }
    }

    GetModifierModelChange() {
        return "models/courier/greevil/greevil.vmdl";
    }

    GetModifierModelScale() {
        return 80
    }

    GetActivityTranslationModifiers() {
        return this.config.stance;
    }

    buildGreevil() {
        Timers.CreateTimer(() => this.GetParent().SetMaterialGroup(this.config.material.toString()));

        const eyes = this.attachGreevilPart(`models/courier/greevil/greevil_eyes.vmdl`);
        const ears = this.attachGreevilPart(`models/courier/greevil/greevil_ears${this.config.ears}.vmdl`);
        const horns = this.attachGreevilPart(`models/courier/greevil/greevil_horns${this.config.horns}.vmdl`);
        const hair = this.attachGreevilPart(`models/courier/greevil/greevil_hair${this.config.hair}.vmdl`);
        const nose = this.attachGreevilPart(`models/courier/greevil/greevil_nose${this.config.nose}.vmdl`);
        const tail = this.attachGreevilPart(`models/courier/greevil/greevil_tail${this.config.tail}.vmdl`);
        const teeth = this.attachGreevilPart(`models/courier/greevil/greevil_teeth${this.config.teeth}.vmdl`);

        // Add feathers yes or no
        if (this.config.feathers === true) {
            const feathers = this.attachGreevilPart("models/courier/greevil/greevil_feathers.vmdl");
        }

        // Attach particle
        this.attachParticle();
    }

    attachGreevilPart(modelName: string) {
        const part = SpawnEntityFromTableSynchronous("prop_dynamic", { model: modelName }) as CBaseModelEntity;
        part.FollowEntity(this.GetParent(), true);
        part.SetMaterialGroup(this.config.material.toString());
    }

    
    attachParticle() {
        const particles = [
            "particles/econ/courier/courier_greevil_naked/courier_greevil_naked_ambient_1.vpcf",
            "particles/econ/courier/courier_greevil_red/courier_greevil_red_ambient_1.vpcf",
            "particles/econ/courier/courier_greevil_orange/courier_greevil_orange_ambient_1.vpcf",
            "particles/econ/courier/courier_greevil_yellow/courier_greevil_yellow_ambient_1.vpcf",
            "particles/econ/courier/courier_greevil_green/courier_greevil_green_ambient_1.vpcf",
            "particles/econ/courier/courier_greevil_blue/courier_greevil_blue_ambient_1.vpcf",
            "particles/econ/courier/courier_greevil_purple/courier_greevil_purple_ambient_1.vpcf",
            "particles/econ/courier/courier_greevil_naked/courier_greevil_naked_ambient_1.vpcf",
            "particles/econ/courier/courier_greevil_black/courier_greevil_black_ambient_1.vpcf",
        ];

        this.particle = ParticleManager.CreateParticle(particles[this.config.material], ParticleAttachment.ABSORIGIN_FOLLOW, this.GetParent());
    }
}
