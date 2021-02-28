GameUI.CustomUIConfig().SectionSelector.RegisterSection(
    SectionName.Chapter1_CameraUnlock,
    {
        panel: $.GetContextPanel(),
        onShow: () => {
            $.Msg(`onShow ${SectionName.Chapter1_CameraUnlock}`);
        },
        onHide: () => {
            $.Msg(`onHide ${SectionName.Chapter1_CameraUnlock}`);
        }
    }
);

/**
 * Distance the camera needs to move from its original position to count as a detection.
 */
const cameraMovedDistanceThreshold = 500;

/**
 * Interval in which to check for camera movement.
 */
const cameraMovementCheckIntervalSeconds = 0.2;

/**
 * Initial camera location when the detection was requested.
 */
let initialCameraLocation: [number, number, number] = [0, 0, 0];

/**
 * Whether we should currently detect camera movement
 */
let shouldDetectCameraMovement = false;

function detectCameraMovement() {
    if (shouldDetectCameraMovement) {
        // Find distance squared between the initial and current camera position
        const newCameraLocation = GameUI.GetCameraLookAtPosition();

        const diff = [
            newCameraLocation[0] - initialCameraLocation[0],
            newCameraLocation[1] - initialCameraLocation[1],
            newCameraLocation[2] - initialCameraLocation[2]
        ];

        const distSq = diff[0] * diff[0] + diff[1] * diff[1] + diff[2] * diff[2];

        // If we moved by more than the threshold, stop detection and send the detected event to the server.
        if (distSq > cameraMovedDistanceThreshold * cameraMovedDistanceThreshold) {
            shouldDetectCameraMovement = false;
            GameEvents.SendCustomGameEventToServer("camera_movement_detected", {});
        } else {
            $.Schedule(cameraMovementCheckIntervalSeconds, detectCameraMovement);
        }
    }
}

GameEvents.Subscribe("detect_camera_movement", event => {
    // Start the loop that detects the camera movement.
    shouldDetectCameraMovement = true;
    initialCameraLocation = GameUI.GetCameraLookAtPosition();
    $.Schedule(cameraMovementCheckIntervalSeconds, detectCameraMovement);
});
