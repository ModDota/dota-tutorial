interface SkipToSectionEvent {
    section: SectionName;
}

interface SectionStartedEvent {
    section: SectionName;
}

interface MoveCameraEvent {
    cameraTargetX?: number;
    cameraTargetY?: number;
    cameraTargetZ?: number;
    unitTargetEntIndex?: EntityIndex;
    lerp: number;
}

interface CustomGameEventDeclarations {
    section_started: SectionStartedEvent;
    skip_to_section: SkipToSectionEvent;
    move_camera: MoveCameraEvent;
    ui_loaded: {};
    detect_camera_movement: {};
    camera_movement_detected: {};
}
