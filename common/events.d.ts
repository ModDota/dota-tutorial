interface SkipToSectionEvent {
    section: SectionName;
}

interface SectionStartedEvent {
    section: SectionName;
}

interface SetGoalsEvent {
    goals: Goal[];
}

interface MoveCameraEvent {
    cameraTargetX?: number;
    cameraTargetY?: number;
    cameraTargetZ?: number;
    unitTargetEntIndex?: EntityIndex;
    lerp: number;
}

interface DialogConfirmedEvent {
    PlayerID: PlayerID;
}

interface DialogReceivedEvent {
    DialogText: string;
    SendToAll: boolean;
    DialogEntIndex: EntityIndex;
    PlayerHeroEntIndex: EntityIndex;
    ShowAdvanceButton: number;
    DialogLine: number;
    ConfirmToken: string;
    DialogPlayerConfirm: boolean | number;
    DialogAdvanceTime: number;
}

interface DialogCompleteEvent {
    DialogEntIndex: EntityIndex | null;
    DialogLine: number;
    ShowNextLine: number;
    PlayerHeroEntIndex: EntityIndex;
}

interface DialogConfirmEvent {
    nPlayerID: PlayerID;
    ConfirmToken: string | null;
    DialogEntIndex: EntityIndex | null;
    DialogLine: number;
}

interface DialogConfirmExpireEvent {
    ConfirmToken: string | null;
    DialogEntIndex: EntityIndex | null;
    DialogLine: number;
}

interface CustomGameEventDeclarations {
    section_started: SectionStartedEvent;
    skip_to_section: SkipToSectionEvent;
    move_camera: MoveCameraEvent;
    dialog_confirm_expire: DialogConfirmExpireEvent;
    dialog_confirm: DialogConfirmEvent;
    dialog_complete: DialogCompleteEvent;
    dialog: any; // DialogReceivedEvent, but doesn't work because I don't understand typescript
    dialog_player_confirm: DialogConfirmedEvent;
    ui_loaded: {};
    detect_camera_movement: {};
    camera_movement_detected: {};
    set_goals: SetGoalsEvent;
}
