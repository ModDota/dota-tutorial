declare const enum SectionName {
    Chapter1_Opening = "Chapter1_Opening",
    Chapter1_Movement = "Chapter1_Movement",
    Chapter1_CameraUnlock = "Chapter1_CameraUnlock",
    Chapter1_Leveling = "Chapter1_Leveling",
    Chapter1_Casting = "Chapter1_Casting",
    Chapter1_ShopUI = "Chapter1_ShopUI",
    Chapter2_Opening = "Chapter2_Opening",
    Chapter2_Creeps = "Chapter2_Creeps",
    Chapter2_Tower = "Chapter2_Tower",
    Chapter3_Opening = "Chapter3_Opening",
    Chapter4_Opening = "Chapter4_Opening",
    Chapter4_Wards = "Chapter4_Wards",
    Chapter4_Outpost = "Chapter4_Outpost",
    Chapter5_Opening = "Chapter5_Opening",
}

declare const enum CustomNpcKeys {
    SlacksMudGolem = "npc_mud_golem_slacks",
    SunsFanMudGolem = "npc_mud_golem_sunsfan",
    GodzMudGolem = "npc_mud_golem_godz",
    Mirana = "npc_dota_hero_mirana",
    DireRangedCreep = "npc_dota_tutorial_dire_ranged_creep",
    DireMeleeCreep = "npc_dota_tutorial_dire_melee_creep",
    RadiantRangedCreep = "npc_dota_tutorial_radiant_ranged_creep",
    RadiantMeleeCreep = "npc_dota_tutorial_radiant_melee_creep",
    Riki = "npc_dota_hero_riki",
    TargetDummy = "npc_dota_tutorial_target_dummy",
    PurgePugna = "npc_dota_hero_pugna",
    DireTopT1Tower = "npc_dota_badguys_tower1_top",
    Sniper = "npc_dota_hero_sniper"
}

declare const enum CustomEntityKeys {
    RadiantTopBountyFOWViewer = "radiant_top_bounty_fow_viewer",
    RadiantAncientsBountyFOWViewer = "radiant_ancients_bounty_fow_viewer",
    DireBotBountyFOWViewer = "dire_bot_bounty_fow_viewer",
    DireAncientsBountyFOWViewer = "dire_ancients_bounty_fow_viewer",
    RadiantTopBountyRune = "radiant_top_bounty_rune",
    RadiantAncientsBountyRune = "radiant_ancients_bounty_rune",
    DireBotBountyRune = "dire_bot_bounty_rune",
    DireAncientsBountyRune = "dire_ancients_bounty_rune",
    TopPowerRune = "top_power_rune"
}

declare const enum CustomAbilityKeys {
    CustomMiranaArrow = "custom_mirana_arrow",
}

type Goal = {
    text: string;
    completed: boolean;
};

declare const enum ModifierKey {
    Alt,
    Shift,
    Control,
}

declare const enum ParticleName {
    HighlightBuilding = "particles/dev/curlnoise_test.vpcf",
}
