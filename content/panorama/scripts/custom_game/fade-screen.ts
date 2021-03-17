const overlayDuration = 3; // Should match the css animation duration of FadeScreenAnimation

(() => {
    const container = $("#FadeScreenContainer");

    function fadeBlack() {
        const overlay = $.CreatePanel("Panel", container, "");
        overlay.AddClass("FadeScreenAnimation");
        $.Schedule(overlayDuration, () => {
            overlay.RemoveAndDeleteChildren()
        });
    }

    GameEvents.Subscribe("fade_screen", event => {
        fadeBlack();
    });
})();
