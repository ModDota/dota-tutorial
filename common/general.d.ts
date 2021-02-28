declare const enum SectionName {
    Chapter1_Opening = "Chapter1_Opening",
    Chapter1_CameraUnlock = "Chapter1_CameraUnlock",
    Chapter1_Leveling = "Chapter1_Leveling",
    Chapter1_Casting = "Chapter1_Casting",

    Chapter3_Opening = "Chapter3_Opening",
}

declare const enum CustomNpcKeys {
    SlacksMudGolem = "npc_mud_golem_slacks",
    SunsFanMudGolem = "npc_mud_golem_sunsfan",
    TargetDummy = "npc_target_dummy",
}

type Goal = {
    text: string
    completed: boolean
}
