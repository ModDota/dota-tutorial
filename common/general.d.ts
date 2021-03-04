declare const enum SectionName {
    Chapter1_Opening = "Chapter1_Opening",
    Chapter1_Movement = "Chapter1_Movement",
    Chapter1_CameraUnlock = "Chapter1_CameraUnlock",
    Chapter1_Leveling = "Chapter1_Leveling",
    Chapter1_Casting = "Chapter1_Casting",
    Chapter1_ShopUI = "Chapter1_ShopUI",
    Chapter2_Opening = "Chapter2_Opening",
    Chapter3_Opening = "Chapter3_Opening",
    Chapter4_Opening = "Chapter4_Opening",
    Chapter4_Wards = "Chapter4_Wards",
    Chapter4_Outpost = "Chapter4_Outpost",
}

declare const enum CustomNpcKeys {
    SlacksMudGolem = "npc_mud_golem_slacks",
    SunsFanMudGolem = "npc_mud_golem_sunsfan",
    Mirana = "npc_dota_hero_mirana",
    DireRangedCreep = "npc_dota_tutorial_dire_ranged_creep",
    DireMeleeCreep = "npc_dota_tutorial_dire_melee_creep",
    RadiantRangedCreep = "npc_dota_tutorial_radiant_ranged_creep",
    RadiantMeleeCreep = "npc_dota_tutorial_radiant_melee_creep",
    Riki = "npc_dota_hero_riki",
    GodzMudGolem = "npc_mud_golem_godz",
    TargetDummy = "npc_dota_tutorial_target_dummy",
}

declare const enum CustomAbilityKeys {
    CustomMiranaArrow = "custom_mirana_arrow",
}

type Goal = {
    text: string;
    completed: boolean;
};

interface DialogData {
    text: string;
    advanceTime: number;
    sendToAll: boolean;
    advance: boolean;
    gesture: GameActivity;
    forceBreak?: boolean;
    skipFacePlayer?: boolean;
    dialogStopsMovement?: boolean;
    sound?: string;
}

interface UnitDialog {
    currentLine: number;
    lines: DialogData[];
}

declare const enum ModifierKey {
    Alt,
    Shift,
    Control,
}
