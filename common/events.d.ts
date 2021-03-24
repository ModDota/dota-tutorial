interface SkipToSectionEvent {
    section: SectionName;
}

interface SectionStartedEvent {
    section: SectionName;
}

interface SetGoalsEvent {
    goals: Goal[];
}

interface DialogReceivedEvent {
    DialogText: string;
    DialogEntIndex: EntityIndex;
    DialogAdvanceTime: number;
    Token: DialogToken;
}

interface DialogClearEvent {
    Token?: DialogToken;
}

interface DialogCompleteEvent {
    Token: DialogToken;
}

interface DetectModifierKeyEvent {
    key: ModifierKey;
}

interface ModifierKeyDetectedEvent {
    key: ModifierKey;
}

interface ClockTimeEvent {
    seconds: number;
    minutes?: number;
}

declare const enum HighlightMouseButton {
    Left,
    Right
}

interface HighlightElementEvent {
    path: string;
    duration?: number;
    mouseIcon?: HighlightMouseButton
}

interface RemoveHighlightEvent {
    path: string;
}

interface ChatWheelPhraseSelectedEvent {
    phraseIndex: number;
}

interface ShopOpenChangedEvent {
    open: boolean;
}

interface PlayVideoEvent {
    name: VideoName;
}

interface CreditsInteractEvent {
    name: string;
    description?: string;
}

type WorldTextType = "credit_section" | "npc_title"

type AddWorldTextEvent = {
    type: WorldTextType;
    index: number;
    text: string;
    location: { x: number, y: number, z: number };
    entity?: EntityIndex;
}

interface RemoveWorldTextEvent {
    index: number;
}

interface ShowPressKeyMessage {
    command: number; // DOTAKeybindCommand_t
    text: string // Should contain {key} to show the key
}

interface ShowChapter3SkipButtonEvent {
    show: boolean
}

interface CustomGameEventDeclarations {
    section_started: SectionStartedEvent;
    skip_to_section: SkipToSectionEvent;
    dialog_complete: DialogCompleteEvent;
    dialog: DialogReceivedEvent;
    dialog_clear: DialogClearEvent;
    ui_loaded: {};
    detect_camera_movement: {};
    camera_movement_detected: {};
    set_goals: SetGoalsEvent;
    detect_modifier_key: DetectModifierKeyEvent;
    modifier_key_detected: ModifierKeyDetectedEvent;
    set_client_clock: ClockTimeEvent;
    highlight_element: HighlightElementEvent;
    remove_highlight: RemoveHighlightEvent;
    chat_wheel_phrase_selected: ChatWheelPhraseSelectedEvent;
    shop_open_changed: ShopOpenChangedEvent;
    play_video: PlayVideoEvent;
    hide_video: {};
    play_video_continue: {};
    fade_screen: {};
    fade_screen_in: {};
    voice_chat: {};
    credits_interact: CreditsInteractEvent;
    credits_interact_stop: {};
    add_world_text: AddWorldTextEvent;
    remove_world_text: RemoveWorldTextEvent;
    show_press_key_message: ShowPressKeyMessage;
    hide_press_key_message: {};
    show_chapter3_skip_button: ShowChapter3SkipButtonEvent;
    skip_chapter3: {}
    devpanel_enable: {}
}
