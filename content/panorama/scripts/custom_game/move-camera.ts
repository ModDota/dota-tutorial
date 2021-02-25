(function () {
    GameEvents.Subscribe("move_camera", (event) => {
        let cameraTarget: [number, number, number] = [0, 0, 0];
        if (event.unitTargetEntIndex) {
            cameraTarget = Entities.GetAbsOrigin(event.unitTargetEntIndex);
        } else if (event.cameraTargetX && event.cameraTargetY && event.cameraTargetZ) {
            cameraTarget[0] = event.cameraTargetX;
            cameraTarget[1] = event.cameraTargetY;
            cameraTarget[2] = event.cameraTargetZ;
        }
        GameUI.SetCameraTargetPosition(cameraTarget, event.lerp);
    });
})();
